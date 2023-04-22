# coding=utf8
""" Alter the work table to add the tasks """

# Record imports
from records import InvoiceAdditional

def run():

	# Create the table
	InvoiceAdditional.table_create()

	# Return OK
	return True