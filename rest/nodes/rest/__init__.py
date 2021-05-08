# coding=utf8
""" REST

Shared methods used by most REST scripts
"""

__author__		= "Chris Nasr"
__copyright__	= "OuroborosCoding"
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "chris@ouroboroscoding.com"
__created__		= "2021-04-02"

# Python imports
import os
import platform

# Pip imports
from RestOC import Conf, Record_Base, Record_MySQL, REST, \
					Services, Sesh, Templates

def init(dbs=[], services={}, templates=False):
	"""Initialise

	Starts up most of the modules needed to support REST and Services

	Arguments:
		dbs (str[]): List of DBs to start up
		services (dict): Dictionary of service name to instance being managed
			by the caller

	Returns:
		REST.Config
	"""

	# Load the config
	Conf.load('config.json')
	sConfOverride = 'config.%s.json' % platform.node()
	if os.path.isfile(sConfOverride):
		Conf.load_merge(sConfOverride)

	# Add the global prepend
	Record_Base.dbPrepend(Conf.get(("mysql", "prepend"), ''))

	# Go through the list of DBs requested
	for s in dbs:
		Record_MySQL.addHost(s, Conf.get(("mysql", "hosts", s)))

	# Init the Sesh module
	Sesh.init(Conf.get(("redis", "primary")))

	# Create the REST config instance
	oRestConf = REST.Config(Conf.get("rest"))

	# Set verbose mode if requested
	if 'VERBOSE' in os.environ and os.environ['VERBOSE'] == '1':
		Services.verbose()

	# Get all the services
	dServices = {k:None for k in Conf.get(('rest', 'services'))}

	# Overwrite those passed in
	for n,o in services.items():
		dServices[n] = o

	# Register all services
	Services.register(dServices, oRestConf, Conf.get(('services', 'salt')))

	# Init Templates
	if templates:
		Templates.init(templates)

	# Return the REST config
	return oRestConf
