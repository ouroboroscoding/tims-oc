# coding=utf8
""" Alter the work table to add the tasks """

# Pip imports
from RestOC import Record_MySQL

# Record imports
from records import Task, Work

def run():

	# List of tasks already created
	dTasks = {}

	# Get the work structure
	dStruct = Work.struct()

	# Fetch all existing work
	lRecords = Record_MySQL.Commands.select(
		dStruct['host'],
		"SELECT * FROM `%s`.`%s`" % (
			dStruct['db'],
			dStruct['table']
		)
	)

	# Alter the table to add the task field
	Record_MySQL.Commands.execute(
		dStruct['host'],
		"ALTER TABLE `%s`.`%s` " \
		"ADD COLUMN `task` CHAR(36) NOT NULL AFTER `project`" % (
			dStruct['db'],
			dStruct['table']
		)
	)

	# Go through each record
	for d in lRecords:

		# Check for an existing task
		if d['project'] not in dTasks or \
			d['description'] not in dTasks[d['project']]:

			# Create a new task based on the description and product
			oTask = Task({
				"project": d['project'],
				"name": d['description']
			})
			oTask.create()

			# Store the ID
			try: dTasks[d['project']][d['description']] = oTask['_id']
			except KeyError: dTasks[d['project']] = {d['description']: oTask['_id']}

		# Update the record with the correct task
		Record_MySQL.Commands.execute(
			dStruct['host'],
			"UPDATE `%s`.`%s` SET `task` = '%s' WHERE `_id` = '%s'" % (
				dStruct['db'],
				dStruct['table'],
				dTasks[d['project']][d['description']],
				d['_id']
			)
		)

	# Return OK
	return True