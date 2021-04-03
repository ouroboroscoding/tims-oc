# coding=utf8
"""Crons entry

Handles running cron scripts
"""

__author__		= "Chris Nasr"
__copyright__	= "OuroborosCoding"
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "ouroboroscode@gmail.com"
__created__		= "2019-04-12"

# Python imports
import importlib
import os
import platform
import sys

# Pip imports
from RestOC import Conf, Record_Base, Record_ReDB, REST, Services

# If the version argument is missing
if len(sys.argv) < 2:
	print('Must specify the cron to run:\n\tpython -m crons natf')
	sys.exit(1)

# Load the config
Conf.load('../config.json')
sConfOverride = '../config.%s.json' % platform.node()
if os.path.isfile(sConfOverride):
	Conf.load_merge(sConfOverride)

# Add the global prepend and primary host to rethinkdb
Record_Base.dbPrepend(Conf.get(("rethinkdb", "prepend"), ''))
Record_ReDB.addHost('primary', Conf.get(("rethinkdb", "hosts", "primary")))

# Register all services
Services.register(
	{k:None for k in Conf.get(('rest', 'services'))},
	REST.Config(Conf.get("rest")),
	Conf.get(('services', 'salt'))
)

# Store the cron
sCron = sys.argv[1]

# Try to import the cron
try:
	oCron = importlib.import_module('crons.%s' % sCron)
except ImportError as e:
	print('The given cron "%s" is invalid.' % sCron)
	print(e)
	sys.exit(1)

# Run the cron with whatever additional arguments were passed
sys.exit(oCron.run(*(sys.argv[2:])))
