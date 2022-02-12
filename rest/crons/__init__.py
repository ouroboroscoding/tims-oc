# coding=utf8
""" Crons code

Available classes/functions for running crons
"""

__author__		= "Chris Nasr"
__copyright__	= "OuroborosCoding"
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "chris@ouroboroscoding.com"
__created__		= "2019-04-12"

# Python imports
import atexit
import os
import sys

# Keep a list of running pidfiles
_lPidFiles = []

def _cleanupPidfiles():
	"""Cleanup Pidfiles

	Called when the interpreter closes

	Returns:
		None
	"""

	# Go through each pidfile and delete it
	for s in _lPidFiles:
		os.unlink(s)

# Register at exit function
atexit.register(_cleanupPidfiles)

def isRunning(name):
	"""Is Running

	Checks if the cron job is already running, if not, creates pidfile so
	future calls return true

	Arguments:
		name {str} -- The name of the cron job to check

	Returns:
		bool
	"""

	# Import pidfile list
	global _lPidFiles

	# Generate the nameof the files
	sFile = '/tmp/%s.pid' % name

	# If the file already exists
	if os.path.isfile(sFile):

		# Pull out the PID
		oF = open(sFile, 'r')
		iPID = int(oF.read())

		# Check if the process is still running
		try:
			os.kill(iPID, 0)
			return True

		# If it fails, the process doesn't exist
		except OSError:
			os.unlink(sFile)

	# Create the file, write to, and close the file
	oFile = open(sFile, 'w')
	oFile.write(str(os.getpid()))
	oFile.close()

	# Add the file to the pidfiles
	_lPidFiles.append(sFile)

	# Return was not running
	return False
