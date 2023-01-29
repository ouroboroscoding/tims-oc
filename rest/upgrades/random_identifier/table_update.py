# coding=utf8
""" Update the invoice table to make identifiers random """

# Pip imports
from RestOC import Record_MySQL

# Record imports
from records import Invoice

def run():

	# Get the invoice structure
	dStruct = Invoice.struct()

	# Generate the SQL
	sSQL = "ALTER TABLE `%(db)s`.`%(table)s` " \
			"CHANGE COLUMN `identifier` `identifier` CHAR(6) NOT NULL" % {
		'db': dStruct['db'],
		'table': dStruct['table']
	}

	# Run the SQL to update the field type
	Record_MySQL.Commands.execute(dStruct['host'], sSQL)

	# Return OK
	return True