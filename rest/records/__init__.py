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
from RestOC import Conf, JSON, Record_MySQL, StrHelper

# Client class
class Client(Record_MySQL.Record):
	"""Client

	Represents a client (company) that can be billed
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
			cls._conf = Record_MySQL.Record.generateConfig(
				Tree.fromFile('definitions/client.json')
			)

		# Return the config
		return cls._conf

# Company class
class Company(Record_MySQL.Record):
	"""Company

	Represents a client (company) that can be billed
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
			cls._conf = Record_MySQL.Record.generateConfig(
				Tree.fromFile('definitions/company.json')
			)

		# Return the config
		return cls._conf

# Invoice class
class Invoice(Record_MySQL.Record):
	"""Invoice

	Represents a client invoice
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
			cls._conf = Record_MySQL.Record.generateConfig(
				Tree.fromFile('definitions/invoice.json')
			)

		# Return the config
		return cls._conf

# InvoiceItem class
class InvoiceItem(Record_MySQL.Record):
	"""InvoiceItem

	Represents a client invoice
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
			cls._conf = Record_MySQL.Record.generateConfig(
				Tree.fromFile('definitions/invoice_item.json')
			)

		# Return the config
		return cls._conf


# Key class
class Key(Record_MySQL.Record):
	"""Key

	Represents a key for email verification, forgotten password, etc.
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
			cls._conf = Record_MySQL.Record.generateConfig(
				Tree.fromFile('definitions/key.json')
			)

		# Return the config
		return cls._conf

# Permission class
class Permission(Record_MySQL.Record):
	"""Permission

	Represents a single permission associated with a user
	"""

	_conf = None
	"""Configuration"""

	@classmethod
	def byUser(cls, _id):
		"""By User

		Fetches the permissions as a name => rights/idents dict by user._id

		Arguments:
			_id (str): The ID of the User

		Returns:
			dict
		"""

		# Fetch a single key
		sPermission = cls._redis.get('perms:%s' % _id)

		# If we have a record
		if sPermission:

			# Decode it
			dPermissions = JSON.decode(sPermission);

		# Else
		else:

			# Fetch from the DB
			lPermissions = cls.filter({"user": _id}, raw=['name', 'rights', 'idents'])
			if lPermissions:
				dPermissions = {
					d['name']: {
						"rights": d['rights'],
						"idents": d['idents'] is not None and d['idents'].split(',') or None
					}
					for d in lPermissions
				}
			else:
				dPermissions = {}

			# And cache
			cls._redis.set('perms:%s' % _id, JSON.encode(dPermissions))

		# Return the permissions
		return dPermissions

	@classmethod
	def cacheClear(cls, _id):
		"""Cache Clear

		Removes permissions for a user from the cache

		Arguments:
			_id (str): The ID of the user whose permissions we want to clear

		Returns:
			None
		"""

		# Delete the key in Redis
		cls._redis.delete('perms:%s' % _id)

	@classmethod
	def config(cls):
		"""Config

		Returns the configuration data associated with the record type

		Returns:
			dict
		"""

		# If we haven loaded the config yet
		if not cls._conf:
			cls._conf = Record_MySQL.Record.generateConfig(
				Tree.fromFile('definitions/permission.json')
			)

		# Return the config
		return cls._conf

	@classmethod
	def redis(cls, redis):
		"""Redis

		Stores the Redis connection to be used to fetch and store Users

		Arguments:
			redis (StrictRedis): A Redis instance

		Returns:
			None
		"""
		cls._redis = redis

# Project class
class Project(Record_MySQL.Record):
	"""Project

	Represents a single project in a specific company
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
			cls._conf = Record_MySQL.Record.generateConfig(
				Tree.fromFile('definitions/project.json')
			)

		# Return the config
		return cls._conf

# Task class
class Task(Record_MySQL.Record):
	"""Task

	Represents a single timed task
	"""

	_conf = None
	"""Configuration"""

	@classmethod
	def byClient(client, start, end, custom={}):
		"""By Client

		Returns all tasks in a timeframe that are assigned to projects with
		a specific client

		Arguments:
			client (str): The ID of the client
			start (uint): The minimum time the task can end in
			end (uint): The maximum time the task can end in
			custom (dict): Custom Host and DB info
				'host' the name of the host to get/set data on
				'append' optional postfix for dynamic DBs

		Returns:
			list
		"""

		# Fetch the record structure
		dStruct = cls.struct(custom)

		# Generate SQL
		sSQL = "SELECT\n" \
				"	`t`.`project` as `project`,\n" \
				"	`p`.`name` as `projectName,\n" \
				"	`t`.`user` as `user`,\n" \
				"	`u`.`name` as `userName`,\n" \
				"	`t`.`start` as `start`,\n" \
				"	`t`.`end` as `end`,\n" \
				"	`t`.`description` as `description`\n" \
				"FROM `%(db)s`.`%(table)s` as `t`,\n" \
				"JOIN `%(db)s`.`project` as `p` ON `t`.`project` = `p`.`_id`\n" \
				"JOIN `%(db)s`.`user` as `u` ON `t`.`user` = `u`.`_id`\n" \
				"WHERE `t`.`end` BETWEEN FROM_UNIXTIME(%(start)d) AND FROM_UNIXTIME(%(end)d)\n" \
				"AND `p`.`client` = '%(client)s'" % {
			"db": dStruct['db'],
			"table": dStruct['table'],
			"client": client,
			"start": start,
			"end": end
		}

		# Execute and return the select
		return Record_MySQL.Commands.select(
			dStruct['host'],
			sSQL,
			Record_MySQL.ESelect.ALL
		)

	@classmethod
	def byUser(user, start, end, custom={}):
		"""By User

		Returns all tasks in a timeframe that are assigned to a specific user

		Arguments:
			user (str): The ID of the user
			start (uint): The minimum time the task can end in
			end (uint): The maximum time the task can end in
			custom (dict): Custom Host and DB info
				'host' the name of the host to get/set data on
				'append' optional postfix for dynamic DBs

		Returns:
			list
		"""

		# Fetch the record structure
		dStruct = cls.struct(custom)

		# Generate SQL
		sSQL = "SELECT\n" \
				"	`p`.`client` as `client`,\n" \
				"	`c`.`name` as `clientName`,\n" \
				"	`t`.`project` as `project`,\n" \
				"	`p`.`name` as `projectName,\n" \
				"	`t`.`start` as `start`,\n" \
				"	`t`.`end` as `end`,\n" \
				"	`t`.`description` as `description`\n" \
				"FROM `%(db)s`.`%(table)s` as `t`,\n" \
				"JOIN `%(db)s`.`project` as `p` ON `t`.`project` = `p`.`_id`\n" \
				"JOIN `%(db)s`.`client` as `c` ON `p`.`client` = `c`.`_id`\n" \
				"WHERE `t`.`user` = '%(user)s'\n" \
				"AND `t`.`end` BETWEEN FROM_UNIXTIME(%(start)d) AND FROM_UNIXTIME(%(end)d)" % {
			"db": dStruct['db'],
			"table": dStruct['table'],
			"user": user,
			"start": start,
			"end": end
		}

		# Execute and return the select
		return Record_MySQL.Commands.select(
			dStruct['host'],
			sSQL,
			Record_MySQL.ESelect.ALL
		)

	@classmethod
	def config(cls):
		"""Config

		Returns the configuration data associated with the record type

		Returns:
			dict
		"""

		# If we haven loaded the config yet
		if not cls._conf:
			cls._conf = Record_MySQL.Record.generateConfig(
				Tree.fromFile('definitions/task.json')
			)

		# Return the config
		return cls._conf

# User class
class User(Record_MySQL.Record):
	"""User

	Represents a person who can login to the system
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
			cls._conf = Record_MySQL.Record.generateConfig(
				Tree.fromFile('definitions/user.json')
			)

		# Return the config
		return cls._conf

	@staticmethod
	def passwordHash(passwd):
		"""Password Hash

		Returns a hashed password with a unique salt

		Arguments:
			passwd (str): The password to hash

		Returns:
			str
		"""

		# Generate the salt
		sSalt = StrHelper.random(32, '_0x')

		# Generate the hash
		sHash = sha1(sSalt.encode('utf-8') + passwd.encode('utf-8')).hexdigest()

		# Combine the salt and hash and return the new value
		return sSalt[:20] + sHash + sSalt[20:]

	@classmethod
	def passwordStrength(cls, passwd):
		"""Password Strength

		Returns true if a password is secure enough

		Arguments:
			passwd (str): The password to check

		Returns:
			bool
		"""

		# If we don't have enough or the right chars
		if 8 > len(passwd) or \
			re.search('[A-Z]+', passwd) == None or \
			re.search('[a-z]+', passwd) == None or \
			re.search('[0-9]+', passwd) == None:

			# Invalid password
			return False

		# Return OK
		return True

	def passwordValidate(self, passwd):
		"""Password Validate

		Validates the given password against the current instance

		Arguments:
			passwd (str): The password to validate

		Returns:
			bool
		"""

		# Get the password from the record
		sPasswd = self.fieldGet('passwd')

		# Split the password
		sSalt = sPasswd[:20] + sPasswd[60:]
		sHash = sPasswd[20:60]

		# Return OK if the rehashed password matches
		return sHash == sha1(sSalt.encode('utf-8') + passwd.encode('utf-8')).hexdigest()
