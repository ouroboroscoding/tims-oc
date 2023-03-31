# coding=utf8
""" Primary Service

Handles all tims requests
"""

__author__		= "Chris Nasr"
__copyright__	= "Ouroboros Coding Inc."
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
import arrow
import body
from redis import StrictRedis
from RestOC import Conf, DateTimeHelper, DictHelper, EMail, Services, Session, \
					StrHelper, Templates
from RestOC.Record_MySQL import DuplicateException

# Record imports
from records import Access, Client, Company, Invoice, InvoiceAdditional, \
					InvoiceItem, Key, Payment, Project, Task, User, Work

# Shared imports
from shared import Rights
from shared.SSS import SSSBucket, SSSException

# Service imports
from . import errors

# Defines
_INVOICE_S3_KEY = '%(client)s/%(invoice)s.pdf'

class Primary(Services.Service):
	"""Primary Service class

	Service for main requests
	"""

	def _create_key(self, user, type):
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
			'_id': StrHelper.random(32, '_0x'),
			'user': user,
			'type': type
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
					dKey = Key.filter({'user': user, 'type': type}, raw=['_id'], limit=1)
					return dKey['_id']

	def _generate_invoice(self, range, client, additional):
		"""Generate Invoice

		Calculates the hours and billable amounts for an invoice

		Arguments:
			range (list): The start and end date of task to fetch for the client
			client (str): The ID of the client
			additional (list): Additional lines associated with the invoice
		"""

		# Fetch the client info
		dClient = Client.get(client, raw=True)
		if not dClient:
			raise Services.ResponseException(error=(body.errors.DATA_FIELDS, [client, 'client']))

		# Init the time and prices per project
		dProjects = {}

		# Fetch all the tasks for the client in the given timeframe
		lWorks = Work.for_invoice(range[0], range[1], client)

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
					'project': d['project'],
					'elapsed': iElapsed
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
					'_id': d['project'],
					'minutes': iTotalMinutes,
					'price': Decimal('0.00')
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

		# Go through each additional and add/subtract from the subtotal
		for d in additional:
			if d['type'] == 'cost':
				deSubTotal += Decimal(d['amount'])
			else:
				deSubTotal -= Decimal(d['amount'])

		# Get the company info
		dCompany = Company.get(raw=True, limit=1)

		# Init the taxes and total
		deTotal = Decimal(deSubTotal)
		lTaxes = []

		# Go through any taxes we have
		for d in dCompany['taxes']:

			# Generate the percentage as a divisor
			dePercentage = Decimal(d['percentage']) / Decimal('100')

			# Generate from the subtotal
			deAmount = (deSubTotal * dePercentage).quantize(Decimal('1.00'))

			# Add the tax to the list
			lTaxes.append({
				'name': d['name'],
				'amount': deAmount
			})

			# Update the total
			deTotal += deAmount

		# Return the generated data
		return {
			'client': client,
			'start': range[0],
			'end': range[1],
			'subtotal': deSubTotal,
			'taxes': lTaxes,
			'total': deTotal,
			'additional': additional,
			'items': list(dProjects.values())
		}

	def _generate_invoice_pdf(self, _id):
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
			'company': Company.get(raw=True, limit=1),
			'client': Client.get(dInvoice['client'], raw=True),
			'invoice': dInvoice,
			'additional': InvoiceAdditional.filter({
				'invoice': _id
			}, raw=['text', 'type', 'amount']),
			'items': InvoiceItem.by_invoice(_id)
		}
		dTpl['company']['address'] = '%s%s' % (dTpl['company']['address1'], (dTpl['company']['address2'] and dTpl['company']['address2'] or ''))
		if dTpl['client']['address1']:
			dTpl['client']['address'] = '%s%s' % (dTpl['client']['address1'], (dTpl['client']['address2'] and dTpl['client']['address2'] or ''))
		dTpl['invoice']['minutes'] = 0
		dTpl['invoice']['created'] = DateTimeHelper.date(dTpl['invoice']['_created'])
		dTpl['invoice']['due'] = DateTimeHelper.date(
			DateTimeHelper.date_increment(dTpl['client']['due'], dTpl['invoice']['_created'])
		)
		for d in dTpl['items']:
			dTpl['invoice']['minutes'] += d['minutes']
			d['elapsedTime'] = DateTimeHelper.time_elapsed(d['minutes']*60, {"show_seconds": False, "show_zero_hours": True})
		dTpl['invoice']['elapsedTime'] = DateTimeHelper.time_elapsed(dTpl['invoice']['minutes']*60, {"show_seconds": False, "show_zero_hours": True})

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
			self.s3.put(sKey, sPDF, headers={"ContentType":'application/pdf',"ContentLength":len(sPDF)})
		except SSSException as e:
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
			'host': 'localhost',
			'port': 6379,
			'db': 0
		}))

		# Pass the Redis connection to records that need it
		User.redis(self._redis)

		# Get the S3 config
		dS3 = Conf.get('s3', {
			'bucket': 'tims',
			'conf': {
				'connect_timeout': 5,
				'read_timeout': 2
			},
			'expires': body.constants.SECONDS_HOUR,
			'path': '',
			'profile': 's3'
		})

		# Store the lifetime of S3 urls
		self._s3_expires = dS3.pop('expires')

		# Create an S3 module
		self.s3 = SSSBucket(**dS3)

		# Return self for chaining
		return self

	def account_clients_read(self, req):
		"""Account Clients read

		Returns all the clients accesible for the user based on all permissions

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Get the user
		dUser = User.cache_get(req['session']['user_id'])

		# Fetch the clients using IDs the user has access to
		lClients = Client.get(
			dUser['access'],
			filter={'_archived': False},
			raw=['_id', 'name']
		)

		# Return the cients
		return Services.Response(lClients)

	def account_forgot_create(self, req):
		"""Account: Forgot create

		Verifies a user exists by email and generates a key sent to that
		email to allow them to reset their password

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Verify the minimum fields
		try: DictHelper.eval(req['data'], ['email', 'url'])
		except ValueError as e: return Services.Error(body.errors.DATA_FIELDS, [(f, 'missing') for f in e.args])

		# Make sure the URL has the {key} and {locale} fields
		if '{key}' not in req['data']['url']:
			return Services.Error(body.errors.DATA_FIELDS, [['url', 'missing {key}']])
		if '{locale}' not in req['data']['url']:
			return Services.Error(body.errors.DATA_FIELDS, [['url', 'missing {locale}']])

		# Pop off the URL
		sURL = req['data'].pop('url')

		# Convert the email to lowercase
		req['data']['email'] = req['data']['email'].lower()

		# Look for the user by email
		dUser = User.filter({'email': req['data']['email']}, raw=['_id'])

		# Even if it doesn't exist, return true so no one can fish for email
		#	addresses in the system
		if not dUser:
			return Services.Response(True)

		# Generate a key
		sKey = self._create_key(dUser['_id'], 'forgot')

		# Create the forgot template data
		dTpl = {
			'url': sURL \
					.replace('{locale}', req['data']['locale']) \
					.replace('{key}', sKey)
		}

		# Generate the templates
		dTpls = {
			'subject': Templates.generate('email/subject/forgot', dTpl, dUser['locale']),
			'text': Templates.generate('email/text/forgot', dTpl, dUser['locale']),
			'html': Templates.generate('email/html/forgot', dTpl, dUser['locale'])
		}

		# Send the email
		bRes = EMail.send({
			'to': dUser['email'],
			'from': Conf.get(('email', 'from')),
			'subject': dTpls['subject'],
			'text': dTpls['text'],
			'html': dTpls['html']
		})
		if not bRes:
			print('Failed to send email: %s' % EMail.last_error)
			return Services.Response(False)

		# Return OK
		return Services.Response(True)

	def account_forgot_update(self, req):
		"""Account: Forgot update

		Verifies a user by key and allows them to set a new password

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Verify the minimum fields
		try: DictHelper.eval(req['data'], ['passwd', 'key'])
		except ValueError as e: return Services.Error(body.errors.DATA_FIELDS, [(f, 'missing') for f in e.args])

		# Look up the key
		oKey = Key.get(req['data']['key'])
		if not oKey:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['key'], 'key'])

		# Find the user
		oUser = User.get(oKey['user'])
		if not oUser:
			return Services.Error(body.errors.DB_NO_RECORD, [oKey['user'], 'user'])

		# Make sure the new password is strong enough
		if not User.password_strength(req['data']['passwd']):
			return Services.Error(errors.PASSWORD_STRENGTH)

		# Set the new password and save
		oUser['passwd'] = User.password_hash(req['data']['passwd'])
		oUser.save()

		# Delete the key
		oKey.delete()

		# Return OK
		return Services.Response(True)

	def account_passwd_update(self, req):
		"""Account: Password update

		Handles changing the password for a user

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure we have at least the new password
		if 'new_passwd' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['new_passwd', 'missing']])

		# If the id is passed
		if '_id' in req['data'] and req['data']['_id'] is not None:

			# If it doesn't match the logged in user
			if req['data']['_id'] != req['session']['user_id']:

				# Make sure the user has the proper permission to do this
				Rights.verify_or_raise(req['session']['user_id'], 'user', Rights.UPDATE)

		# Else, use the user from the session
		else:

			# If the old password is missing
			if 'passwd' not in req['data']:
				return Services.Error(body.errors.DATA_FIELDS, [['passwd', 'missing']])

			# Store the session as the user ID
			req['data']['_id'] = req['session']['user_id']

		# Find the user
		oUser = User.get(req['data']['_id'])
		if not oUser:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'user'])

		# If we have an old password
		if 'passwd' in req['data']:

			# Validate it
			if not oUser.password_validate(req['data']['passwd']):
				return Services.Error(body.errors.DATA_FIELDS, [['passwd', 'invalid']])

		# Make sure the new password is strong enough
		if not User.password_strength(req['data']['new_passwd']):
			return Services.Error(errors.PASSWORD_STRENGTH)

		# Set the new password and save
		oUser['passwd'] = User.password_hash(req['data']['new_passwd'])
		oUser.save()

		# Return OK
		return Services.Response(True)

	def account_setup_read(self, req):
		"""Account Setup read

		Validates the key exists and returns the user's name

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# If the key is missing
		if 'key' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['key', 'missing']])

		# Look up the key
		dKey = Key.get(req['data']['key'], raw=True)
		if not dKey:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['key'], 'key'])

		# Get the user's name and locale
		dUser = User.get(dKey['user'], raw=['name', 'locale'])
		if not dUser:
			return Services.Error(body.errors.DB_NO_RECORD, [dKey['user'], 'user'])

		# Return the user
		return Services.Response(dUser)

	def account_setup_update(self, req):
		"""Account: Setup update

		Finishes setting up the account for the user by setting their password
		and verified fields

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Verify the minimum fields
		try: DictHelper.eval(req['data'], ['passwd', 'key'])
		except ValueError as e: return Services.Error(body.errors.DATA_FIELDS, [(f, 'missing') for f in e.args])

		# Look up the key
		oKey = Key.get(req['data']['key'])
		if not oKey:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['key'], 'key'])

		# Find the user
		oUser = User.get(oKey['user'])
		if not oUser:
			return Services.Error(body.errors.DB_NO_RECORD, [oKey['user'], 'user'])

		# Make sure the new password is strong enough
		if not User.password_strength(req['data']['passwd']):
			return Services.Error(errors.PASSWORD_STRENGTH)

		# If the name was passed
		if 'name' in req['data']:
			try: oUser['name'] = req['data']['name']
			except ValueError as e: return Services.Error(body.errors.DATA_FIELDS, e.args[0])

		# Set the new password and save
		oUser['passwd'] = User.password_hash(req['data']['passwd'])
		oUser['verified'] = True
		oUser.save()

		# Delete the key
		oKey.delete()

		# Create a new session, store the user ID, and save it
		oSession = Session.create()
		oSession['user_id'] = oUser['_id']
		oSession.save()

		# Return the session ID
		return Services.Response(oSession.id())

	def account_verify_update(self, req):
		"""Account: Verify update

		Takes the key and the email and makrs the user as verified

		Arguments:
			data (dict): Data sent with the request

		Returns:
			Services.Response
		"""

		# Make sure we have the key
		if 'key' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['key', 'missing']])

		# Look up the key
		oKey = Key.get(req['data']['key'])
		if not oKey:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['key'], 'key'])

		# Find the user
		oUser = User.get(oKey['user'])
		if not oUser:
			return Services.Error(body.errors.DB_NO_RECORD, [oKey['user'], 'user'])

		# Update the user to verified
		oUser['verified'] = True
		oUser.save()

		# Delete the key
		oKey.delete()

		# Return OK
		return Services.Response(True)

	def account_work_read(self, req):
		"""Account: Work read

		Returns an existing open work record if one exists

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Look for any non-ended task with the signed in user and return it
		#	(or None)
		return Services.Response(
			Work.open(req['session']['user_id'])
		)

	def account_works_read(self, req):
		"""Account: Works read

		Returns all the work records associated with the user in the given
		date/time range

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Verify the minimum fields
		try: DictHelper.eval(req['data'], ['start', 'end'])
		except ValueError as e: return Services.Error(body.errors.DATA_FIELDS, [(f, 'missing') for f in e.args])

		# Make sure they're ints, or can be converted
		lErrors = []
		for k in ['start', 'end']:
			try: req['data'][k] = int(req['data'][k])
			except ValueError: lErrors.append([k, 'not an unsigned integer'])
		if lErrors:
			return Services.Error(body.errors.DATA_FIELDS, lErrors)

		# Fetch the tasks by the signed in user
		lWorks = Work.by_user(req['session']['user_id'], req['data']['start'], req['data']['end'])

		# Go through each task and calculate the elpased seconds
		for d in lWorks:
			d['elapsed'] = d['end'] - d['start']

		# Return all the tasks
		return Services.Response(lWorks)

	def client_create(self, req):
		"""Client create

		Handles creating a new client

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'accounting', Rights.CREATE)

		# Create an instance to verify the fields
		try:
			oClient = Client(req['data'])
		except ValueError as e:
			return Services.Error(body.errors.DATA_FIELDS, e.args[0])

		# Create the record and check for a duplicate name
		try:
			sID = oClient.create()
		except DuplicateException:
			return Services.Error(body.errors.DB_DUPLICATE, [oClient['name'], 'name'])

		# Return the new ID
		return Services.Response(sID)

	def client_delete(self, req):
		"""Client delete

		Deletes (archives) an existing client

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'admin')

		# Make sure the ID is passed
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Find the client
		oClient = Client.get(req['data']['_id'])
		if not oClient:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'client'])

		# Mark the client as archived
		oClient['_archived'] = True

		# Save the client and return the result
		return Services.Response(
			oClient.save()
		)

	def client_read(self, req):
		"""Client read

		Fetches and returns data on an existing client

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], None, req['data']['_id'])

		# Fetch the record
		dClient = Client.get(req['data']['_id'], raw=True)
		if not dClient:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'client'])

		# Return the record data
		return Services.Response(dClient)

	def client_update(self, req):
		"""Client update

		Updates an existing client

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'accounting', req['data']['_id'])

		# Find the record
		oClient = Client.get(req['data']['_id'])
		if not oClient:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'client'])

		# Remove fields that can't be changed
		for f in ['_id', '_created', '_updated', '_archived']:
			if f in req['data']:
				del req['data'][f]

		# If any of the following are passed
		bCheckClientAdmin = False
		for f in ['rate', 'task_minimum', 'task_overflow']:
			if f in req['data']:
				bCheckClientAdmin = True
				break

		# Check the user has full rights if necessary
		if bCheckClientAdmin:
			Rights.verify_or_raise(req['session']['user_id'], 'client', Rights.UPDATE)

		# Update each field, keeping track of errors
		lErrors = []
		for f in req['data']:
			try: oClient[f] = req['data'][f]
			except ValueError as e: lErrors.extend(e.args[0])

		# If there's any errors
		if lErrors:
			return Services.Error(body.errors.DATA_FIELDS, lErrors)

		# Save the record and return the result
		return Services.Response(
			oClient.save()
		)

	def client_owes_read(self, req):
		"""Client Owes

		Fetches the total invoices and payments and returns the value remaining

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Get the signed in user
		dUser = User.cache_get(req['session']['user_id'])
		if not dUser:
			return Services.Error(body.errors.DB_NO_RECORD, [req['session']['user_id'], 'user'])

		# If it's not a client
		if dUser['type'] != 'client' or dUser['access'] == None:
			return Services.Error(body.errors.RIGHTS)

		# Get the total for all invoices
		deInvoices = Decimal(Invoice.total(dUser['access']))

		# Get the total for all payments
		dePayments = Decimal(Payment.total(dUser['access']))

		# Return the difference
		return Services.Response(
			deInvoices - dePayments
		)

	def clients_read(self, req):
		"""Clients read

		Fetches and returns data on all clients

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], ['accounting', 'manager'])

		# Fetch and return the clients
		return Services.Response(
			Client.get(raw=True, orderby='name')
		)

	def client_works_read(self, req):
		"""Client Works read

		Returns the total time elapsed group by tasks for a specific timeframe,
		for a specific client

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure we have all necessary data
		try: DictHelper.eval(req['data'], ['start', 'end'])
		except ValueError as e: return Services.Error(body.errors.DATA_FIELDS, [(f, 'missing') for f in e.args])

		# Get the signed in user
		dUser = User.cache_get(req['session']['user_id'])
		if not dUser:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['user_id'], 'user'])

		# Check type
		if dUser['type'] not in ['admin', 'client', 'manager']:
			return Services.Error(body.errors.RIGHTS)

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
		lWorks = Work.range_grouped(req['data']['start'], req['data']['end'], lClients)

		# Return the records
		return Services.Response(lWorks)

	def company_read(self, req):
		"""Company read

		Fetches and returns data on an existing company

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Fetch the record
		dCompany = Company.get(raw=True, limit=1)
		if not dCompany:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'company'])

		# Return the record data
		return Services.Response(dCompany)

	def company_update(self, req):
		"""Company update

		Updates an existing company

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'admin')

		# Make sure the ID is passed
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Find the record
		oCompany = Company.get(req['data']['_id'])
		if not oCompany:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'company'])

		# Remove fields that can't be changed
		for f in ['_id', '_created', '_updated']:
			if f in req['data']:
				del req['data'][f]

		# Update each field, keeping track of errors
		lErrors = []
		for f in req['data']:
			try: oCompany[f] = req['data'][f]
			except ValueError as e: lErrors.extend(e.args[0])

		# If there's any errors
		if lErrors:
			return Services.Error(body.errors.DATA_FIELDS, lErrors)

		# Save the record and return the result
		return Services.Response(
			oCompany.save()
		)

	def invoice_create(self, req):
		"""Invoice create

		Handles creating a new invoice

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Verify the minimum fields
		try: DictHelper.eval(req['data'], ['client', 'start', 'end'])
		except ValueError as e: return Services.Error(body.errors.DATA_FIELDS, [[f, 'missing'] for f in e.args])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'accounting', req['data']['client'])

		# Generate the invoice data
		dInvoice = self._generate_invoice(
			[ req['data']['start'], req['data']['end'] ],
			req['data']['client'],
			'additional' in req['data'] and req['data']['additional'] or []
		)

		# If we have any additional lines
		lAdditionals = None
		if 'additional' in dInvoice:

			# Pop off the data
			lAdditionals = dInvoice.pop('additional')

			# Init the list of instances
			lAddRecords = []

			# Go through each additional
			for d in lAdditionals:

				# Add an empty invoice ID to the additional
				d['invoice'] = body.constants.EMPTY_UUID

				# Create an instance of the invoice additional to check for
				#	problems
				try:
					lAddRecords.append(InvoiceAdditional(d))
				except ValueError as e:
					return Services.Error(body.errors.DATA_FIELDS, [['additional.%s' % l[0], l[1]] for l in e.args[0]])

		# Add the identifier
		dInvoice['identifier'] = StrHelper.random(6, 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789', False)

		# Pop off the projects
		lProjects = dInvoice.pop('items')

		# Create an instance of the invoice to check for problems
		try:
			oInvoice = Invoice(dInvoice)
		except ValueError as e:
			return Services.Error(body.errors.DATA_FIELDS, e.args[0])

		# Create the invoice and store the ID
		while True:
			try:
				sID = oInvoice.create()
				break
			except DuplicateException:
				oInvoice['identifier'] = StrHelper.random(6, 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789', False)

		# Go through each project
		for d in lProjects:

			# Create an instance of the invoice item to check for problems
			try:
				oItem = InvoiceItem({
					'invoice': sID,
					'project': d['_id'],
					'minutes': d['minutes'],
					'amount': d['amount']
				})
			except ValueError as e:
				return Services.Error(body.errors.DATA_FIELDS, e.args[0])

			# Create the item
			oItem.create()

		# If we have any additionals, go through each one, set the invoice ID,
		#	then create the record
		if lAddRecords:
			for o in lAddRecords:
				o['invoice'] = sID
				o.create()

		# Generate the PDF
		mWarning = self._generate_invoice_pdf(sID)

		# Return the new invoice as raw data
		return Services.Response(
			oInvoice.record(),
			warning=mWarning
		)

	def invoice_delete(self, req):
		"""Invoice delete

		Deletes an existing invoice

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# If the ID isn't passed
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Find the invoice
		oInvoice = Invoice.get(req['data']['_id'])
		if not oInvoice:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'invoice'])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'accounting', req['data']['client'])

		# Delete the items
		InvoiceItem.delete_get(req['data']['_id'], 'invoice')

		# Delete the invoice and return the result
		return Services.Response(
			oInvoice.delete()
		)

	def invoice_read(self, req):
		"""Invoice read

		Fetches and returns data on an existing invoice

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# If the ID is missing
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Find the invoice
		dInvoice = Invoice.get(req['data']['_id'], raw=True)
		if not dInvoice:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'invoice'])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], ['client', 'accounting'], dInvoice['client'])

		# Find all the items associated and add them to the invoice
		dInvoice['items'] = InvoiceItem.by_invoice(req['data']['_id'])

		# Find all the additional lines associated and add them to the invoice
		dInvoice['additional'] = InvoiceAdditional.filter({
			'invoice': req['data']['_id']
		}, raw=['_id', 'text', 'type', 'amount'])

		# Generate the total
		dInvoice['minutes'] = 0
		for d in dInvoice['items']:
			dInvoice['minutes'] += d['minutes']

		# If we need details
		if 'details' in req['data'] and req['data']['details']:

			# Add the details section to the invoice
			dInvoice['details'] = {

				# Fetch the client
				"client": Client.get(dInvoice['client'], raw=True),

				# Fetch the company
				"company": Company.get(raw=True, limit=1)
			}

		# Return the invoice
		return Services.Response(dInvoice)

	def invoice_pdf_read(self, req):
		"""Invoice PDF read

		Returns the temporary URL for an invoices PDF

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# If the ID is missing
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Find the invoice
		dInvoice = Invoice.get(req['data']['_id'], raw=True)
		if not dInvoice:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'invoice'])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], ['client', 'accounting'], dInvoice['client'])

		# Generate the temporary URL
		sURL = self.s3.presigned_url(
			_INVOICE_S3_KEY % {
				'client': dInvoice['client'],
				'invoice': req['data']['_id']
			},
			self._s3_expires
		)

		# Return the URL
		return Services.Response(sURL)

	def invoice_preview_read(self, req):
		"""Invoice Preview read

		Generates the data used to create an invoice and returns it

		Arguments
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Verify the minimum fields
		try: DictHelper.eval(req['data'], ['client', 'start', 'end'])
		except ValueError as e: return Services.Error(body.errors.DATA_FIELDS, [[f, 'missing'] for f in e.args])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'accounting', req['data']['client'])

		# Generate the invoice data
		dInvoice = self._generate_invoice(
			[ req['data']['start'], req['data']['end'] ],
			req['data']['client'],
			'additional' in req['data'] and req['data']['additional'] or []
		)

		# Get all the project names if there's any items
		if dInvoice['items']:
			dProjects = {
				dProj['_id']:dProj['name'] for dProj in Project.get([
					d['_id'] for d in dInvoice['items']
				], raw=['_id', 'name'])
			}

		# Add the identifier
		dInvoice['identifier'] = StrHelper.random(6, 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789', False)

		# Add a created date
		dInvoice['_created'] = int(arrow.get().timestamp())

		# Convert the decimals to strings
		dInvoice['subtotal'] = str(dInvoice['subtotal'])
		dInvoice['total'] = str(dInvoice['total'])
		dInvoice['minutes'] = 0
		for d in dInvoice['taxes']:
			d['amount'] = str(d['amount'])
		for d in dInvoice['items']:
			d['amount'] = str(d['amount'])
			d['projectName'] = dProjects[d['_id']]
			dInvoice['minutes'] += d['minutes']

		# Add the details section to the invoice
		dInvoice['details'] = {

			# Fetch the client
			'client': Client.get(req['data']['client'], raw=True),

			# Fetch the company
			'company': Company.get(raw=True, limit=1)
		}

		# Return the invoice data
		return Services.Response(dInvoice)

	def invoices_read(self, req):
		"""Invoices read

		Fetches and returns data on all invoices

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Get the signed in user
		dUser = User.cache_get(req['session']['user_id'])
		if not dUser:
			return Services.Error(body.errors.DB_NO_RECORD, [req['session']['user_id'], 'user'])

		# If a specific task is passed
		if 'client' in req['data']:

			# Check rights
			Rights.verify_or_raise(dUser, ['accounting', 'client'], req['data']['client'])

			# Set the filter
			lClients = req['data']['client']

		# Else
		else:

			# Check type
			if dUser['type'] not in ['admin', 'accounting', 'client']:
				return Services.Error(body.errors.RIGHTS)

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
		if 'range' in req['data'] and isinstance(req['data']['range'], list):

			# Get all invoices in the given timeframe
			lInvoices = Invoice.range(req['data']['range'], lClients)

		# Else
		else:

			# Just get by client
			lInvoices = Invoice.by_client(lClients)

		# Return the records
		return Services.Response(lInvoices)

	def payment_create(self, req):
		"""Payment create

		Handles creating a new payment

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure the client was passed
		if 'client' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['client', 'missing']])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'accounting', req['data']['client'])

		# Create an instance to verify the fields
		try:
			oPayment = Payment(req['data'])
		except ValueError as e:
			return Services.Error(body.errors.DATA_FIELDS, e.args[0])

		# Create the record
		try:
			sID = oPayment.create()
		except DuplicateException as e:
			return Services.Error(body.errors.DB_DUPLICATE)

		# Return the new ID
		return Services.Response(sID)

	def payments_read(self, req):
		"""Payments read

		Fetches and returns data on all invoices

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Get the signed in user
		dUser = User.cache_get(req['session']['user_id'])
		if not dUser:
			return Services.Error(body.errors.DB_NO_RECORD, [req['session']['user_id'], 'user'])

		# If a specific task is passed
		if 'client' in req['data']:

			# Check rights
			Rights.verify_or_raise(dUser, ['accounting', 'client'], req['data']['client'])

			# Set the filter
			lClients = req['data']['client']

		# Else
		else:

			# Check type
			if dUser['type'] not in ['admin', 'accounting', 'client']:
				return Services.Error(body.errors.RIGHTS)

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
		if 'range' in req['data'] and isinstance(req['data']['range'], list):

			# Get all invoices in the given timeframe
			lPayments = Payment.range(req['data']['range'], lClients)

		# Else
		else:

			# Just get by client
			lPayments = Payment.by_client(lClients)

		# Return the records
		return Services.Response(lPayments)

	def project_create(self, req):
		"""Project create

		Handles creating a new project

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure the client was passed
		if 'client' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['client', 'missing']])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'manager', req['data']['client'])

		# Create an instance to verify the fields
		try:
			oProject = Project(req['data'])
		except ValueError as e:
			return Services.Error(body.errors.DATA_FIELDS, e.args[0])

		# Create the record and check for a duplicate name
		try:
			sID = oProject.create()
		except DuplicateException:
			return Services.Error(body.errors.DB_DUPLICATE)

		# Return the new ID
		return Services.Response(sID)

	def project_delete(self, req):
		"""Project delete

		Deletes (archives) an existing project

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Find the record
		oProject = Project.get(req['data']['_id'])
		if not oProject:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'project'])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'manager', oProject['client'])

		# Mark the project as archived
		oProject['_archived'] = True

		# Save the project and return the result
		return Services.Response(
			oProject.save()
		)

	def project_read(self, req):
		"""Project read

		Fetches and returns data on an existing project

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Fetch the record
		dProject = Project.get(req['data']['_id'], raw=True)
		if not dProject:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'project'])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], None, dProject['client'])

		# Return the record data
		return Services.Response(dProject)

	def project_update(self, req):
		"""Project update

		Updates an existing project

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Find the record
		oProject = Project.get(req['data']['_id'])
		if not oProject:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'project'])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'manager', )

		# Remove fields that can't be changed
		for f in ['_id', '_created', '_updated', '_archived', 'client']:
			if f in req['data']:
				del req['data'][f]

		# Update each field, keeping track of errors
		lErrors = []
		for f in req['data']:
			try: oProject[f] = req['data'][f]
			except ValueError as e: lErrors.extend(e.args[0])

		# If there's any errors
		if lErrors:
			return Services.Error(body.errors.DATA_FIELDS, lErrors)

		# Save the record and return the result
		return Services.Response(
			oProject.save()
		)

	def projects_read(self, req):
		"""Projects read

		Fetches and returns data on all projects in a given client

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# If the client ID isn't passed
		if 'client' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['client', 'missing']])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], None, req['data']['client'])

		# Fetch and return the projects
		return Services.Response(
			Project.filter(
				{"client": req['data']['client']},
				raw=True,
				orderby='name'
			)
		)

	def signin_create(self, req):
		"""Signin

		Signs a user into the system

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Result
		"""

		# Verify the minimum fields
		try: DictHelper.eval(req['data'], ['email', 'passwd'])
		except ValueError as e: return Services.Error(body.errors.DATA_FIELDS, [[f, 'missing'] for f in e.args])

		# Make sure the email is lowercase
		req['data']['email'] = req['data']['email'].lower()

		# Look for the user by email
		oUser = User.filter({'email': req['data']['email']}, limit=1)
		if not oUser:
			return Services.Error(errors.INVALID_CREDENTIALS)

		# Validate the password
		if not oUser.password_validate(req['data']['passwd']):
			return Services.Error(errors.INVALID_CREDENTIALS)

		# Create a new session, store the user id, and save it
		oSession = Session.create()
		oSession['user_id'] = oUser['_id']
		oSession.save()

		# Return the session ID
		return Services.Response(oSession.id())

	def signout_create(self, req):
		"""Signout

		Called to sign out a user and destroy their session

		Arguments:
			data (dict): Data sent with the request
			sesh (Session._Session): The session associated with the user

		Returns:
			Services.Response
		"""

		# Close the session so it can no longer be found/used
		req['session'].close()

		# Return OK
		return Services.Response(True)

	def task_create(self, req):
		"""Task create

		Handles creating a new task

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure the client was passed
		if 'project' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['project', 'missing']])

		# Fetch the project
		dProject = Project.get(req['data']['project'], raw=['client'])
		if not dProject:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['project'], 'project'])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], ['manager', 'worker'], dProject['client'])

		# Create an instance to verify the fields
		try:
			oTask = Task(req['data'])
		except ValueError as e:
			return Services.Error(body.errors.DATA_FIELDS, e.args[0])

		# Create the record and check for a duplicate name
		try:
			sID = oTask.create()
		except DuplicateException:
			return Services.Error(body.errors.DB_DUPLICATE)

		# Return the new ID
		return Services.Response(sID)

	def task_delete(self, req):
		"""Task delete

		Deletes (archives) an existing task

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Find the record
		oTask = Task.get(req['data']['_id'])
		if not oTask:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'task'])

		# Find the associated project
		dProject = Project.get(oTask['project'], raw=['client'])
		if not dProject:
			return Services.Error(body.errors.DB_NO_RECORD, [oTask['project'], 'project'])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'manager', dProject['client'])

		# Mark the task as archived
		oTask['_archived'] = True

		# Save the task and return the result
		return Services.Response(
			oTask.save()
		)

	def task_read(self, req):
		"""Task read

		Fetches and returns data on an existing task

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Fetch the record
		dTask = Task.get(req['data']['_id'], raw=True)
		if not dTask:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'task'])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], None, dTask['client'])

		# Return the record data
		return Services.Response(dTask)

	def task_update(self, req):
		"""Task update

		Updates an existing task

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure the ID is passed
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Find the record
		oTask = Task.get(req['data']['_id'])
		if not oTask:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'task'])

		# Find the project
		dProject = Project.get(oTask['project'], raw=['client'])
		if not dProject:
			return Services.Error(body.errors.DB_NO_RECORD, [oTask['project'], 'project'])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'manager', dProject['client'])

		# Remove fields that can't be changed
		for f in ['_id', '_created', '_updated', '_archived', 'client']:
			if f in req['data']:
				del req['data'][f]

		# Update each field, keeping track of errors
		lErrors = []
		for f in req['data']:
			try: oTask[f] = req['data'][f]
			except ValueError as e: lErrors.extend(e.args[0])

		# If there's any errors
		if lErrors:
			return Services.Error(body.errors.DATA_FIELDS, lErrors)

		# Save the record and return the result
		try:
			return Services.Response(oTask.save())

		# Name is a duplicate
		except DuplicateException:
			return Services.Error(body.errors.DB_DUPLICATE)

	def tasks_read(self, req):
		"""Tasks read

		Fetches and returns data on all tasks in a given client

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# If the project ID isn't passed
		if 'project' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['project', 'missing']])

		# Find the project
		dProject = Project.get(req['data']['project'], raw=['client'])
		if not dProject:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['project'], 'project'])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], ['admin', 'manager', 'worker'], dProject['client'])

		# Filter
		dFilter = {
			"project": req['data']['project']
		}

		# If we don't want archived
		if 'include_arvchived' not in req['data'] or not req['data']['include_archived']:
			dFilter['_archived'] = False

		# Fetch and return the projects
		return Services.Response(
			Task.filter(
				dFilter,
				raw=True,
				orderby='name'
			)
		)

	def user_create(self, req):
		"""User create

		Handles creating a new user

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'manager')

		# Check we have a verification url
		if 'url' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['url', 'missing']])

		# Make sure the URL has the {key} and {locale} fields
		if '{key}' not in req['data']['url']:
			return Services.Error(body.errors.DATA_FIELDS, [['url', 'missing {key}']])

		# Pop off the URL
		sURL = req['data'].pop('url')

		# Convert the email to lowercase
		if 'email' in req['data']:
			req['data']['email'] = req['data']['email'].lower()

		# If the locale is missing
		if 'locale' not in req['data']:
			req['data']['locale'] = 'en-US'

		# Add the blank password
		req['data']['passwd'] = '000000000000000000000000000000000000000000000000000000000000000000000000'

		# Set not verified
		req['data']['verified'] = False

		# Create an instance to verify the fields
		try:
			oUser = User(req['data'])
		except ValueError as e:
			return Services.Error(body.errors.DATA_FIELDS, e.args[0])

		# Create the record and check for a duplicate email
		try:
			sID = oUser.create()
		except DuplicateException:
			return Services.Error(body.errors.DB_DUPLICATE)

		# Create key
		sKey = self._create_key(sID, 'setup')

		# Fetch the company name
		dCompany = Company.get(raw=True, limit=1)

		# Create the setup template data
		dTpl = {
			'company_name': dCompany['name'],
			'url': sURL.replace('{key}', sKey),
			'user_name': req['data']['name'],
		}

		# Generate the templates
		dTpls = {
			'subject': Templates.generate('email/subject/setup', dTpl, req['data']['locale']),
			'text': Templates.generate('email/text/setup', dTpl, req['data']['locale']),
			'html': Templates.generate('email/html/setup', dTpl, req['data']['locale'])
		}

		# Send the email
		bRes = EMail.send({
			'to': oUser['email'],
			'from': Conf.get(('email', 'from')),
			'subject': dTpls['subject'],
			'text': dTpls['text'],
			'html': dTpls['html']
		})
		if not bRes:
			print('Failed to send email: %s' % EMail.last_error)

		# Return the new ID
		return Services.Response(sID)

	def user_delete(self, req):
		"""User delete

		Deletes (archives) an existing user

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'manager')

		# Make sure the ID is passed
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Find the user
		oUser = User.get(req['data']['_id'])
		if not oUser:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'user'])

		# Mark the user as archived
		oUser['_archived'] = True

		# Save the user and return the result
		return Services.Response(
			oUser.save()
		)

	def user_read(self, req):
		"""User read

		Fetches and returns data on an existing user

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# If the ID is passed
		try:

			# And the user is not the logged in user
			if req['data']['_id'] != req['session']['user_id']:

				# Check rights
				Rights.verify_or_raise(req['session']['user_id'], 'manager')

		# Else, just lookup the logged in user
		except KeyError as e:
			req['data'] = { '_id': req['session']['user_id'] }

		# Fetch from the cache
		dUser = User.cache_get(req['data']['_id'])
		if not dUser:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['id'], 'user'])

		# Return the record data
		return Services.Response(dUser)

	def user_update(self, req):
		"""User update

		Updates an existing user

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# If the ID is passed
		if '_id' in req['data']:

			# If it doesn't match the session
			if req['data']['_id'] != req['session']['user_id']:

				# Check rights
				Rights.verify_or_raise(req['session']['user_id'], 'manager')

		# Else, assume session user
		else:
			req['data']['_id'] = req['session']['user_id']

		# Find the record
		oUser = User.get(req['data']['_id'])
		if not oUser:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'user'])

		# Don't send the verification email unless the email has changed
		bSendVerify = False

		# If the email is changed
		if 'email' in req['data'] and req['data']['email'] != oUser['email']:

			# Make sure the url was passed
			if 'url' not in req['data']:
				return Services.Error(body.errors.DATA_FIELDS, [['url', 'missing']])

			# Flag that we need to send the verification email
			bSendVerify = True

			# Mark the user as no longer verified
			req['data']['verified'] = False

		# Pop off the url if we have it or not
		try: sURL = req['data'].pop('url')
		except KeyError: sURL = None

		# Remove fields that can't be changed
		for f in ['_id', '_created', '_updated']:
			if f in req['data']:
				del req['data'][f]

		# Update each field, keeping track of errors
		lErrors = []
		for f in req['data']:
			try: oUser[f] = req['data'][f]
			except ValueError as e: lErrors.extend(e.args[0])

		# If there's any errors
		if lErrors:
			return Services.Error(body.errors.DATA_FIELDS, lErrors)

		# Save the user info
		bRes = oUser.save()

		# If send the verify email
		if bSendVerify:

			# Create key
			sKey = self._create_key(oUser['_id'], 'verify')

			# Create the verify template data
			dTpl = {
				"url": sURL \
						.replace('{locale}', oUser['locale']) \
						.replace('{key}', sKey)
			}

			# Generate the templates
			dTpls = {
				'subject': Templates.generate('email/subject/email_change', dTpl, oUser['locale']),
				'text': Templates.generate('email/text/email_change', dTpl, oUser['locale']),
				'html': Templates.generate('email/html/email_change', dTpl, oUser['locale'])
			}

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
			User.clear(oUser['_id'])

		# Return the result
		return Services.Response(bRes)

	def user_passwd_update(self, req):
		"""User Password update

		Changes the password associated with a user

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# If the ID is passed
		if '_id' in req['data']:

			# If it doesn't match the session
			if req['data']['_id'] != req['session']['user_id']:

				# Check rights
				Rights.verify_or_raise(req['session']['user_id'], 'manager')

		# Else, assume session user
		else:

			# If the old password is missing
			if 'passwd' not in req['data']:
				return Services.Error(body.errors.DATA_FIELDS, [['passwd', 'missing']])

			# Store the session as the user ID
			req['data']['_id'] = req['session']['user_id']

		# Find the record
		oUser = User.get(req['data']['_id'])
		if not oUser:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'user'])

		# If we have an old password
		if 'passwd' in req['data']:

			# Validate it
			if not oUser.password_validate(req['data']['passwd']):
				return Services.Error(body.errors.DATA_FIELDS, [['passwd', 'invalid']])

		# Make sure the new password is strong enough
		if not User.password_strength(req['data']['new_passwd']):
			return Services.Error(errors.PASSWORD_STRENGTH)

		# Set the new password and save
		oUser['passwd'] = User.password_hash(req['data']['new_passwd'])
		oUser.save()

		# Return OK
		return Services.Response(True)

	def user_access_create(self, req):
		"""User Access create

		Adds a client access to an existing user

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure we have all necessary data
		try: DictHelper.eval(req['data'], ['client', 'user'])
		except ValueError as e: return Services.Error(body.errors.DATA_FIELDS, [(f, 'missing') for f in e.args])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'manager', req['data']['client'])

		# Make sure the client exists
		if not Client.exists(req['data']['client']):
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['client'], 'client'])

		# Make sure the user exists
		if not User.exists(req['data']['user']):
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['user'], 'user'])

		# Add the access
		oAccess = Access({
			"user": req['data']['user'],
			"client": req['data']['client']
		})
		oAccess.create(conflict='ignore')

		# Clear the user from the cache
		User.clear(req['data']['user'])

		# Return OK
		return Services.Response(True)

	def user_access_delete(self, req):
		"""User Access delete

		Removes a client access from an existing user

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# If an ID was passed
		if '_id' in req['data']:

			# Find the access
			oAccess = Access.get(req['data']['_id'])
			if not oAccess:
				return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'access'])

			# Check rights
			Rights.verify_or_raise(req['session']['user_id'], 'manager', oAccess['client'])

			# Delete the access
			oAccess.delete()

			# Clear the user from the cache
			User.clear(oAccess['user'])

		# Else, if we have a client and user
		elif 'client' in req['data'] and 'user' in req['data']:

			# Check rights
			Rights.verify_or_raise(req['session']['user_id'], 'manager', req['data']['client'])

			# Find the record
			oAccess = Access.filter({
				"user": req['data']['user'],
				"client": req['data']['client']
			}, limit=1)

			# If it exists
			if oAccess:

				# Delete it
				oAccess.delete()

				# Clear the user from the cache
				User.clear(req['data']['user'])

		# Return OK
		return Services.Response(True)

	def user_access_read(self, req):
		"""User Access read

		Fetches the client access for the given user

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'manager')

		# If we got no ID
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, [['_id', 'missing']])

		# Fetch and return the permissions
		return Services.Response(
			Access.filter({"user": req['data']['_id']}, raw=True)
		)

	def users_read(self, req):
		"""Users read

		Returns all the users in the system

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'manager')

		# Fetch all the users and return them
		return Services.Response(
			User.get(
				raw=['_id', '_archived', 'email', 'type', 'name', 'locale', 'verified'],
				orderby='email'
			)
		)

	def work_start_create(self, req):
		"""Work Start

		Handles starting new work, which just stores the start timestamp

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure we have all necessary data
		try: DictHelper.eval(req['data'], ['project', 'task'])
		except ValueError as e: return Services.Error(body.errors.DATA_FIELDS, [(f, 'missing') for f in e.args])

		# Find the project
		dProject = Project.get(req['data']['project'], raw=['client'])
		if not dProject:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['project'], 'project'])

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'worker', dProject['client'])

		# Find the task
		dTask = Task.get(req['data']['task'])
		if not dTask:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['task'], 'task'])

		# If we have an existing open work record
		if Work.open(req['session']['user_id']):
			return Services.Error(errors.TASK_ALREADY_STARTED)

		# Create an instance to verify the fields
		try:
			oWork = Work({
				'project': req['data']['project'],
				'task': req['data']['task'],
				'user': req['session']['user_id'],
				'start': int(time()),
				'description': ('description' in req['data'] and req['data']['description'] or '')
			})
		except ValueError as e:
			return Services.Error(body.errors.DATA_FIELDS, e.args[0])

		# Create the record and check for a duplicate name
		try:
			sID = oWork.create()
		except DuplicateException:
			return Services.Error(body.errors.DB_DUPLICATE)

		# Return the new ID and start time
		return Services.Response({
			'_id': sID,
			'start': oWork['start']
		})

	def work_end_update(self, req):
		"""Work End

		Handles ending an existing work record

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# If the ID is missing
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, ['_id', 'missing'])

		# Find the record
		oWork = Work.get(req['data']['_id'])
		if not oWork:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'work'])

		# If the user doesn't match the person who started the work
		if req['session']['user_id'] != oWork['user']:
			return Services.Error(body.errors.RIGHTS)

		# If the description was passed
		if 'description' in req['data']:
			oWork['description'] = req['data']['description']

		# Set the end time
		oWork['end'] = int(time())

		# Save the work
		if not oWork.save():
			return Services.Response(False)

		# Return the end time
		return Services.Response(oWork['end'])

	def work_delete(self, req):
		"""Work delete

		Deletes an existing work record

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'manager')

		# If the ID is missing
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, ['_id', 'missing'])

		# Find the record
		oWork = Work.get(req['data']['_id'])
		if not oWork:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'work'])

		# Delete the record and return the result
		return Services.Response(
			oWork.delete()
		)

	def work_update(self, req):
		"""Work update

		Updates the timestamps for an existing work record

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Check rights
		Rights.verify_or_raise(req['session']['user_id'], 'manager')

		# If the ID is missing
		if '_id' not in req['data']:
			return Services.Error(body.errors.DATA_FIELDS, ['_id', 'missing'])

		# Find the record
		oWork = Work.get(req['data']['_id'])
		if not oWork:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['_id'], 'work'])

		# Delete everything that can't be updated
		for k in ['_id', '_created', '_updated', 'user', 'project', 'task']:
			try: del req['data'][k]
			except KeyError: pass

		# If there's nothing left
		if not req['data']:
			return Services.Response(False)

		# Update what's left
		lErrors = []
		for k in req['data']:
			try: oWork[k] = req['data'][k]
			except ValueError as e: lErrors.append(e.args[0])
		if lErrors:
			return Services.Error(body.errors.DATA_FIELDS, lErrors)

		# Save the record and return the result
		return Services.Response(
			oWork.save()
		)

	def works_read(self, req):
		"""Works read

		Fetches and returns data on work for a specific client in a range

		Arguments:
			req (dict): The request details, which can include 'data',
						'environment', and 'session'

		Returns:
			Services.Response
		"""

		# Make sure we have all necessary data
		try: DictHelper.eval(req['data'], ['start', 'end'])
		except ValueError as e: return Services.Error(body.errors.DATA_FIELDS, [(f, 'missing') for f in e.args])

		# Get the signed in user
		dUser = User.cache_get(req['session']['user_id'])
		if not dUser:
			return Services.Error(body.errors.DB_NO_RECORD, [req['data']['user_id'], 'user'])

		# If a specific work is passed
		if 'client' in req['data']:

			# Check rights
			Rights.verify_or_raise(dUser, ['client', 'manager'], req['data']['client'])

			# Set the filter
			lClients = req['data']['client']

		# Else
		else:

			# Check type
			if dUser['type'] not in ['admin', 'client', 'manager']:
				return Services.Error(body.errors.RIGHTS)

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
		lWorks = Work.range(req['data']['start'], req['data']['end'], lClients)

		# Go through each record and calculate the elpased seconds
		for d in lWorks:
			d['elapsed'] = d['end'] - d['start']

		# Return the records
		return Services.Response(lWorks)