# coding=utf8
""" Add the payment table to the DB """

# Record imports
from records import Payment

def run():

	# Create the Payment table
	Payment.tableCreate()

	# Return OK
	return True