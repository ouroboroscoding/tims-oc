# coding=utf8
""" Owner REST

Handles owner tasks
"""

__author__		= "Chris Nasr"
__copyright__	= "OuroborosCoding"
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "ouroboroscode@gmail.com"
__created__		= "2021-04-02"

# Pip imports
from RestOC import Conf, REST

# Service imports
from services.owner import Owner

# Local imports
from . import init

# Init the REST info
oRestConf = init(
	dbs=['primary'],
	services={'owner':Owner()}
)

# Create the HTTP server and map requests to service
REST.Server({

	"/client": {"methods": REST.READ | REST.UPDATE, "session": True}
	"/clients": {"methods": REST.READ, "session": True}
	"/project": {"methods": REST.CREATE | REST.READ | REST.UPDATE, "session": True},
	"/projects": {"methods": REST.READ, "session": True}

}, 'owner', "https?://(.*\\.)?%s" % Conf.get(("rest","allowed")).replace('.', '\\.')).run(
	host=oRestConf['owner']['host'],
	port=oRestConf['owner']['port'],
	workers=oRestConf['owner']['workers'],
	timeout='timeout' in oRestConf['owner'] and oRestConf['owner']['timeout'] or 30
)
