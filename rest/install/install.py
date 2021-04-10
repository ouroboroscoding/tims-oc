# coding=utf8
""" Install Services

Adds global tables
"""

# Python imports
import os, platform, time

# Framework imports
from RestOC import Conf, Record_MySQL

# Records
from records import Company, Permission, User

# Services
from services.primary import Primary

# Only run if called directly
if __name__ == "__main__":

	# Load the config
	Conf.load('config.json')
	sConfOverride = 'config.%s.json' % platform.node()
	if os.path.isfile(sConfOverride):
		Conf.load_merge(sConfOverride)

	# Add hosts
	Record_MySQL.addHost('primary', Conf.get(("mysql", "hosts", "primary")))

	# Add the DB
	Record_MySQL.dbCreate(Conf.get(("mysql", "primary", "db"), "tims-ouroboros"), 'primary')

	# Install
	Primary.install()

	# Install admin user
	oUser = User({
		"email": 'admin@localhost',
		"passwd": User.passwordHash('Admin123'),
		"name": "Administrator",
		"locale": 'en-US',
		"verified": True
	})
	oUser.create()

	# Add global permissions
	for sName in ['client', 'company', 'invoice', 'project', 'task', 'user']:
		oPermission = Permission({
			"user": oUser['_id'],
			"name": sName,
			"rights": 15
		})
		oPermission.create()

	# Add the only company
	oCompany = Company({
		"name": "Your Company",
		"address1": "123 Main Street",
		"city": "Coolsville",
		"division": "QC",
		"country": "CA",
		"postal_code": "H4G2R3"
	})
	oCompany.create()