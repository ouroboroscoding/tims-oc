# coding=utf8
""" Alter the client table to add the taxe flag """

# Pip imports
from RestOC import Record_MySQL

# Record imports
from records import Client

def run():

	# Get the client structure
	dStruct = Client.struct()

	# Alter the table to add the task field
	Record_MySQL.Commands.execute(
		dStruct['host'],
		"ALTER TABLE `%s`.`%s`\n" \
		"ADD COLUMN `taxes` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1" % (
			dStruct['db'],
			dStruct['table']
		)
	)

	return True