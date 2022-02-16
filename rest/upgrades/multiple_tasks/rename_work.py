# coding=utf8
""" Rename the current task table to be called work"""

# Pip imports
from RestOC import Record_MySQL

def run():

	# Rename the current `tasks` table to be called `work` as it will now be
	#	used to mark hours on specific tasks, a new table to be created
	Record_MySQL.Commands.execute(
		'primary',
		"ALTER TABLE `tims-ouroboros`.`task` " \
		"RENAME TO  `tims-ouroboros`.`work`"
	)

	# Return OK
	return True