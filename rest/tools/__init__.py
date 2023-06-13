# coding=utf8
""" Tools

Shared methods used by most Tools scripts
"""

__author__		= "Chris Nasr"
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "chris@ouroboroscoding.com"
__created__		= "2023-04-24"

# Python imports
import os
import platform

# Pip imports
from RestOC import Conf, Record_MySQL

def init(dbs=[]):
	"""Initialise

	Starts up most of the modules needed to support tools

	Arguments:
		dbs (str[]): List of DBs to start up

	Returns:
		None
	"""

	# Load the config
	Conf.load('config.json')
	sConfOverride = 'config.%s.json' % platform.node()
	if os.path.isfile(sConfOverride):
		Conf.load_merge(sConfOverride)

	# Go through the list of DBs requested
	for s in dbs:
		Record_MySQL.add_host(s, Conf.get(('mysql', 'hosts', s)))

	# Set the timestamp timezone
	Record_MySQL.timestamp_timezone(
		Conf.get(('mysql', 'timestamp_timezone'), '+00:00')
	)