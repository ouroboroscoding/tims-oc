# coding=utf8
""" Install Services

Adds global tables
"""

# Python imports
import os, platform, time

# Framework imports
from RestOC import Conf, Record_MySQL

# Records
from records import install, Company, User

# Only run if called directly
if __name__ == "__main__":

	# Load the config
	Conf.load('config.json')
	sConfOverride = 'config.%s.json' % platform.node()
	if os.path.isfile(sConfOverride):
		Conf.load_merge(sConfOverride)

	# Add hosts
	Record_MySQL.add_host('primary', Conf.get(('mysql', 'hosts', 'primary')))

	# Add the DB
	Record_MySQL.db_create(Conf.get(('mysql', 'db'), 'tims-oc'), 'primary')

	# Install
	install()

	# Install admin user
	oUser = User({
		'email': 'admin@localhost',
		'passwd': User.password_hash('Admin123'),
		'name': 'Administrator',
		'type': 'admin',
		'locale': 'en-US',
		'verified': True
	})
	oUser.create()

	# Add the only company
	oCompany = Company({
		'name': 'Your Company',
		'address1': '123 Main Street',
		'city': 'Coolsville',
		'division': 'QC',
		'country': 'CA',
		'postal_code': 'H4G2R3',
		'taxes': '[]'
	})
	oCompany.create()