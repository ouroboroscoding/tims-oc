# coding=utf8
""" Primary REST

Handles primary tasks
"""

__author__		= "Chris Nasr"
__copyright__	= "Ouroboros Coding Inc."
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "chris@ouroboroscoding.com"
__created__		= "2021-04-02"

# Pip imports
from body import errors
from RestOC import Conf, REST

# Service imports
from services.primary import Primary

# Local imports
from . import init

# Only run if called directly
if __name__ == '__main__':

	# Init the REST info
	oRestConf = init(
		dbs=['primary'],
		services={'primary':Primary()},
		templates='templates'
	)

	# Create the HTTP server and map requests to service
	REST.Server({

		# Clients
		'/client': {'methods': REST.ALL},
		'/client/owes': {'methods': REST.READ},
		'/client/works': {'methods': REST.READ},
		'/clients': {'methods': REST.READ},

		# Companies
		'/company': {'methods': REST.READ | REST.UPDATE},

		# Invoices
		'/invoice': {'methods': REST.CREATE | REST.READ},
		'/invoice/pdf': {'methods': REST.READ},
		'/invoice/preview': {'methods': REST.READ},
		'/invoices': {'methods': REST.READ},

		# Payments
		'/payment': {'methods': REST.CREATE},
		'/payments': {'methods': REST.READ},

		# Projects
		'/project': {'methods': REST.ALL},
		'/projects': {'methods': REST.READ},

		# Tasks
		'/task': {'methods': REST.ALL},
		'/tasks': {'methods': REST.READ},

		# Users
		'/user': {'methods': REST.ALL},
		'/user/passwd': {'methods': REST.UPDATE},
		'/user/access': {'methods': REST.CREATE | REST.DELETE | REST.READ},
		'/users': {'methods': REST.READ},

		# Work
		'/work/start': {'methods': REST.CREATE},
		'/work/end': {'methods': REST.UPDATE},
		'/work': {'methods': REST.UPDATE | REST.DELETE},
		'/works': {'methods': REST.READ},

		# Session
		'/signin': {'methods': REST.POST},
		'/signout': {'methods': REST.POST},

		# User Access
		'/account/clients': {'methods': REST.READ},
		'/account/forgot': {'methods': REST.CREATE | REST.UPDATE},
		'/account/setup': {'methods': REST.READ | REST.UPDATE},
		'/account/verify': {'methods': REST.UPDATE},
		'/account/work': {'methods': REST.READ},
		'/account/works': {'methods': REST.READ}

		},
		'primary',
		'https?://(.*\\.)?%s' % Conf.get(('rest', 'allowed')).replace('.', '\\.'),
		error_callback=errors.service_error
	).run(
		host=oRestConf['primary']['host'],
		port=oRestConf['primary']['port'],
		workers=oRestConf['primary']['workers'],
		timeout='timeout' in oRestConf['primary'] and \
			oRestConf['primary']['timeout'] or \
			30
	)