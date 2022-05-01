# coding=utf8
""" Create the new tasks table"""

# Record imports
from records import Task

def run():

	# Create the table
	Task.tableCreate()

	# Return OK
	return True