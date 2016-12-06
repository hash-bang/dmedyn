DMEDyn
======
DNS Made Easy - Dynamic DNS updater.

This simple script updates your [DNSMadeEasy](http://dnsmadeeasy.com) account with your current IP address.


Basic operation
---------------

1. Check the current outward facing IP address by calling [ipify.org](https://www.ipify.org) (this can be changed in settings)
2. If the IP has changed...
3. Update each domain A record with the new IP
4. If we are in `--daemon` mode, goto 1.


Installation and usage
----------------------
Use NPM to download the script:

	sudo npm install -g dmedyn

Create a `~/.dmedyn.json` file containing your site configuration such as the below example:

	{
		"username": "yourUsername",
		"password": "yourPassword",
		"domains": {
			"domain1.com": 11111111,
			"subdomain.somewhere.com": 22222222
		}
	}

The username is your DME username. The password is created when using the "Dynamic DNS" option of your DNS record in the DME admin screen. You'll also find a "Dynamic DNS ID" in the DME admin screen which will need to be used in place of the 11111111, 22222222, etc values.

Running DMEDyn
==============

Running in the foreground
-------------------------
Run `dmedyn` to update your IP just once:

	dmedyn


Running as a Daemon with Forever
--------------------------------
To use `dmedyn` within a process container like [forever](https://github.com/foreverjs/forever), run dmedyn in `--daemon` mode:

	forever start `which dmedyn` -vd

The `which dmedync` bit is because forever needs to know the path of the actual JS file to monitor it.


Running as a Daemon with PM2
----------------------------
To use `dmedyn` within a process container like [pm2](http://pm2.keymetrics.io), run dmedyn in `--daemon` mode:

	pm2 start `which dmedyn` --name dmedyn -- -vd

The `which dmedync` bit is because PM2 needs to know the path of the actual JS file to monitor it.
