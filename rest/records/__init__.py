# coding=utf8
""" Records

Handles the record structures
"""

__author__		= "Chris Nasr"
__copyright__	= "OuroborosCoding"
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "ourboroscode@gmail.com"
__created__		= "2021-04-02"

# Python imports
import copy
from hashlib import sha1
import re

# Pip imports
from FormatOC import Tree
from RestOC import Conf, JSON, Record_mySQL, StrHelper

# Blocked class
class Blocked(Record_mySQL.Record):
	"""Blocked

	Represents an employee that is blocked by an employer
	"""

	_conf = None
	"""Configuration"""

	@classmethod
	def config(cls):
		"""Config

		Returns the configuration data associated with the record type

		Returns:
			dict
		"""

		# If we haven loaded the config yet
		if not cls._conf:
			cls._conf = Record_mySQL.Record.generateConfig(
				Tree.fromFile('definitions/blocked.json')
			)

		# Return the config
		return cls._conf
