# coding=utf8
""" Install Services

Adds global tables
"""

# Python imports
import os, platform, time

# Framework imports
from RestOC import Conf, Record_MySQL

# Services
from records import Client, Key, Permission, Project, Task, User

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
	Client.tableCreate()
	Key.tableCreate()
	Permission.tableCreate()
	Project.tableCreate()
	Task.tableCreate()
	User.tableCreate()

	# Install admin
	oUser = User({
		"email": "ouroboroscode@gmail.com",
		"passwd": User.passwordHash('Admin123'),
		"locale": "en-CA",
		"verified": True
	})
	oUser.create()