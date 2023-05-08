# coding=utf8
""" Records

Handles the record structures
"""

__author__		= "Chris Nasr"
__copyright__	= "Ouroboros Coding Inc."
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "ourboroscode@gmail.com"
__created__		= "2021-04-02"

# Python imports
from hashlib import sha1
import re

# Pip imports
from FormatOC import Tree
from RestOC import Conf, JSON, Record_MySQL, StrHelper

def install():
	"""Install

	Handles the initial creation of the tables in the DB

	Returns:
		None
	"""
	Access.table_create()
	Client.table_create()
	Company.table_create()
	CompanyTax.table_create()
	Invoice.table_create()
	InvoiceAdditional.table_create()
	InvoiceItem.table_create()
	Key.table_create()
	Payment.table_create()
	Project.table_create()
	Task.table_create()
	User.table_create()
	Work.table_create()

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

		# If we haven't loaded the config yet
		if not cls._conf:
			cls._conf = Record_MySQL.Record.generate_config(
				Tree.fromFile('definitions/access.json'),
				override={'db': Conf.get(('mysql', 'db'), 'tims-oc')}
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
			cls._conf = Record_MySQL.Record.generate_config(
				Tree.fromFile('definitions/client.json'),
				override={'db': Conf.get(('mysql', 'db'), 'tims-oc')}
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
			cls._conf = Record_MySQL.Record.generate_config(
				Tree.fromFile('definitions/company.json'),
				override={'db': Conf.get(('mysql', 'db'), 'tims-oc')}
			)

		# Return the config
		return cls._conf

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
			cls._conf = Record_MySQL.Record.generate_config(
				Tree.fromFile('definitions/company_tax.json'),
				override={'db': Conf.get(('mysql', 'db'), 'tims-oc')}
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
	def by_client(cls, client, custom={}):
		"""Range

		Returns all invoices associated with a specific client

		Arguments:
			client (str): ID of the client
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
				"WHERE `client` %(client)s\n" \
				"ORDER BY `i`.`_created` DESC" % {
			"db": dStruct['db'],
			"table": dStruct['table'],
			"client": cls.process_value(dStruct, 'client', client)
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
			cls._conf = Record_MySQL.Record.generate_config(
				Tree.fromFile('definitions/invoice.json'),
				override={'db': Conf.get(('mysql', 'db'), 'tims-oc')}
			)

		# Return the config
		return cls._conf

	@classmethod
	def range(cls, range, clients, custom={}):
		"""Range

		Returns all invoices in a timeframe that are optionally associated with
		specific clients

		Arguments:
			range (uint[]): The start and end date of the invoices
			clients (str): Optional ID or IDs of clients
			custom (dict): Custom Host and DB info
				'host' the name of the host to get/set data on
				'append' optional postfix for dynamic DBs

		Returns:
			list
		"""

		# Fetch the record structure
		dStruct = cls.struct(custom)

		# Init the where
		lWhere = ['`i`.`_created` BETWEEN FROM_UNIXTIME(%d) AND FROM_UNIXTIME(%d)' % (
			int(range[0]), int(range[1])
		)]

		# If we have clients
		if clients:
			lWhere.append('`i`.`client` %s' % cls.process_value(dStruct, 'client', clients))

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

	@classmethod
	def total(cls, clients, custom={}):
		"""Total

		Returns the total invoices amount for one or multiple clients

		Arguments:
			clients (str|str[]): The ID(s) of the client(s)
			custom (dict): Custom Host and DB info
				'host' the name of the host to get/set data on
				'append' optional postfix for dynamic DBs

		Returns:
			str
		"""

		# Fetch the record structure
		dStruct = cls.struct(custom)

		# Generate SQL
		sSQL = "SELECT SUM(`total`)\n" \
				"FROM `%(db)s`.`%(table)s` as `i`\n" \
				"WHERE `client` %(client)s\n" % {
			"db": dStruct['db'],
			"table": dStruct['table'],
			"client": cls.process_value(dStruct, 'client', clients)
		}

		# Get the total
		sTotal = Record_MySQL.Commands.select(
			dStruct['host'],
			sSQL,
			Record_MySQL.ESelect.CELL
		)

		# If it's None
		if sTotal == None:
			return '0.00'

		# Return the total
		return sTotal

# InvoiceAdditional class
class InvoiceAdditional(Record_MySQL.Record):
	"""Invoice Additional

	Represents a client invoice item that is not associated with time
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
			cls._conf = Record_MySQL.Record.generate_config(
				Tree.fromFile('definitions/invoice_additional.json'),
				override={'db': Conf.get(('mysql', 'db'), 'tims-oc')}
			)

		# Return the config
		return cls._conf

# InvoiceItem class
class InvoiceItem(Record_MySQL.Record):
	"""Invoice Item

	Represents a client invoice item associated with a project / time
	"""

	_conf = None
	"""Configuration"""

	@classmethod
	def by_invoice(cls, invoice, custom={}):
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
			cls._conf = Record_MySQL.Record.generate_config(
				Tree.fromFile('definitions/invoice_item.json'),
				override={'db': Conf.get(('mysql', 'db'), 'tims-oc')}
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
			cls._conf = Record_MySQL.Record.generate_config(
				Tree.fromFile('definitions/key.json'),
				override={'db': Conf.get(('mysql', 'db'), 'tims-oc')}
			)

		# Return the config
		return cls._conf

# Payment class
class Payment(Record_MySQL.Record):
	"""Payment

	Represents a single payment by a client
	"""

	_conf = None
	"""Configuration"""

	@classmethod
	def by_client(cls, client, custom={}):
		"""Range

		Returns all invoices associated with a specific client

		Arguments:
			client (str): ID of the client
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
				"	`i`.`_id` as `_id`,\n" \
				"	`i`.`_created` as `_created`,\n" \
				"	`i`.`client` as `client`,\n" \
				"	`c`.`name` as `clientName`,\n" \
				"	`i`.`transaction` as `transaction`,\n" \
				"	`i`.`amount` as `amount`\n" \
				"FROM `%(db)s`.`%(table)s` as `i`\n" \
				"JOIN `%(db)s`.`client` as `c` ON `i`.`client` = `c`.`_id`\n" \
				"WHERE `client` %(client)s\n" \
				"ORDER BY `i`.`_created` DESC" % {
			"db": dStruct['db'],
			"table": dStruct['table'],
			"client": cls.process_value(dStruct, 'client', client)
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
			cls._conf = Record_MySQL.Record.generate_config(
				Tree.fromFile('definitions/payment.json'),
				override={'db': Conf.get(('mysql', 'db'), 'tims-oc')}
			)

		# Return the config
		return cls._conf

	@classmethod
	def range(cls, range, clients, custom={}):
		"""Range

		Returns all payments in a timeframe that are optionally associated with
		specific clients

		Arguments:
			range (uint[]): The start and end date of the payments
			clients (str): Optional ID or IDs of clients
			custom (dict): Custom Host and DB info
				'host' the name of the host to get/set data on
				'append' optional postfix for dynamic DBs

		Returns:
			list
		"""

		# Fetch the record structure
		dStruct = cls.struct(custom)

		# Init the where
		lWhere = ['`i`.`_created` BETWEEN FROM_UNIXTIME(%d) AND FROM_UNIXTIME(%d)' % (
			int(range[0]), int(range[1])
		)]

		# If we have clients
		if clients:
			lWhere.append('`i`.`client` %s' % cls.process_value(dStruct, 'client', clients))

		# Generate SQL
		sSQL = "SELECT\n" \
				"	`i`.`_id` as `_id`,\n" \
				"	`i`.`_created` as `_created`,\n" \
				"	`i`.`client` as `client`,\n" \
				"	`c`.`name` as `clientName`,\n" \
				"	`i`.`transaction` as `transaction`,\n" \
				"	`i`.`amount` as `amount`\n" \
				"FROM `%(db)s`.`%(table)s` as `i`\n" \
				"JOIN `%(db)s`.`client` as `c` ON `i`.`client` = `c`.`_id`\n" \
				"WHERE %(where)s\n" \
				"ORDER BY `i`.`_created` DESC" % {
			"db": dStruct['db'],
			"table": dStruct['table'],
			"where": '\nAND'.join(lWhere)
		}

		print(sSQL)

		# Execute and return the select
		return Record_MySQL.Commands.select(
			dStruct['host'],
			sSQL,
			Record_MySQL.ESelect.ALL
		)

	@classmethod
	def total(cls, clients, custom={}):
		"""Total

		Returns the total payments amount for one or multiple clients

		Arguments:
			clients (str|str[]): The ID(s) of the client(s)
			custom (dict): Custom Host and DB info
				'host' the name of the host to get/set data on
				'append' optional postfix for dynamic DBs

		Returns:
			str
		"""

		# Fetch the record structure
		dStruct = cls.struct(custom)

		# Generate SQL
		sSQL = "SELECT SUM(`amount`)\n" \
				"FROM `%(db)s`.`%(table)s` as `i`\n" \
				"WHERE `client` %(client)s\n" % {
			"db": dStruct['db'],
			"table": dStruct['table'],
			"client": cls.process_value(dStruct, 'client', clients)
		}

		# Get the total
		sTotal = Record_MySQL.Commands.select(
			dStruct['host'],
			sSQL,
			Record_MySQL.ESelect.CELL
		)

		# If it's None
		if sTotal == None:
			return '0.00'

		# Return the total
		return sTotal

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
			cls._conf = Record_MySQL.Record.generate_config(
				Tree.fromFile('definitions/project.json'),
				override={'db': Conf.get(('mysql', 'db'), 'tims-oc')}
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
			cls._conf = Record_MySQL.Record.generate_config(
				Tree.fromFile('definitions/task.json'),
				override={'db': Conf.get(('mysql', 'db'), 'tims-oc')}
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
	def clear(cls, _id):
		"""Clear

		Removes a user from the cache

		Arguments:
			_id (str): The ID of the user we want to clear

		Returns:
			None
		"""

		# Delete the key in Redis
		cls._redis.delete('user:%s' % _id)

	@classmethod
	def cache_get(cls, _id):
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
			if dUser['type'] != 'admin':

				# Look for access values
				lAccess = Access.filter({
					"user": _id
				}, raw=['client'])

				# Store them in the user
				dUser['access'] = lAccess and \
									[d['client'] for d in lAccess] or \
									None

			# Else, admin user
			else:
				dUser['access'] = None

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
			cls._conf = Record_MySQL.Record.generate_config(
				Tree.fromFile('definitions/user.json'),
				override={'db': Conf.get(('mysql', 'db'), 'tims-oc')}
			)

		# Return the config
		return cls._conf

	@staticmethod
	def password_hash(passwd):
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
	def password_strength(cls, passwd):
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

	def password_validate(self, passwd):
		"""Password Validate

		Validates the given password against the current instance

		Arguments:
			passwd (str): The password to validate

		Returns:
			bool
		"""

		# Get the password from the record
		sPasswd = self.field_get('passwd')

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
	def by_user(cls, user, start, end, client=None, custom={}):
		"""By User

		Returns all work in a timeframe that are assigned to a specific user

		Arguments:
			user (str): The ID of the user
			start (uint): The minimum time the task can end in
			end (uint): The maximum time the task can end in
			client (str): Optional, single client to fetch
			custom (dict): Custom Host and DB info
				'host' the name of the host to get/set data on
				'append' optional postfix for dynamic DBs

		Returns:
			list
		"""

		# Fetch the record structure
		dStruct = cls.struct(custom)
		dClient = Client.struct(custom)

		# Init where with user and range
		lWhere = [
			"`w`.`user` = '%s'" % user,
			"`w`.`end` BETWEEN FROM_UNIXTIME(%d) AND FROM_UNIXTIME(%d)" % (
				start, end
			)
		]

		# If we have a client
		if client is not None:
			lWhere.append("`p`.`client` %s" % cls.process_value(
				dClient, '_id', client
			))

		# Generate SQL
		sSQL = "SELECT\n" \
				"	`w`.`_id` as `_id`,\n" \
				"	`p`.`client` as `client`,\n" \
				"	`c`.`name` as `clientName`,\n" \
				"	`w`.`project` as `project`,\n" \
				"	`p`.`name` as `projectName`,\n" \
				"	`w`.`task` as `task`,\n" \
				"	`t`.`name` as `taskName`,\n" \
				"	`w`.`start` as `start`,\n" \
				"	`w`.`end` as `end`,\n" \
				"	`w`.`description` as `description`\n" \
				"FROM `%(db)s`.`%(table)s` as `w`\n" \
				"JOIN `%(db)s`.`task` as `t` ON `w`.`task` = `t`.`_id`\n" \
				"JOIN `%(db)s`.`project` as `p` ON `w`.`project` = `p`.`_id`\n" \
				"JOIN `%(db)s`.`client` as `c` ON `p`.`client` = `c`.`_id`\n" \
				"WHERE %(where)s\n" \
				"ORDER BY `start`" % {
			"db": dStruct['db'],
			"table": dStruct['table'],
			"where": '\nAND '.join(lWhere)
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
			cls._conf = Record_MySQL.Record.generate_config(
				Tree.fromFile('definitions/work.json'),
				override={'db': Conf.get(('mysql', 'db'), 'tims-oc')}
			)

		# Return the config
		return cls._conf

	@classmethod
	def for_invoice(cls, start, end, client, custom={}):
		"""For Invoice

		Pulls out data needed to generate an invoice

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

		# Fetch the record structure
		dStruct = cls.struct(custom)

		# Generate SQL
		sSQL = "SELECT `w`.`project`, `w`.`task`, `w`.`start`, `w`.`end`\n" \
				"FROM `%(db)s`.`%(table)s` as `w`\n" \
				"JOIN `%(db)s`.`project` as `p` ON `w`.`project` = `p`.`_id`\n" \
				"WHERE `p`.`client` = '%(client)s'\n" \
				"AND `w`.`end` BETWEEN FROM_UNIXTIME(%(start)d) AND FROM_UNIXTIME(%(end)d)" % {
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
				"	`w`.`task` as `task`,\n" \
				"	`t`.`name` as `taskName`,\n" \
				"	`w`.`start` as `start`,\n" \
				"	`w`.`description` as `description`\n" \
				"FROM `%(db)s`.`%(table)s` as `w`\n" \
				"JOIN `%(db)s`.`task` as `t` ON `w`.`task` = `t`.`_id`\n" \
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
				"	`w`.`_id` as `_id`,\n" \
				"	`p`.`client` as `client`,\n" \
				"	`c`.`name` as `clientName`,\n" \
				"	`w`.`project` as `project`,\n" \
				"	`p`.`name` as `projectName`,\n" \
				"	`w`.`task` as `task`,\n" \
				"	`t`.`name` as `taskName`,\n" \
				"	`w`.`user` as `user`,\n" \
				"	`u`.`name` as `userName`,\n" \
				"	`w`.`start` as `start`,\n" \
				"	`w`.`end` as `end`,\n" \
				"	`w`.`description` as `description`\n" \
				"FROM `%(db)s`.`%(table)s` as `w`\n" \
				"JOIN `%(db)s`.`task` as `t` ON `w`.`task` = `t`.`_id`\n" \
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

	@classmethod
	def range_grouped(cls, start, end, clients, custom={}):
		"""Range Grouped

		Returns all work in a timeframe that are associated with specific
		clients and grouped by unique task

		Arguments:
			start (uint): The minimum time the work can end in
			end (uint): The maximum time the work can end in
			clients (str): ID or IDs of clients
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
				"	`w`.`_id` as `_id`,\n" \
				"	`p`.`client` as `client`,\n" \
				"	`c`.`name` as `clientName`,\n" \
				"	`w`.`project` as `project`,\n" \
				"	`p`.`name` as `projectName`,\n" \
				"	`w`.`task` as `task`,\n" \
				"	`t`.`name` as `taskName`,\n" \
				"	`w`.`user` as `user`,\n" \
				"	`u`.`name` as `userName`,\n" \
				"	`w`.`start` as `start`,\n" \
				"	`w`.`end` as `end`,\n" \
				"	`t`.`description` as `description`\n" \
				"FROM `%(db)s`.`%(table)s` as `w`\n" \
				"JOIN `%(db)s`.`task` as `t` ON `w`.`task` = `t`.`_id`\n" \
				"JOIN `%(db)s`.`project` as `p` ON `w`.`project` = `p`.`_id`\n" \
				"JOIN `%(db)s`.`client` as `c` ON `p`.`client` = `c`.`_id`\n" \
				"JOIN `%(db)s`.`user` as `u` ON `w`.`user` = `u`.`_id`\n" \
				"WHERE %(where)s\n" \
				"ORDER BY `clientName`, `projectName`, `taskName`" % {
			"db": dStruct['db'],
			"table": dStruct['table'],
			"where": '\nAND'.join(lWhere)
		}

		# Execute and store the select
		lRecords = Record_MySQL.Commands.select(
			dStruct['host'],
			sSQL,
			Record_MySQL.ESelect.ALL
		)

		# Calculate the total elapsed per unique task
		dTasks = {}
		for d in lRecords:

			# Get the total seconds
			iElapsed = d['end'] - d['start']

			# Add it to the existing, or init the task
			try:
				dTasks[d['task']]['elapsed'] += iElapsed
			except KeyError:
				dTasks[d['task']] = d
				dTasks[d['task']]['elapsed'] = iElapsed

		# Return the unique tasks with the total elapsed time
		return list(dTasks.values())