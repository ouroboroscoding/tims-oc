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

# Access class
class Access(Record_MySQL.Record):
	"""Access

	Represents a single permission associated with a user
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
				Tree.fromFile('definitions/access.json')
			)

		# Return the config
		return cls._conf

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

	Represents the company doing the tasks that will invoice the client
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

	@classmethod
	def getAndDecodeTaxes(cls):
		"""Get and Decode Taxes

		Gets the company (there should only be one) and converts the taxes to
		a list from JSON

		Returns:
			dict
		"""

		# Get the one company
		dCompany = cls.get(raw=True, limit=1)

		# Decode the taxes
		dCompany['taxes'] = JSON.decode(dCompany['taxes'])

		# Return the company
		return dCompany

# Company Tax class
class CompanyTax(Record_MySQL.Record):
	"""Company

	Represents taxes added by the company on invoices
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
				Tree.fromFile('definitions/company_tax.json')
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

	@classmethod
	def getNextIdentifier(cls, custom={}):
		"""Get Next Identifier

		Gets the next available invoice identifier which is used for client
		identification as opposed to system identification

		Arguments:
			custom (dict): Custom Host and DB info
				'host' the name of the host to get/set data on
				'append' optional postfix for dynamic DBs

		Returns:
			uint
		"""

		# Fetch the record structure
		dStruct = cls.struct(custom)

		# Generate SQL
		sSQL = "SELECT MAX(`identifier`)\n" \
				"FROM `%(db)s`.`%(table)s`" % {
			"db": dStruct['db'],
			"table": dStruct['table']
		}

		# Execute the select
		iIdentifier = Record_MySQL.Commands.select(
			dStruct['host'],
			sSQL,
			Record_MySQL.ESelect.CELL
		)

		# If we got nothing
		if iIdentifier is None:
			return 1

		# Add 1 and return
		return iIdentifier + 1

	@classmethod
	def range(cls, start, end, clients, custom={}):
		"""Range

		Returns all invoices in a timeframe that are optionally associated with
		specific clients

		Arguments:
			start (uint): The minimum time the task can end in
			end (uint): The maximum time the task can end in
			clients (str): Optional ID or IDs of clients
			custom (dict): Custom Host and DB info
				'host' the name of the host to get/set data on
				'append' optional postfix for dynamic DBs

		Returns:
			list
		"""

		# Init the where
		lWhere = ['`i`.`_created` BETWEEN FROM_UNIXTIME(%d) AND FROM_UNIXTIME(%d)' % (
			start, end
		)]

		# If we have clients
		if clients:
			lWhere.append('`i`.`client` %s' % (isinstance(clients, list) and \
							("IN ('%s')" % "','".join(clients)) or \
							("= '%s'" % clients))
			)

		# Fetch the record structure
		dStruct = cls.struct(custom)

		# Generate SQL
		sSQL = "SELECT\n" \
				"	`i`.`_id` as `_id`,\n" \
				"	`i`.`_created` as `_created`,\n" \
				"	`i`.`client` as `client`,\n" \
				"	`c`.`name` as `clientName`,\n" \
				"	`i`.`identifier` as `identifier`,\n" \
				"	`i`.`start` as `start`,\n" \
				"	`i`.`end` as `end`,\n" \
				"	`i`.`total` as `total`\n" \
				"FROM `%(db)s`.`%(table)s` as `i`\n" \
				"JOIN `%(db)s`.`client` as `c` ON `i`.`client` = `c`.`_id`\n" \
				"WHERE %(where)s\n" \
				"ORDER BY `i`.`_created` DESC" % {
			"db": dStruct['db'],
			"table": dStruct['table'],
			"where": '\nAND'.join(lWhere)
		}

		# Execute and return the select
		return Record_MySQL.Commands.select(
			dStruct['host'],
			sSQL,
			Record_MySQL.ESelect.ALL
		)

# InvoiceItem class
class InvoiceItem(Record_MySQL.Record):
	"""InvoiceItem

	Represents a client invoice
	"""

	_conf = None
	"""Configuration"""

	@classmethod
	def byInvoice(cls, invoice, custom={}):
		"""By Invoice

		Returns all items associated with a specific invoice, including the
		names of the projects

		Arguments:
			invoice (str): The ID of the invoice
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
				"	`i`.`project` as `project`,\n" \
				"	`p`.`name` as `projectName`,\n" \
				"	`i`.`minutes` as `minutes`,\n" \
				"	`i`.`amount` as `amount`" \
				"FROM `%(db)s`.`%(table)s` as `i`\n" \
				"JOIN `%(db)s`.`project` as `p` ON `i`.`project` = `p`.`_id`\n" \
				"WHERE `invoice` = '%(invoice)s'\n" \
				"ORDER BY `p`.`name`" % {
			"db": dStruct['db'],
			"table": dStruct['table'],
			"invoice": invoice
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

	Represents a single task in a project in a specific company
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
	def cacheClear(cls, _id):
		"""Cache Clear

		Removes a user from the cache

		Arguments:
			_id (str): The ID of the user we want to clear

		Returns:
			None
		"""

		# Delete the key in Redis
		cls._redis.delete('user:%s' % _id)

	@classmethod
	def cacheGet(cls, _id):
		"""Cache Get

		Gets a user from the cache, if they can't be found, defaults to fetching
		from the DB and filling the cache

		Arguments:
			_id (str): The ID of the user to fetch

		Returns:
			dict
		"""

		# Fetch a single key
		sUser = cls._redis.get('user:%s' % _id)

		# If we have a record
		if sUser:

			# Decode it
			dUser = JSON.decode(sUser)

		# Else
		else:

			# Fetch the user from the DB
			dUser = cls.get(_id, raw=True)

			# If there's no user
			if not dUser:
				return None

			# Remove the password
			del dUser['passwd']

			# If the user is not an admin
			if dUser['type'] is not 'admin':

				# Look for access values
				lAccess = Access.filter({
					"user": _id
				}, raw=['client'])

				# Store them in the user
				dUser['access'] = lAccess and \
									[d['client'] for d in lAccess] or \
									None

			# Store the user in the cache
			cls._redis.set('user:%s' % _id, JSON.encode(dUser))

		# Return the user
		return dUser

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

# Work class
class Work(Record_MySQL.Record):
	"""Work

	Represents a single work period on a specific task
	"""

	_conf = None
	"""Configuration"""

	@classmethod
	def byUser(cls, user, start, end, custom={}):
		"""By User

		Returns all work in a timeframe that are assigned to a specific user

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
				"	`w`.`project` as `project`,\n" \
				"	`p`.`name` as `projectName`,\n" \
				"	`w`.`start` as `start`,\n" \
				"	`w`.`end` as `end`,\n" \
				"	`w`.`description` as `description`\n" \
				"FROM `%(db)s`.`%(table)s` as `w`\n" \
				"JOIN `%(db)s`.`project` as `p` ON `w`.`project` = `p`.`_id`\n" \
				"JOIN `%(db)s`.`client` as `c` ON `p`.`client` = `c`.`_id`\n" \
				"WHERE `w`.`user` = '%(user)s'\n" \
				"AND `w`.`end` BETWEEN FROM_UNIXTIME(%(start)d) AND FROM_UNIXTIME(%(end)d)" % {
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
				Tree.fromFile('definitions/work.json')
			)

		# Return the config
		return cls._conf

	@classmethod
	def open(cls, user, custom={}):
		"""Open

		Returns unfinished work by user if any exists

		Arguments:
			user (str): The ID of the user
			custom (dict): Custom Host and DB info
				'host' the name of the host to get/set data on
				'append' optional postfix for dynamic DBs

		Returns:
			dict | None
		"""

		# Fetch the record structure
		dStruct = cls.struct(custom)

		# Generate SQL
		sSQL = "SELECT\n" \
				"	`w`.`_id`,\n" \
				"	`p`.`client` as `client`,\n" \
				"	`c`.`name` as `clientName`,\n" \
				"	`w`.`project` as `project`,\n" \
				"	`p`.`name` as `projectName`,\n" \
				"	`w`.`start` as `start`,\n" \
				"	`w`.`description` as `description`\n" \
				"FROM `%(db)s`.`%(table)s` as `w`\n" \
				"JOIN `%(db)s`.`project` as `p` ON `w`.`project` = `p`.`_id`\n" \
				"JOIN `%(db)s`.`client` as `c` ON `p`.`client` = `c`.`_id`\n" \
				"WHERE `w`.`user` = '%(user)s'\n" \
				"AND `w`.`end` IS NULL" % {
			"db": dStruct['db'],
			"table": dStruct['table'],
			"user": user
		}

		# Execute and return the select
		return Record_MySQL.Commands.select(
			dStruct['host'],
			sSQL,
			Record_MySQL.ESelect.ROW
		)

	@classmethod
	def range(cls, start, end, clients=None, custom={}):
		"""Range

		Returns all work in a timeframe that are, optionally, associated with
		specific clients

		Arguments:
			start (uint): The minimum time the work can end in
			end (uint): The maximum time the work can end in
			clients (str): Optional ID or IDs of clients
			custom (dict): Custom Host and DB info
				'host' the name of the host to get/set data on
				'append' optional postfix for dynamic DBs

		Returns:
			list
		"""

		# Init the where
		lWhere = ['`w`.`end` BETWEEN FROM_UNIXTIME(%d) AND FROM_UNIXTIME(%d)' % (
			start, end
		)]

		# If we have clients
		if clients:
			lWhere.append('`p`.`client` %s' % (isinstance(clients, list) and \
							("IN ('%s')" % "','".join(clients)) or \
							("= '%s'" % clients))
			)

		# Fetch the record structure
		dStruct = cls.struct(custom)

		# Generate SQL
		sSQL = "SELECT\n" \
				"	`p`.`client` as `client`,\n" \
				"	`c`.`name` as `clientName`,\n" \
				"	`w`.`project` as `project`,\n" \
				"	`p`.`name` as `projectName`,\n" \
				"	`w`.`user` as `user`,\n" \
				"	`u`.`name` as `userName`,\n" \
				"	`w`.`start` as `start`,\n" \
				"	`w`.`end` as `end`,\n" \
				"	`w`.`description` as `description`\n" \
				"FROM `%(db)s`.`%(table)s` as `w`\n" \
				"JOIN `%(db)s`.`project` as `p` ON `w`.`project` = `p`.`_id`\n" \
				"JOIN `%(db)s`.`client` as `c` ON `p`.`client` = `c`.`_id`\n" \
				"JOIN `%(db)s`.`user` as `u` ON `w`.`user` = `u`.`_id`\n" \
				"WHERE %(where)s\n" \
				"ORDER BY `start`" % {
			"db": dStruct['db'],
			"table": dStruct['table'],
			"where": '\nAND'.join(lWhere)
		}

		# Execute and return the select
		return Record_MySQL.Commands.select(
			dStruct['host'],
			sSQL,
			Record_MySQL.ESelect.ALL
		)
