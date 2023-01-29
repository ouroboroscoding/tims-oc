# coding=utf8
""" Primary Service

Handles all tims requests
"""

__author__		= "Chris Nasr"
__copyright__	= "OuroborosCoding"
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "chris@ouroboroscoding.com"
__created__		= "2021-04-06"

# Python imports
from base64 import b64decode, b64encode
from decimal import Decimal, ROUND_UP
from pprint import pprint
from time import time

# Pip imports
from redis import StrictRedis
from RestOC import Conf, DateTimeHelper, DictHelper, Errors, JSON, \
					Services, Sesh, StrHelper, Templates
from RestOC.Record_MySQL import DuplicateException

# Record imports
from records import Access, Client, Company, Invoice, InvoiceItem, Key, \
					Payment, Project, Task, User, Work

# Shared imports
from shared import EMail, Rights, SSS

# Defines
_INVOICE_S3_KEY = '%(client)s/%(invoice)s.pdf'

class Primary(Services.Service):
	"""Primary Service class

	Service for main requests
	"""

	_install = [
		Access, Client, Company, Invoice, InvoiceItem, Key, Payment, Project, \
		Task, User, Work
	]
	"""Record types called in install"""

	def _createKey(self, user, type):
		"""Create Key

		Creates a key used for verification of the user

		Arguments:
			user (str): The ID of the user
			type (str): The type of key to make

		Returns:
			str
		"""

		# Create an instance
		oKey = Key({
			"_id": StrHelper.random(32, '_0x'),
			"user": user,
			"type": type
		})

		# Loop until we resolve the issue
		while True:
			try:

				# Create the key record
				oKey.create()

				# Return the key
				return oKey['_id']

			# If we got a duplicate key error
			except DuplicateException as e:

				# If the primary key is the duplicate
				if 'PRIMARY' in e.args[1]:

					# Generate a new key and try again
					oKey['_id'] = StrHelper.random(32, '_0x')
					continue

				# Else, the type has already been used for the user
				else:

					# Find the existing key
					dKey = Key.filter({"user": user, "type": type}, raw=['_id'], limit=1)
					return dKey['_id']

	def _generateInvoicePdf(self, _id):
		"""Generate Invoice PDF

		Generates and uploads the PDF for a specific invoice

		Arguments:
			_id (str): The ID of the invoice

		Returns:
			None
		"""

		# Get the invoice
		dInvoice = Invoice.get(_id, raw=True)

		# Generate the template data
		dTpl = {
			"company": Company.get(raw=True, limit=1),
			"client": Client.get(dInvoice['client'], raw=True),
			"invoice": dInvoice,
			"items": InvoiceItem.byInvoice(_id)
		}
		dTpl['company']['address'] = '%s%s' % (dTpl['company']['address1'], (dTpl['company']['address2'] and dTpl['company']['address2'] or ''))
		dTpl['client']['address'] = '%s%s' % (dTpl['client']['address1'], (dTpl['client']['address2'] and dTpl['client']['address2'] or ''))
		dTpl['invoice']['minutes'] = 0
		dTpl['invoice']['created'] = DateTimeHelper.date(dTpl['invoice']['_created'])
		dTpl['invoice']['due'] = DateTimeHelper.date(
			DateTimeHelper.dateInc(dTpl['client']['due'], dTpl['invoice']['_created'])
		)
		for d in dTpl['items']:
			dTpl['invoice']['minutes'] += d['minutes']
			d['elapsedTime'] = DateTimeHelper.timeElapsed(d['minutes']*60, {"show_seconds": False, "show_zero_hours": True})
		dTpl['invoice']['elapsedTime'] = DateTimeHelper.timeElapsed(dTpl['invoice']['minutes']*60, {"show_seconds": False, "show_zero_hours": True})

		# Generate the PDF
		sPDF = Templates.generate('pdf/invoice.html', dTpl, 'en-US', pdf=True)

		# Create the Key for S3
		sKey = _INVOICE_S3_KEY % {
			"client": dInvoice['client'],
			"invoice": _id
		}

		# Init the result
		mResult = None

		# Create new object and upload it
		try:
			SSS.put(sKey, sPDF, headers={"ContentType":'application/pdf',"ContentLength":len(sPDF)})
		except SSS.SSSException as e:
			mResult = 'PDF Generation Failed: %s' % str(e.args)

		# Return the result
		return mResult

	def initialise(self):
		"""Initialise

		Initialises the instance and returns itself for chaining

		Returns:
			User
		"""

		# Create a connection to Redis
		self._redis = StrictRedis(**Conf.get(('redis', 'primary'), {
			"host": "localhost",
			"port": 6379,
			"db": 0
		}))

		# Pass the Redis connection to records that need it
		User.redis(self._redis)

		# Get the S3 config
		dS3 = Conf.get('s3')

		# Init the S3 module
		SSS.init(
			dS3['profile'],
			dS3['conf'],
			dS3['bucket'],
			dS3['path']
		)

		# Store the lifetime of S3 urls
		self._s3_expires = dS3['expires']

		# Return self for chaining
		return self

	@classmethod
	def install(cls):
		"""Install

		The service's install method, used to setup storage or other one time
		install configurations

		Returns:
			bool
		"""

		# Go through each Record type
		for o in cls._install:

			# Install the table
			if not o.tableCreate():
				print("Failed to create `%s` table" % o.tableName())

		# Return OK
		return True

	def accountClients_read(self, data, sesh):
		"""Account Clients read

		Returns all the clients accesible for the user based on all permissions

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Get the user
		dUser = User.cacheGet(sesh['user_id'])

		# Fetch the clients using IDs the user has access to
		lClients = Client.get(
			dUser['access'] and dUser['access'] or None,
			filter={"_archived": False},
			raw=['_id', 'name']
		)

		# Return the cients
		return Services.Response(lClients)

	def accountForgot_create(self, data):
		"""Account: Forgot create

		Verifies a user exists by email and generates a key sent to that
		email to allow them to reset their password

		Arguments:
			data (dict): The data passed to the request

		Returns:
			Services.Response
		"""

		# Verify the minimum fields
		try: DictHelper.eval(data, ['email', 'url'])
		except ValueError as e: return Services.Response(error=(1001, [(f, 'missing') for f in e.args]))

		# Make sure the URL has the {key} and {locale} fields
		if '{key}' not in data['url']:
			return Services.Error(1001, [['url', 'missing {key}']])
		if '{locale}' not in data['url']:
			return Services.Error(1001, [['url', 'missing {locale}']])

		# Pop off the URL
		sURL = data.pop('url')

		# Convert the email to lowercase
		data['email'] = data['email'].lower()

		# Look for the user by email
		dUser = User.filter({"email": data['email']}, raw=['_id'])

		# Even if it doesn't exist, return true so no one can fish for email
		#	addresses in the system
		if not dUser:
			return Services.Response(True)

		# Generate a key
		sKey = self._createKey(dUser['_id'], 'forgot')

		# Create the forgot template data
		dTpl = {
			"url": sURL \
					.replace('{locale}', data['locale']) \
					.replace('{key}', sKey)
		}

		# Generate the templates
		dTpls = EMail.template('forgot', dTpl, oUser['locale'])
		if not bRes:
			print('Failed to send email: %s' % EMail.last_error)
			return Services.Response(False)

		# Return OK
		return Services.Response(True)

	def accountForgot_update(self, data):
		"""Account: Forgot update

		Verifies a user by key and allows them to set a new password

		Arguments:
			data (dict): The data passed to the request

		Returns:
			Services.Response
		"""

		# Verify the minimum fields
		try: DictHelper.eval(data, ['passwd', 'key'])
		except ValueError as e: return Services.Response(error=(1001, [(f, 'missing') for f in e.args]))

		# Look up the key
		oKey = Key.get(data['key'])
		if not oKey:
			return Services.Error(2003, ['key', data['key']])

		# Find the user
		oUser = User.get(oKey['user'])
		if not oUser:
			return Services.Error(2003, ['user', oKey['user']])

		# Make sure the new password is strong enough
		if not User.passwordStrength(data['passwd']):
			return Services.Error(2102)

		# Set the new password and save
		oUser['passwd'] = User.passwordHash(data['passwd'])
		oUser.save()

		# Delete the key
		oKey.delete()

		# Return OK
		return Services.Response(True)

	def accountPasswd_update(self, data, sesh):
		"""Account: Password update

		Handles changing the password for a user

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure we have at least the new password
		if 'new_passwd' not in data:
			return Services.Error(1001, [[f, 'missing']])

		# If the id is passed
		if '_id' in data and data['_id'] is not None:

			# If it doesn't match the logged in user
			if data['_id'] != sesh['user_id']:

				# Make sure the user has the proper permission to do this
				Rights.verifyOrRaise(sesh['user_id'], 'user', Rights.UPDATE)

		# Else, use the user from the session
		else:

			# If the old password is missing
			if 'passwd' not in data:
				return Services.Error(1001, [['passwd', 'missing']])

			# Store the session as the user ID
			data['_id'] = sesh['user_id']

		# Find the user
		oUser = User.get(data['_id'])
		if not oUser:
			return Services.Error(2003, ['user', data['_id']])

		# If we have an old password
		if 'passwd' in data:

			# Validate it
			if not oUser.passwordValidate(data['passwd']):
				return Services.Error(1001, [['passwd', 'invalid']])

		# Make sure the new password is strong enough
		if not User.passwordStrength(data['new_passwd']):
			return Services.Error(2102)

		# Set the new password and save
		oUser['passwd'] = User.passwordHash(data['new_passwd'])
		oUser.save()

		# Return OK
		return Services.Response(True)

	def accountSetup_read(self, data):
		"""Account Setup read

		Validates the key exists and returns the user's name

		Arguments:
			data (dict): The data passed to the request

		Returns:
			Services.Response
		"""

		# If the key is missing
		if 'key' not in data:
			return Services.Error(1001, [['key', 'missing']])

		# Look up the key
		dKey = Key.get(data['key'], raw=True)
		if not dKey:
			return Services.Error(2003, ['key', data['key']])

		# Get the user's name and locale
		dUser = User.get(dKey['user'], raw=['name', 'locale'])
		if not dUser:
			return Services.Error(2003, ['user', dKey['user']])

		# Return the user
		return Services.Response(dUser)

	def accountSetup_update(self, data):
		"""Account: Setup update

		Finishes setting up the account for the user by setting their password
		and verified fields

		Arguments:
			data (dict): The data passed to the request

		Returns:
			Services.Response
		"""

		# Verify the minimum fields
		try: DictHelper.eval(data, ['passwd', 'key'])
		except ValueError as e: return Services.Response(error=(1001, [(f, 'missing') for f in e.args]))

		# Look up the key
		oKey = Key.get(data['key'])
		if not oKey:
			return Services.Error(2003, ['key', data['key']])

		# Find the user
		oUser = User.get(oKey['user'])
		if not oUser:
			return Services.Error(2003, ['user', oKey['user']])

		# Make sure the new password is strong enough
		if not User.passwordStrength(data['passwd']):
			return Services.Error(2102)

		# If the name was passed
		if 'name' in data:
			try: oUser['name'] = data['name']
			except ValueError as e: return Services.Error(1001, e.args[0])

		# Set the new password and save
		oUser['passwd'] = User.passwordHash(data['passwd'])
		oUser['verified'] = True
		oUser.save()

		# Delete the key
		oKey.delete()

		# Create a new session, store the user ID, and save it
		oSesh = Sesh.create()
		oSesh['user_id'] = oUser['_id']
		oSesh.save()

		# Return the session ID
		return Services.Response(oSesh.id())

	def accountVerify_update(self, data):
		"""Account: Verify update

		Takes the key and the email and makrs the user as verified

		Arguments:
			data (dict): Data sent with the request

		Returns:
			Services.Response
		"""

		# Make sure we have the key
		if 'key' not in data:
			return Services.Error(1001, [['key', 'missing']])

		# Look up the key
		oKey = Key.get(data['key'])
		if not oKey:
			return Services.Error(2003, ['key', data['key']])

		# Find the user
		oUser = User.get(oKey['user'])
		if not oUser:
			return Services.Error(2003, ['user', oKey['user']])

		# Update the user to verified
		oUser['verified'] = True
		oUser.save()

		# Delete the key
		oKey.delete()

		# Return OK
		return Services.Response(True)

	def accountWork_read(self, data, sesh):
		"""Account: Work read

		Returns an existing open work record if one exists

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Look for any non-ended task with the signed in user and return it
		#	(or None)
		return Services.Response(
			Work.open(sesh['user_id'])
		)

	def accountWorks_read(self, data, sesh):
		"""Account: Works read

		Returns all the work records associated with the user in the given
		date/time range

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Verify the minimum fields
		try: DictHelper.eval(data, ['start', 'end'])
		except ValueError as e: return Services.Response(error=(1001, [(f, 'missing') for f in e.args]))

		# Make sure they're ints, or can be converted
		lErrors = []
		for k in ['start', 'end']:
			try: data[k] = int(data[k])
			except ValueError: lErrors.append([k, 'not an unsigned integer'])
		if lErrors:
			return Services.Error(1001, lErrors)

		# Fetch the tasks by the signed in user
		lWorks = Work.byUser(sesh['user_id'], data['start'], data['end'])

		# Go through each task and calculate the elpased seconds
		for d in lWorks:
			d['elapsed'] = d['end'] - d['start']

		# Return all the tasks
		return Services.Response(lWorks)

	def client_create(self, data, sesh):
		"""Client create

		Handles creating a new client

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'accounting', Rights.CREATE)

		# Create an instance to verify the fields
		try:
			oClient = Client(data)
		except ValueError as e:
			return Services.Error(1001, e.args[0])

		# Create the record and check for a duplicate name
		try:
			sID = oClient.create()
		except DuplicateException:
			return Services.Error(2004)

		# Return the new ID
		return Services.Response(sID)

	def client_delete(self, data, sesh):
		"""Client delete

		Deletes (archives) an existing client

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'admin')

		# Make sure the ID is passed
		if '_id' not in data:
			return Services.Errro(1001, [['_id', 'missing']])

		# Find the client
		oClient = Client.get(data['_id'])
		if not oClient:
			return Services.Error(2003, ['client', data['_id']])

		# Mark the client as archived
		oClient['_archived'] = True

		# Return the new ID
		return Services.Response(sID)

	def client_read(self, data, sesh):
		"""Client read

		Fetches and returns data on an existing client

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in data:
			return Services.Errro(1001, [['_id', 'missing']])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], None, data['_id'])

		# Fetch the record
		dClient = Client.get(data['_id'], raw=True)
		if not dClient:
			return Services.Error(2003, ['client', data['_id']])

		# Return the record data
		return Services.Response(dClient)

	def client_update(self, data, sesh):
		"""Client update

		Updates an existing client

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in data:
			return Services.Errro(1001, [['_id', 'missing']])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'accounting', data['_id'])

		# Find the record
		oClient = Client.get(data['_id'])
		if not oClient:
			return Services.Error(2003, ['client', data['_id']])

		# Remove fields that can't be changed
		for f in ['_id', '_created', '_updated', '_archived']:
			if f in data:
				del data[f]

		# If any of the following are passed
		bCheckClientAdmin = False
		for f in ['rate', 'task_minimum', 'task_overflow']:
			if f in data:
				bCheckClientAdmin = True
				break;

		# Check the user has full rights if necessary
		if bCheckClientAdmin:
			Rights.verifyOrRaise(sesh['user_id'], 'client', Rights.UPDATE)

		# Update each field, keeping track of errors
		lErrors = []
		for f in data:
			try: oClient[f] = data[f]
			except ValueError as e: lErrors.extend(e.args[0])

		# If there's any errors
		if lErrors:
			return Services.Error(1001, lErrors)

		# Save the record and return the result
		return Services.Response(
			oClient.save()
		)

	def clientOwes_read(self, data, sesh):
		"""Client Owes

		Fetches the total invoices and payments and returns the value remaining

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Get the signed in user
		dUser = User.cacheGet(sesh['user_id'])
		if not dUser:
			return Services.Error(2003, 'user')

		# If it's not a client
		if dUser['type'] != 'client' or dUser['access'] == None:
			return Services.Error(Rights.INVALID)

		# Get the total for all invoices
		deInvoices = Decimal(Invoice.total(dUser['access']))

		# Get the total for all payments
		dePayments = Decimal(Payment.total(dUser['access']))

		# Return the difference
		return Services.Response(
			deInvoices - dePayments
		)

	def clients_read(self, data, sesh):
		"""Clients read

		Fetches and returns data on all clients

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], ['accounting', 'manager'])

		# Fetch and return the clients
		return Services.Response(
			Client.get(raw=True, orderby='name')
		)

	def clientWorks_read(self, data, sesh):
		"""Client Works read

		Returns the total time elapsed group by tasks for a specific timeframe,
		for a specific client

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure we have all necessary data
		try: DictHelper.eval(data, ['start', 'end'])
		except ValueError as e: return Services.Response(error=(1001, [(f, 'missing') for f in e.args]))

		# Get the signed in user
		dUser = User.cacheGet(sesh['user_id'])
		if not dUser:
			return Services.Error(2003, ['user', data['user_id']])

		# Check type
		if dUser['type'] not in ['admin', 'client', 'manager']:
			return Services.Error(Rights.INVALID)

		# If the user has full access
		if dUser['access'] is None:

			# If they are a client they get nothing
			if dUser['type'] == 'client':
				return Services.Response([])

			# Else, they get full access
			lClients = None

		# Else, filter just those clients available to the user
		else:
			lClients = dUser['access']

		# Get all records that end in the given timeframe
		lWorks = Work.range_grouped(data['start'], data['end'], lClients)

		# Return the records
		return Services.Response(lWorks)

	def company_read(self, data, sesh):
		"""Company read

		Fetches and returns data on an existing company

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Fetch the record
		dCompany = Company.get(raw=True, limit=1)
		if not dCompany:
			return Services.Error(2003, ['company', data['_id']])

		# Return the record data
		return Services.Response(dCompany)

	def company_update(self, data, sesh):
		"""Company update

		Updates an existing company

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'admin')

		# Make sure the ID is passed
		if '_id' not in data:
			return Services.Errro(1001, [['_id', 'missing']])

		# Find the record
		oCompany = Company.get(data['_id'])
		if not oCompany:
			return Services.Error(2003, ['company', data['_id']])

		# Remove fields that can't be changed
		for f in ['_id', '_created', '_updated']:
			if f in data:
				del data[f]

		# Update each field, keeping track of errors
		lErrors = []
		for f in data:
			try: oCompany[f] = data[f]
			except ValueError as e: lErrors.extend(e.args[0])

		# If there's any errors
		if lErrors:
			return Services.Error(1001, lErrors)

		# Save the record and return the result
		return Services.Response(
			oCompany.save()
		)

	def invoice_create(self, data, sesh):
		"""Invoice create

		Handles creating a new invoice

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Verify the minimum fields
		try: DictHelper.eval(data, ['client', 'start', 'end'])
		except ValueError as e: return Services.Response(error=(1001, [[f, 'missing'] for f in e.args]))

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'accounting', data['client'])

		# Fetch the client info
		dClient = Client.get(data['client'], raw=True)
		if not dClient:
			return Services.Response(dClient)

		# Init the time and prices per project
		dProjects = {}

		# Fetch all the tasks for the client in the given timeframe
		lWorks = Work.forInvoice(data['start'], data['end'], data['client'])

		# Calculate the total elapsed per unique task
		dTasks = {}
		for d in lWorks:

			# Get the total seconds
			iElapsed = d['end'] - d['start']

			# Add it to the existing, or init the task
			try:
				dTasks[d['task']]['elapsed'] += iElapsed
			except KeyError:
				dTasks[d['task']] = {
					"project": d['project'],
					"elapsed": iElapsed
				}

		# Go through each unique task
		for d in dTasks.values():

			# Round to the nearest minute
			iMinutes, iRemainder = divmod(d['elapsed'], 60)

			# If the remaining seconds are anything over 15, round up
			if iRemainder > 15:
				iMinutes += 1

			# If the task minimum is 1
			if dClient['task_minimum'] == 1:

				# Store the total minutes as is
				iTotalMinutes = iMinutes

			# Else
			else:

				# Figure out the total blocks
				iBlocks, iRemainder = divmod(iMinutes, dClient['task_minimum'])

				# If the remainder is greater than the overflow
				if dClient['task_overflow'] == 0 or iRemainder > dClient['task_overflow']:
					iBlocks += 1

				# Multiply the blocks by the minimum
				iTotalMinutes = dClient['task_minimum'] * iBlocks

			# Increase the project or init it
			try:
				dProjects[d['project']]['minutes'] += iTotalMinutes
			except KeyError:
				dProjects[d['project']] = {
					"minutes": iTotalMinutes,
					"price": Decimal('0.00')
				}

		# Init the subtotal
		deSubTotal = Decimal('0.00')

		# Go through each project and calculate the amount
		for sProject in dProjects:

			# Divide the minutes by 60 to get hours
			deHours = Decimal(dProjects[sProject]['minutes']) / Decimal(60)

			# Get the price
			dePrice = Decimal(dClient['rate']) * deHours

			# Round up to closest cent
			dProjects[sProject]['amount'] = dePrice.quantize(Decimal('1.00'), rounding=ROUND_UP)

			# Update the sub-total
			deSubTotal += dProjects[sProject]['amount']

		# Get the company info
		dCompany = Company.get(raw=True, limit=1)

		# Init the taxes and total
		deTotal = Decimal(deSubTotal);
		lTaxes = []

		# Go through any taxes we have
		for d in dCompany['taxes']:

			# Generate the percentage as a divisor
			dePercentage = Decimal(d['percentage']) / Decimal('100')

			# Generate from the subtotal
			deAmount = (deSubTotal * dePercentage).quantize(Decimal('1.00'))

			# Add the tax to the list
			lTaxes.append({
				"name": d['name'],
				"amount": deAmount
			})

			# Update the total
			deTotal += deAmount

		# Create an instance of the invoice to check for problems
		try:
			oInvoice = Invoice({
				"client": data['client'],
				"identifier": StrHelper.random(6, 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789', False),
				"start": data['start'],
				"end": data['end'],
				"subtotal": deSubTotal,
				"taxes": lTaxes,
				"total": deTotal
			})
		except ValueError as e:
			return Services.Error(1001, e.args[0])

		# Create the invoice and store the ID
		while True:
			try:
				sID = oInvoice.create()
				break
			except DuplicateException:
				oInvoice['identifier'] = StrHelper.random(6, 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789', False)

		# Go through each project
		for sProject in dProjects:

			# Create an instance of the invoice item to check for problems
			try:
				oItem = InvoiceItem({
					"invoice": sID,
					"project": sProject,
					"minutes": dProjects[sProject]['minutes'],
					"amount": dProjects[sProject]['amount']
				})
			except ValueError as e:
				return Services.Error(1001, e.args[0])

			# Create the item
			oItem.create()

		# Generate the PDF
		mWarning = self._generateInvoicePdf(sID)

		# Return the new invoice as raw data
		return Services.Response(
			oInvoice.record(),
			warning=mWarning
		)

	def invoice_delete(self, data, sesh):
		"""Invoice delete

		Deletes an existing invoice

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If the ID isn't passed
		if '_id' not in data:
			return Services.Error(1001, [['_id', 'missing']])

		# Find the invoice
		oInvoice = Invoice.get(data['_id'])
		if not oInvoice:
			return Services.Error(2003, 'invoice')

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'accounting', data['client'])

		# Delete the items
		InvoiceItem.deleteGet(data['_id'], 'invoice')

		# Delete the invoice and return the result
		return Services.Response(
			oInvoice.delete()
		)

	def invoice_read(self, data, sesh):
		"""Invoice read

		Fetches and returns data on an existing invoice

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If the ID is missing
		if '_id' not in data:
			return Services.Error(1001, [['_id', 'missing']])

		# Find the invoice
		dInvoice = Invoice.get(data['_id'], raw=True)
		if not dInvoice:
			return Services.Error(2003, 'invoice')

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], ['client', 'accounting'], dInvoice['client'])

		# Find all the items associated and add them to the invoice
		dInvoice['items'] = InvoiceItem.byInvoice(data['_id'])

		# Generate the total
		dInvoice['minutes'] = 0
		for d in dInvoice['items']:
			dInvoice['minutes'] += d['minutes']

		# If we need details
		if 'details' in data and data['details']:

			# Add the details section to the invoice
			dInvoice['details'] = {

				# Fetch the client
				"client": Client.get(dInvoice['client'], raw=True),

				# Fetch the company
				"company": Company.get(raw=True, limit=1)
			}

		# Return the invoice
		return Services.Response(dInvoice)

	def invoicePdf_read(self, data, sesh):
		"""Invoice PDF read

		Returns the temporary URL for an invoices PDF

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If the ID is missing
		if '_id' not in data:
			return Services.Error(1001, [['_id', 'missing']])

		# Find the invoice
		dInvoice = Invoice.get(data['_id'], raw=True)
		if not dInvoice:
			return Services.Error(2003, 'invoice')

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], ['client', 'accounting'], dInvoice['client'])

		# Generate the temporary URL
		sURL = SSS.url(
			_INVOICE_S3_KEY % {
				"client": dInvoice['client'],
				"invoice": data['_id']
			},
			self._s3_expires
		)

		# Return the URL
		return Services.Response(sURL)

	def invoices_read(self, data, sesh):
		"""Invoices read

		Fetches and returns data on all invoices

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Get the signed in user
		dUser = User.cacheGet(sesh['user_id'])
		if not dUser:
			return Services.Error(2003, 'user')

		# If a specific task is passed
		if 'client' in data:

			# Check rights
			Rights.verifyOrRaise(dUser, ['accounting', 'client'], data['client'])

			# Set the filter
			lClients = data['client']

		# Else
		else:

			# Check type
			if dUser['type'] not in ['admin', 'accounting', 'client']:
				return Services.Error(Rights.INVALID)

			# If the user has full access
			if dUser['access'] is None:

				# If they are a client they get nothing
				if dUser['type'] == 'client':
					return Services.Response([])

				# Else, they get full access
				lClients = None

			# Else, filter just those clients available to the user
			else:
				lClients = dUser['access']

		# If a range was specified
		if 'range' in data and isinstance(data['range'], list):

			# Get all invoices in the given timeframe
			lInvoices = Invoice.range(data['range'], lClients)

		# Else
		else:

			# Just get by client
			lInvoices = Invoice.by_client(lClients)

		# Return the records
		return Services.Response(lInvoices)

	def payment_create(self, data, sesh):
		"""Payment create

		Handles creating a new payment

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure the client was passed
		if 'client' not in data:
			return Services.Error(1001, [['client', 'missing']])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'accounting', data['client'])

		# Create an instance to verify the fields
		try:
			oPayment = Payment(data)
		except ValueError as e:
			return Services.Error(1001, e.args[0])

		# Create the record
		sID = oPayment.create()

		# Return the new ID
		return Services.Response(sID)

	def payments_read(self, data, sesh):
		"""Payments read

		Fetches and returns data on all invoices

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Get the signed in user
		dUser = User.cacheGet(sesh['user_id'])
		if not dUser:
			return Services.Error(2003, 'user')

		# If a specific task is passed
		if 'client' in data:

			# Check rights
			Rights.verifyOrRaise(dUser, ['accounting', 'client'], data['client'])

			# Set the filter
			lClients = data['client']

		# Else
		else:

			# Check type
			if dUser['type'] not in ['admin', 'accounting', 'client']:
				return Services.Error(Rights.INVALID)

			# If the user has full access
			if dUser['access'] is None:

				# If they are a client they get nothing
				if dUser['type'] == 'client':
					return Services.Response([])

				# Else, they get full access
				lClients = None

			# Else, filter just those clients available to the user
			else:
				lClients = dUser['access']

		# If a range was specified
		if 'range' in data and isinstance(data['range'], list):

			# Get all invoices in the given timeframe
			lPayments = Payment.range(data['range'], lClients)

		# Else
		else:

			# Just get by client
			lPayments = Payment.by_client(lClients)

		# Return the records
		return Services.Response(lPayments)

	def project_create(self, data, sesh):
		"""Project create

		Handles creating a new project

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure the client was passed
		if 'client' not in data:
			return Services.Error(1001, [['client', 'missing']])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'manager', data['client'])

		# Create an instance to verify the fields
		try:
			oProject = Project(data)
		except ValueError as e:
			return Services.Error(1001, e.args[0])

		# Create the record and check for a duplicate name
		try:
			sID = oProject.create()
		except DuplicateException:
			return Services.Error(2004)

		# Return the new ID
		return Services.Response(sID)

	def project_delete(self, data, sesh):
		"""Project delete

		Deletes (archives) an existing project

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in data:
			return Services.Errro(1001, [['_id', 'missing']])

		# Find the record
		oProject = Project.get(data['_id'])
		if not oProject:
			return Services.Error(2003, ['project', data['_id']])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'manager', oProject['client'])

		# Mark the project as archived
		oProject['_archived'] = True

		# Return the new ID
		return Services.Response(sID)

	def project_read(self, data, sesh):
		"""Project read

		Fetches and returns data on an existing project

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in data:
			return Services.Errro(1001, [['_id', 'missing']])

		# Fetch the record
		dProject = Project.get(data['_id'], raw=True)
		if not dProject:
			return Services.Error(2003, ['project', data['_id']])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], None, dProject['client'])

		# Return the record data
		return Services.Response(dProject)

	def project_update(self, data, sesh):
		"""Project update

		Updates an existing project

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in data:
			return Services.Errro(1001, [['_id', 'missing']])

		# Find the record
		oProject = Project.get(data['_id'])
		if not oProject:
			return Services.Error(2003, ['project', data['_id']])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'manager', )

		# Remove fields that can't be changed
		for f in ['_id', '_created', '_updated', '_archived', 'client']:
			if f in data:
				del data[f]

		# Update each field, keeping track of errors
		lErrors = []
		for f in data:
			try: oProject[f] = data[f]
			except ValueError as e: lErrors.extend(e.args[0])

		# If there's any errors
		if lErrors:
			return Services.Error(1001, lErrors)

		# Save the record and return the result
		return Services.Response(
			oProject.save()
		)

	def projects_read(self, data, sesh):
		"""Projects read

		Fetches and returns data on all projects in a given client

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If the client ID isn't passed
		if 'client' not in data:
			return Services.Error(1001, [['client', 'missing']])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], None, data['client'])

		# Fetch and return the projects
		return Services.Response(
			Project.filter(
				{"client": data['client']},
				raw=True,
				orderby='name'
			)
		)

	def signin_create(self, data):
		"""Signin

		Signs a user into the system

		Arguments:
			data (dict): The data passed to the request

		Returns:
			Result
		"""

		# Verify the minimum fields
		try: DictHelper.eval(data, ['email', 'passwd'])
		except ValueError as e: return Services.Response(error=(1001, [[f, 'missing'] for f in e.args]))

		# Make sure the email is lowercase
		data['email'] = data['email'].lower()

		# Look for the user by email
		oUser = User.filter({"email": data['email']}, limit=1)
		if not oUser:
			return Services.Response(error=2100)

		# Validate the password
		if not oUser.passwordValidate(data['passwd']):
			return Services.Response(error=2100)

		# Create a new session, store the user id, and save it
		oSesh = Sesh.create()
		oSesh['user_id'] = oUser['_id']
		oSesh.save()

		# Return the session ID
		return Services.Response(oSesh.id())

	def signout_create(self, data, sesh):
		"""Signout

		Called to sign out a user and destroy their session

		Arguments:
			data (dict): Data sent with the request
			sesh (Sesh._Session): The session associated with the user

		Returns:
			Services.Response
		"""

		# Close the session so it can no longer be found/used
		sesh.close()

		# Return OK
		return Services.Response(True)

	def task_create(self, data, sesh):
		"""Task create

		Handles creating a new task

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure the client was passed
		if 'project' not in data:
			return Services.Error(1001, [['project', 'missing']])

		# Fetch the project
		dProject = Project.get(data['project'], raw=['client'])
		if not dProject:
			return Services.Error(2003, 'project:%s' % data['project'])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], ['manager', 'worker'], dProject['client'])

		# Create an instance to verify the fields
		try:
			oTask = Task(data)
		except ValueError as e:
			return Services.Error(1001, e.args[0])

		# Create the record and check for a duplicate name
		try:
			sID = oTask.create()
		except DuplicateException:
			return Services.Error(2004)

		# Return the new ID
		return Services.Response(sID)

	def task_delete(self, data, sesh):
		"""Task delete

		Deletes (archives) an existing task

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in data:
			return Services.Errro(1001, [['_id', 'missing']])

		# Find the record
		oTask = Task.get(data['_id'])
		if not oTask:
			return Services.Error(2003, 'task:%s' % data['_id'])

		# Find the associated project
		dProject = Project.get(oTask['project'], raw=['client'])
		if not dProject:
			return Services.Error(2003, 'project:%s' % oTask['project'])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'manager', dProject['client'])

		# Mark the task as archived
		oTask['_archived'] = True

		# Return the new ID
		return Services.Response(sID)

	def task_read(self, data, sesh):
		"""Task read

		Fetches and returns data on an existing task

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in data:
			return Services.Errro(1001, [['_id', 'missing']])

		# Fetch the record
		dTask = Task.get(data['_id'], raw=True)
		if not dTask:
			return Services.Error(2003, ['task', data['_id']])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], None, dTask['client'])

		# Return the record data
		return Services.Response(dTask)

	def task_update(self, data, sesh):
		"""Task update

		Updates an existing task

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in data:
			return Services.Errro(1001, [['_id', 'missing']])

		# Find the record
		oTask = Task.get(data['_id'])
		if not oTask:
			return Services.Error(2003, ['task', data['_id']])

		# Find the project
		dProject = Project.get(oTask['project'], raw=['client'])
		if not dProject:
			return Services.Error(2003, ['project', oTask['project']])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'manager', dProject['client'])

		# Remove fields that can't be changed
		for f in ['_id', '_created', '_updated', '_archived', 'client']:
			if f in data:
				del data[f]

		# Update each field, keeping track of errors
		lErrors = []
		for f in data:
			try: oTask[f] = data[f]
			except ValueError as e: lErrors.extend(e.args[0])

		# If there's any errors
		if lErrors:
			return Services.Error(1001, lErrors)

		# Save the record and return the result
		return Services.Response(
			oTask.save()
		)

	def tasks_read(self, data, sesh):
		"""Tasks read

		Fetches and returns data on all tasks in a given client

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If the project ID isn't passed
		if 'project' not in data:
			return Services.Error(1001, [['project', 'missing']])

		# Find the project
		dProject = Project.get(data['project'], raw=['client'])
		if not dProject:
			return Services.Error(2003, ['project', data['project']])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], ['admin', 'manager', 'worker'], dProject['client'])

		# Filter
		dFilter = {
			"project": data['project']
		}

		# If we don't want archived
		if 'include_arvchived' not in data or not data['include_archived']:
			dFilter['_archived'] = False

		# Fetch and return the projects
		return Services.Response(
			Task.filter(
				dFilter,
				raw=True,
				orderby='name'
			)
		)

	def user_create(self, data, sesh):
		"""User create

		Handles creating a new user

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'manager')

		# Check we have a verification url
		if 'url' not in data:
			return Services.Error(1001, [['url', 'missing']])

		# Make sure the URL has the {key} and {locale} fields
		if '{key}' not in data['url']:
			return Services.Error(1001, [['url', 'missing {key}']])

		# Pop off the URL
		sURL = data.pop('url')

		# Convert the email to lowercase
		if 'email' in data:
			data['email'] = data['email'].lower()

		# If the locale is missing
		if 'locale' not in data:
			data['locale'] = 'en-US'

		# Add the blank password
		data['passwd'] = '000000000000000000000000000000000000000000000000000000000000000000000000'

		# Set not verified
		data['verified'] = False

		# Create an instance to verify the fields
		try:
			oUser = User(data)
		except ValueError as e:
			return Services.Error(1001, e.args[0])

		# Create the record and check for a duplicate email
		try:
			sID = oUser.create()
		except DuplicateException:
			return Services.Error(2004)

		# Create key
		sKey = self._createKey(sID, 'setup')

		# Fetch the company name
		dCompany = Company.get(raw=True, limit=1)

		# Create the setup template data
		dTpl = {
			"company_name": dCompany['name'],
			"url": sURL.replace('{key}', sKey),
			"user_name": data['name'],
		}

		# Generate the templates
		dTpls = EMail.template('setup', dTpl, data['locale'])

		# Send the email
		bRes = EMail.send({
			"to": oUser['email'],
			"from": Conf.get(('email', 'from')),
			"subject": dTpls['subject'],
			"text": dTpls['text'],
			"html": dTpls['html']
		})
		if not bRes:
			print('Failed to send email: %s' % EMail.last_error)

		# Return the new ID
		return Services.Response(sID)

	def user_delete(self, data, sesh):
		"""User delete

		Deletes (archives) an existing user

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'manager')

		# Make sure the ID is passed
		if '_id' not in data:
			return Services.Errro(1001, [['_id', 'missing']])

		# Find the user
		oUser = User.get(data['_id'])
		if not oUser:
			return Services.Error(2003, ['user', data['_id']])

		# Mark the user as archived
		oUser['_archived'] = True

		# Return the new ID
		return Services.Response(sID)

	def user_read(self, data, sesh):
		"""User read

		Fetches and returns data on an existing user

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If the ID is passed
		if '_id' in data:

			# And the user is not the logged in user
			if data['_id'] != sesh['user_id']:

				# Check rights
				Rights.verifyOrRaise(sesh['user_id'], 'manager')

		# Else, just lookup the logged in user
		else:
			data['_id'] = sesh['user_id']

		# Fetch from the cache
		dUser = User.cacheGet(data['_id'])
		if not dUser:
			return Services.Error(2003, ['user', data['id']])

		# Return the record data
		return Services.Response(dUser)

	def user_update(self, data, sesh):
		"""User update

		Updates an existing user

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If the ID is passed
		if '_id' in data:

			# If it doesn't match the session
			if data['_id'] != sesh['user_id']:

				# Check rights
				Rights.verifyOrRaise(sesh['user_id'], 'manager')

		# Else, assume session user
		else:
			data['_id'] = sesh['user_id']

		# Find the record
		oUser = User.get(data['_id'])
		if not oUser:
			return Services.Error(2003, ['user', data['_id']])

		# Don't send the verification email unless the email has changed
		bSendVerify = False

		# If the email is changed
		if 'email' in data and data['email'] != oUser['email']:

			# Make sure the url was passed
			if 'url' not in data:
				return Services.Error(1001, [['url', 'missing']])

			# Flag that we need to send the verification email
			bSendVerify = True

			# Mark the user as no longer verified
			data['verified'] = False

		# Pop off the url if we have it or not
		try: sURL = data.pop('url')
		except KeyError: sURL = None

		# Remove fields that can't be changed
		for f in ['_id', '_created', '_updated']:
			if f in data:
				del data[f]

		# Update each field, keeping track of errors
		lErrors = []
		for f in data:
			try: oUser[f] = data[f]
			except ValueError as e: lErrors.extend(e.args[0])

		# If there's any errors
		if lErrors:
			return Services.Error(1001, lErrors)

		# Save the user info
		bRes = oUser.save()

		# If send the verify email
		if bSendVerify:

			# Create key
			sKey = self._createKey(oUser['_id'], 'verify')

			# Create the verify template data
			dTpl = {
				"url": sURL \
						.replace('{locale}', oUser['locale']) \
						.replace('{key}', sKey)
			}

			# Generate the templates
			dTpls = EMail.template('email_change', dTpl, oUser['locale'])

			# Send the email
			bRes = EMail.send({
				"to": oUser['email'],
				"from": Conf.get(('email', 'from')),
				"subject": dTpls['subject'],
				"text": dTpls['text'],
				"html": dTpls['html']
			})
			if not bRes:
				print('Failed to send email: %s' % EMail.last_error)

		# If the user was updated
		if bRes:

			# Clear the cache
			User.cacheClear(oUser['_id'])

		# Return the result
		return Services.Response(bRes)

	def userPasswd_update(self, data, sesh):
		"""User Password update

		Changes the password associated with a user

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If the ID is passed
		if '_id' in data:

			# If it doesn't match the session
			if data['_id'] != sesh['user_id']:

				# Check rights
				Rights.verifyOrRaise(sesh['user_id'], 'manager')

		# Else, assume session user
		else:

			# If the old password is missing
			if 'passwd' not in data:
				return Services.Error(1001, [['passwd', 'missing']])

			# Store the session as the user ID
			data['_id'] = sesh['user_id']

		# Find the record
		oUser = User.get(data['_id'])
		if not oUser:
			return Services.Error(2003, ['user', data['_id']])

		# If we have an old password
		if 'passwd' in data:

			# Validate it
			if not oUser.passwordValidate(data['passwd']):
				return Services.Error(1001, [['passwd', 'invalid']])

		# Make sure the new password is strong enough
		if not User.passwordStrength(data['new_passwd']):
			return Services.Error(2102)

		# Set the new password and save
		oUser['passwd'] = User.passwordHash(data['new_passwd'])
		oUser.save()

		# Return OK
		return Services.Response(True)

	def userAccess_create(self, data, sesh):
		"""User Access create

		Adds a client access to an existing user

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure we have all necessary data
		try: DictHelper.eval(data, ['client', 'user'])
		except ValueError as e: return Services.Response(error=(1001, [(f, 'missing') for f in e.args]))

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'manager', data['client'])

		# Make sure the client exists
		if not Client.exists(data['client']):
			return Services.Error(2003, ['client', data['client']])

		# Make sure the user exists
		if not User.exists(data['user']):
			return Services.Error(2003, ['user', data['user']])

		# Add the access
		oAccess = Access({
			"user": data['user'],
			"client": data['client']
		})
		oAccess.create(conflict='ignore')

		# Clear the user from the cache
		User.cacheClear(data['user'])

		# Return OK
		return Services.Response(True)

	def userAccess_delete(self, data, sesh):
		"""User Access delete

		Removes a client access from an existing user

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If an ID was passed
		if '_id' in data:

			# Find the access
			oAccess = Access.get(data['_id'])
			if not oAccess:
				return Services.Error(2003, ['access', data['_id']])

			# Check rights
			Rights.verifyOrRaise(sesh['user_id'], 'manager', oAccess['client'])

			# Delete the access
			oAccess.delete()

			# Clear the user from the cache
			User.cacheClear(oAccess['user'])

		# Else, if we have a client and user
		elif 'client' in data and 'user' in data:

			# Check rights
			Rights.verifyOrRaise(sesh['user_id'], 'manager', data['client'])

			# Find the record
			oAccess = Access.filter({
				"user": data['user'],
				"client": data['client']
			}, limit=1)

			# If it exists
			if oAccess:

				# Delete it
				oAccess.delete()

				# Clear the user from the cache
				User.cacheClear(data['user'])

		# Return OK
		return Services.Response(True)

	def userAccess_read(self, data, sesh):
		"""User Access read

		Fetches the client access for the given user

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'manager')

		# If we got no ID
		if '_id' not in data:
			return Services.Error(1001, [['_id', 'missing']])

		# Fetch and return the permissions
		return Services.Response(
			Access.filter({"user": data['_id']}, raw=True)
		)

	def users_read(self, data, sesh):
		"""Users read

		Returns all the users in the system

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'manager')

		# Fetch all the users and return them
		return Services.Response(
			User.get(
				raw=['_id', '_archived', 'email', 'type', 'name', 'locale', 'verified'],
				orderby='email'
			)
		)

	def workStart_create(self, data, sesh):
		"""Work Start

		Handles starting new work, which just stores the start timestamp

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure we have all necessary data
		try: DictHelper.eval(data, ['project', 'task'])
		except ValueError as e: return Services.Response(error=(1001, [(f, 'missing') for f in e.args]))

		# Find the project
		dProject = Project.get(data['project'], raw=['client'])
		if not dProject:
			return Services.Error(2003, ['project', data['project']])

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'worker', dProject['client'])

		# Find the task
		dTask = Task.get(data['task'])
		if not dTask:
			return Services.Error(2003, ['task', data['task']])

		# If we have an existing open work record
		if Work.open(sesh['user_id']):
			return Services.Error(2103)

		# Create an instance to verify the fields
		try:
			oWork = Work({
				"project": data['project'],
				"task": data['task'],
				"user": sesh['user_id'],
				"start": int(time()),
				"description": ('description' in data and data['description'] or '')
			})
		except ValueError as e:
			return Services.Error(1001, e.args[0])

		# Create the record and check for a duplicate name
		try:
			sID = oWork.create()
		except DuplicateException:
			return Services.Error(2004)

		# Return the new ID and start time
		return Services.Response({
			"_id": sID,
			"start": oWork['start']
		})

	def workEnd_update(self, data, sesh):
		"""Work End

		Handles ending an existing work record

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If the ID is missing
		if '_id' not in data:
			return Services.Error(1001, ['_id', 'missing'])

		# Find the record
		oWork = Work.get(data['_id'])
		if not oWork:
			return Services.Error(2003, ['work', data['_id']])

		# If the user doesn't match the person who started the work
		if sesh['user_id'] != oWork['user']:
			return Services.Error(Rights.INVALID)

		# If the description was passed
		if 'description' in data:
			oWork['description'] = data['description']

		# Set the end time
		oWork['end'] = int(time())

		# Save the work
		if not oWork.save():
			return Services.Response(False)

		# Return the end time
		return Services.Response(oWork['end'])

	def work_delete(self, data, sesh):
		"""Work delete

		Deletes an existing work record

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'manager')

		# If the ID is missing
		if '_id' not in data:
			return Services.Error(1001, ['_id', 'missing'])

		# Find the record
		oWork = Work.get(data['_id'])
		if not oWork:
			return Services.Error(2003, ['work', data['_id']])

		# Delete the record and return the result
		return Services.Response(
			oWork.delete()
		)

	def work_update(self, data, sesh):
		"""Work update

		Updates the timestamps for an existing work record

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verifyOrRaise(sesh['user_id'], 'manager')

		# If the ID is missing
		if '_id' not in data:
			return Services.Error(1001, ['_id', 'missing'])

		# Find the record
		oWork = Work.get(data['_id'])
		if not oWork:
			return Services.Error(2003, ['work', data['_id']])

		# Delete everything that can't be updated
		for k in ['_id', '_created', '_updated', 'user', 'project', 'task']:
			try: del data[k]
			except KeyError: pass

		# If there's nothing left
		if not data:
			return Services.Response(False)

		# Update what's left
		lErrors = []
		for k in data:
			try: oWork[k] = data[k]
			except ValueError as e: lErrors.append(e.args[0])
		if lErrors:
			return Services.Error(1001, lErrors)

		# Save the record and return the result
		return Services.Response(
			oWork.save()
		)

	def works_read(self, data, sesh):
		"""Works read

		Fetches and returns data on work for a specific client in a range

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure we have all necessary data
		try: DictHelper.eval(data, ['start', 'end'])
		except ValueError as e: return Services.Response(error=(1001, [(f, 'missing') for f in e.args]))

		# Get the signed in user
		dUser = User.cacheGet(sesh['user_id'])
		if not dUser:
			return Services.Error(2003, ['user', data['user_id']])

		# If a specific work is passed
		if 'client' in data:

			# Check rights
			Rights.verifyOrRaise(dUser, ['client', 'manager'], data['client'])

			# Set the filter
			lClients = data['client']

		# Else
		else:

			# Check type
			if dUser['type'] not in ['admin', 'client', 'manager']:
				return Services.Error(Rights.INVALID)

			# If the user has full access
			if dUser['access'] is None:

				# If they are a client they get nothing
				if dUser['type'] == 'client':
					return Services.Response([])

				# Else, they get full access
				lClients = None

			# Else, filter just those clients available to the user
			else:
				lClients = dUser['access']

		# Get all records that end in the given timeframe
		lWorks = Work.range(data['start'], data['end'], lClients)

		# Go through each record and calculate the elpased seconds
		for d in lWorks:
			d['elapsed'] = d['end'] - d['start']

		# Return the records
		return Services.Response(lWorks)