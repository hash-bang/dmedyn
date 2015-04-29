DMEDyn
======
DNS Made Easy - Dynamic DNS updater.

This simple script updates your [DNSMadeEasy](http://dnsmadeeasy.com) account with your current IP address.


Basic operation
---------------

1. Check the current outward facing IP address by paging http://what-is-my-ip.net (this can be changed)
2. If the IP has changed...
3. Update each domain A record with the new IP
4. If we are in `--forever` mode, goto 1.


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

Run `dmedyn` to update your IP just once:

	dmedyn

OR run `dmedyn` within a container like [forever](https://github.com/foreverjs/forever) to constantly run dmedyn in `--forever` mode:

	forever start dmedyn -vf
