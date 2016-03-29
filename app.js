#!/usr/bin/env node

var _ = require('lodash');
var async = require('async-chainable');
var colors = require('colors');
var fs = require('fs');
var mustache = require('mustache');
var program = require('commander');
var request = require('superagent');

program
	.version(require('./package.json').version)
	.usage('[options]')
	.option('-d, --daemon', 'Constantly try to update the IP')
	.option('-n, --dryrun', 'Dont actually run any commands, just output what would have run')
	.option('-v, --verbose', 'Be verbose')
	.parse(process.argv);

// Settings {{{
// Defaults {{{
var settings = {
	ip: null, // Use this IP instead of trying to figure it out
	timeout: 30 * 1000,
	username: null,
	password: null,
	domains: {
		// Domain: <a record id>
		// You can find the record ID by clicking on the link in the DME admin screen
		// e.g. 'yourdomain.com': 12345
	},
	updateURL: 'https://cp.dnsmadeeasy.com/servlet/updateip?username={{settings.username}}&password={{settings.password}}&id={{domain.id}}&ip={{domain.newIP}}',
	delay: 2 * 60 * 1000, // 2 Minutes - delay by this period before rechecking the IP

	// The ip resolution service to use
	// Each service must return basic text (JSON prefered). The first thing that looks like an IP address enclosed in speach marks (e.g. "123.123.123.123")
	// Alternates:
	// 	'http://what-is-my-ip.net/?json', // Seems down at the moment
	ipURL: 'https://api.ipify.org?format=json',
};
// }}}
// Pre-load sanity checks {{{
if (!process.env || !process.env.HOME) {
	console.log('Environment variable HOME not found');
}
// }}}
// Load settings {{{
var settingsPath = process.env.HOME + '/.dmedyn.json';
try {
	var data = fs.readFileSync(settingsPath);
	var jSettings = JSON.parse(data);
	_.assign(settings, jSettings);
} catch (e) {
	console.log('No', colors.cyan(settingsPath), 'settings file found or the file is invalid JSON');
	process.exit(1);
}
// }}}
// Init settings {{{
if (settings.acceptAllCerts) {
	// If enabled we need to force TLS to accept even invalid certs
	// FIXME: There is no sensible way to do this with Superagent yet as per https://github.com/visionmedia/superagent/issues/188
	// So the only way we can do this is overriding the TLS env variable
	// @date 2015-02-10
	// @author Matt Carter <m@ttcarter.com>
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
}
// }}}
// }}}

var runCount = 0; // What loop number we are in (if we are in `--daemon` mode)
var oldIP = null; // The old IP address (if we are in `--daemon` mode)

var cycle = function() {
	async()
		.set('time', (new Date).toJSON())
		.then(function(next) {
			// Sanity checks {{{
				if (!settings.domains || !Object.keys(settings.domains).length) return next('No domains specified');
				if (!settings.username) return next('No username specified');
				if (!settings.password) return next('No password specified');
				if (!settings.updateURL) return next('No update URL specified');
				next();
			// }}}
		})
		.then(function(next) { // Delay before next cycle if in daemon mode
			if (runCount++ > 0) {
				if (program.verbose) console.log(colors.grey(this.time), 'Waiting', colors.cyan(settings.delay + 's'));
				setTimeout(next, settings.delay);
			} else {
				next();
			}
		})
		.then('ip', function(next) {
			if (settings.ip) return next(null, settings.ip);
			console.log(colors.grey(this.time), 'Determining IP...');

			request
				.get(settings.ipURL)
				.timeout(settings.timeout)
				.set('X-Requested-With', 'XMLHttpRequest')
				.set('Cache-Control', 'no-cache,no-store,must-revalidate,max-age=-1')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json, text/javascript, */*; q=0.01')
				.end(function(err, res) {
					if (err) return next(err);
					if (res.statusCode != 200) return next("Failed to get current IP address, return code: " + res.statusCode + ' - ' + res.text);
					if (res.body.err) return next(res.body.err);
					var foundIP = /"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"/.exec(res.text);
					if (foundIP) {
						next(null, foundIP[1]);
					} else {
						next('IP format is invalid - ' + res.text);
					}
				});
		})
		.then(function(next) {
			if (oldIP && this.ip == oldIP) return next('ip-unchanged');
			if (program.verbose) console.log(colors.grey(this.time), 'Updating IP to', colors.cyan(this.ip));
			oldIP = this.ip;
			next();
		})
		.forEach(settings.domains, function(next, id, domain) {
			var self = this;

			if (program.dryrun) {
				console.log(colors.grey(this.time), 'Would update domain', colors.cyan(domain), '=>', colors.cyan(self.ip));
				return next();
			}

			console.log(colors.grey(this.time), 'Updating domain', colors.cyan(domain), 'to IP', colors.cyan(this.ip));
			var url = mustache.render(settings.updateURL, {
				settings: settings,
				domain: {
					id: id,
					url: domain,
					newIP: this.ip,
				},
			});

			request
				.get(url)
				.timeout(settings.timeout)
				.end(function(err, res) {
					if (err) return next(err);
					if (res.statusCode != 200) return next('Failed to set Dyn DNS of ' + domain + ' (ID #' + id + '), return code: ' + res.statusCode + ' - ' + res.text);
					if (res.body.err) return next(res.body.err);
					console.log(colors.grey(self.time), 'Domain', colors.cyan(domain), '=>', colors.cyan(self.ip), colors.green('Success'));
					next();
				});
		})
		.end(function(err) {
			if (err && err == 'ip-unchanged') { // Deal with minor errors
				if (program.verbose) console.log(colors.grey(this.time), 'IP has not changed');
			} else if (err) { // Deal with major errors
				console.log(colors.grey(this.time), colors.red('ERROR'), err);
			} else {
				console.log(colors.grey(this.time), 'All done');
			}

			if (program.daemon) {
				setTimeout(cycle);
			} else {
				process.exit(err ? 1 : 0);
			}
		});
};
cycle();
