# coding=utf8
""" Primary REST

Handles primary tasks
"""

__author__		= "Chris Nasr"
__copyright__	= "OuroborosCoding"
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "chris@ouroboroscoding.com"
__created__		= "2021-04-02"

# Pip imports
from RestOC import Conf, REST, SMTP

# Service imports
from services.primary import Primary

# Local imports
from . import init

# Init the REST info
oRestConf = init(
	dbs=['primary'],
	services={'primary':Primary()},
	templates='templates'
)

# Init the SMTP module
SMTP.init(**Conf.get(('email', 'smtp')))

# Create the HTTP server and map requests to service
REST.Server({

	# Clients
	"/client": {"methods": REST.ALL, "session": True},
	"/clients": {"methods": REST.READ, "session": True},

	# Companies
	"/company": {"methods": REST.READ | REST.UPDATE, "session": True},

	# Invoices
	"/invoice": {"methods": REST.CREATE | REST.READ, "session": True},
	"/invoices": {"methods": REST.READ, "session": True},

	# Projects
	"/project": {"methods": REST.ALL, "session": True},
	"/projects": {"methods": REST.READ, "session": True},

	# Tasks
	"/task/start": {"methods": REST.CREATE, "session": True},
	"/task/end": {"methods": REST.UPDATE, "session": True},
	"/task": {"methods": REST.UPDATE | REST.DELETE, "session": True},
	"/tasks": {"methods": REST.READ, "session": True},

	# Users
	"/user": {"methods": REST.ALL, "session": True},
	"/users": {"methods": REST.READ, "session": True},

	# Session
	"/session": {"methods": REST.READ, "session": True},
	"/signin": {"methods": REST.POST},
	"/signout": {"methods": REST.POST, "session": True},

	# User Access
	"/account/forgot": {"methods": REST.CREATE | REST.UPDATE},
	"/account/setup": {"methods": REST.UPDATE},
	"/account/tasks": {"methods": REST.READ, "session": True},
	"/account/user": {"methods": REST.UPDATE, "session": True},
	"/account/verify": {"methods": REST.UPDATE}

}, 'primary', "https?://(.*\\.)?%s" % Conf.get(("rest","allowed")).replace('.', '\\.')).run(
	host=oRestConf['primary']['host'],
	port=oRestConf['primary']['port'],
	workers=oRestConf['primary']['workers'],
	timeout='timeout' in oRestConf['primary'] and oRestConf['primary']['timeout'] or 30
)
