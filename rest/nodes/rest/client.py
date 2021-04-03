# coding=utf8
""" Client REST

Handles client tasks
"""

__author__		= "Chris Nasr"
__copyright__	= "OuroborosCoding"
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "ouroboroscode@gmail.com"
__created__		= "2021-04-02"

# Pip imports
from RestOC import Conf, REST, SMTP

# Service imports
from services.client import Client

# Local imports
from . import init

# Init the REST info
oRestConf = init(
	dbs=['primary'],
	services={'client':Client()},
	templates='templates'
)

# Init the SMTP module
SMTP.init(**Conf.get(('email', 'smtp')))

# Create the HTTP server and map requests to service
REST.Server({

	# User
	"/session": {"methods": REST.READ, "session": True},
	"/signin": {"methods": REST.POST},
	"/signout": {"methods": REST.POST, "session": True},
	"/verify": {"methods": REST.PUT}

}, 'client', "https?://(.*\\.)?%s" % Conf.get(("rest","allowed")).replace('.', '\\.')).run(
	host=oRestConf['client']['host'],
	port=oRestConf['client']['port'],
	workers=oRestConf['client']['workers'],
	timeout='timeout' in oRestConf['main'] and oRestConf['main']['timeout'] or 30
)
