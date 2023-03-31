# coding=utf8
""" Update the client table to make address optional """

# Pip imports
from RestOC import Record_MySQL

# Record imports
from records import Client

def run():

	# Get the invoice structure
	dStruct = Client.struct()

	# Generate the SQL
	sSQL = "ALTER TABLE `%(db)s`.`%(table)s` " \
			"CHANGE COLUMN `address1` `address1` VARCHAR(127) COLLATE 'utf8mb3_bin' NULL DEFAULT NULL, " \
			"CHANGE COLUMN `postal_code` `postal_code` VARCHAR(10) COLLATE 'utf8mb3_bin' NULL DEFAULT NULL " % {
		'db': dStruct['db'],
		'table': dStruct['table']
	}

	# Run the SQL to update the field type
	Record_MySQL.Commands.execute(dStruct['host'], sSQL)

	# Return OK
	return True