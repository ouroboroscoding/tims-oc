# coding=utf8
""" Primary Service

Handles all tims requests
"""

__author__		= "Chris Nasr"
__copyright__	= "OuroborosCoding"
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "chris@fuelforthefire.ca"
__created__		= "2021-04-06"

# Python imports
from time import time

# Pip imports
from RestOC import Conf, DictHelper, Errors, Services, Sesh, StrHelper
from RestOC.Record_MySQL import DuplicateException

# Record imports
from records import Client, Company, Invoice, InvoiceItem, Key, Permission, \
					Project, Task, User

# Shared imports
from shared import Rights

class Primary(Services.Service):
	"""Primary Service class

	Service for main tasks
	"""

	_install = [
		Client, Company, Invoice, InvoiceItem, Key, Permission, Project, Task, \
		User
	]
	"""Record types called in install"""

	def initialise(self):
		"""Initialise

		Initialises the instance and returns itself for chaining

		Returns:
			User
		"""

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
		Rights.verifyOrRaise(sesh, 'client', ERights.CREATE)

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
		Rights.verifyOrRaise(sesh, 'client', ERights.DELETE)

		# Make sure the ID is passed
		if '_id' not in data:
			return Services.Errro(1001, [['_id', 'missing']])

		# Find the client
		oClient = Client.get(data['_id'])
		if not oClient:
			return Services.Error(2003)

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
		Rights.verifyOrRaise(sesh, 'client', ERights.READ, data['_id'])

		# Fetch the record
		dClient = Client.get(data['_id'], raw=True)
		if not dClient:
			return Services.Error(2003)

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
		Rights.verifyOrRaise(sesh, 'client', ERights.UPDATE, data['_id'])

		# Find the record
		oClient = Client.get(data['_id'])
		if not oClient:
			return Services.Error(2003)

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
			Rights.verifyOrRaise(sesh, 'client', ERights.UPDATE)

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

	def clients_read(self, data, sesh):
		"""Clients read

		Fetches and returns data on all clients

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If the user doesn't have the client permission
		if 'perms' not in sesh or 'client' not in sesh['perms']:
			return Services.Error(Rights.INVALID)

		# If the user has full access
		if sesh['perms']['client']['ident'] == None:
			mIDs = None
			dFilter = None

		# Else, if they have only some IDs
		else:
			mIDs = sesh['perms']['client']['ident'].split(',')
			dFilter = {"_archived": False}

		# Fetch and return the clients
		return Services.Response(
			Client.get(mIDs, filter=dFilter, raw=True, orderby=name)
		)

	def company_read(self, data, sesh):
		"""Company read

		Fetches and returns data on an existing company

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
		Rights.verifyOrRaise(sesh, 'company', ERights.READ)

		# Fetch the record
		dCompany = Company.get(data['_id'], raw=True)
		if not dCompany:
			return Services.Error(2003)

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

		# Make sure the ID is passed
		if '_id' not in data:
			return Services.Errro(1001, [['_id', 'missing']])

		# Check rights
		Rights.verifyOrRaise(sesh, 'company', ERights.UPDATE)

		# Find the record
		oCompany = Company.get(data['_id'])
		if not oCompany:
			return Services.Error(2003)

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
		pass

	def invoice_delete(self, data, sesh):
		"""Invoice delete

		Deletes an existing invoice

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""
		pass

	def invoice_read(self, data, sesh):
		"""Invoice read

		Fetches and returns data on an existing invoice

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""
		pass

	def invoice_update(self, data, sesh):
		"""Invoice update

		Updates an existing invoice

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""
		pass

	def invoices_read(self, data, sesh):
		"""Invoices read

		Fetches and returns data on all invoices

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""
		pass

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
		Rights.verifyOrRaise(sesh, 'project', ERights.CREATE, data['client'])

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
			return Services.Error(2003)

		# Check rights
		Rights.verifyOrRaise(sesh, 'project', ERights.DELETE, oProject['client'])

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
			return Services.Error(2003)

		# Check rights
		Rights.verifyOrRaise(sesh, 'project', ERights.READ, dProject['client'])

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
			return Services.Error(2003)

		# Check rights
		Rights.verifyOrRaise(sesh, 'project', ERights.UPDATE, dProject['client'])

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

		Fetches and returns data on all projects

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If the user doesn't have the project permission
		if 'perms' not in sesh or 'project' not in sesh['perms']:
			return Services.Error(Rights.INVALID)

		# If the user has full access
		if sesh['perms']['project']['ident'] == None:
			mIDs = None

		# Else, if they have only some IDs
		else:
			mIDs = sesh['perms']['project']['ident'].split(',')
			dFilter = {
				"clients": mIDs,
				"_archived": False
			}

		# Fetch all the client IDs and names and make a hash of them
		dClients = {
			d['_id']:d['name']
			for d in Client.get(mIDs, raw=['_id', 'name'])
		}

		# If we want all projects
		if not mIDs:
			lProjects = Project.get(raw=True, orderby='name')

		# Else, just fetch those in the given clients
		else:
			lProjects = Project.filter(dFilter, raw=True, orderby='name')

		# Go through each project and add the client name
		for d in lProjects:
			d['clientName'] = d['client'] in dClients and dClients[d['client']] or '[client not found]'

		# Return the records
		return Services.Response(lProjects)

	def session_read(self, data, sesh):
		"""Session

		Returns the ID of the user logged into the current session

		Arguments:
			data (dict): Data sent with the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""
		return Services.Response({
			"user": oSesh['user'],
			"perms": oSesh['perms']
		})

	def signin_create(self, data):
		"""Signin

		Signs a user into the system

		Arguments:
			data (dict): The data passed to the request

		Returns:
			Result
		"""

		# Verify fields
		try: DictHelper.eval(data, ['email', 'passwd'])
		except ValueError as e: return Services.Response(error=(1001, [[f, 'missing'] for f in e.args]))

		# Make sure the email is lowercase
		data['email'] = data['email'].lower()

		# Look for the user by alias
		oUser = User.filter({"email": data['email']}, limit=1)
		if not oUser:
			return Services.Response(error=2100)

		# Validate the password
		if not oUser.passwordValidate(data['passwd']):
			return Services.Response(error=2100)

		# Get the permissions associated with the user
		lPermissions = Permission.filter({
			"user": oUser['_id']
		}, raw=['name', 'rights', 'ident'])

		# Create a new session, store user and permission data, and save it
		oSesh = Sesh.create()
		oSesh['user'] = oUser.record(['_id', 'email', 'locale', 'verified'])
		oSesh['perms'] = {
			d['name']:{
				"rights": d['rights'],
				"ident": (d['ident'] and d['ident'].split(',') or None)
			}
			for d in lPermissions
		}
		oSesh.save()

		# Return the session ID and primary user data
		return Services.Response({
			"session": oSesh.id(),
			"user": oSesh['user'],
			"perms": oSesh['perms']
		})

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

	def taskStart_create(self, data, sesh):
		"""Task Start

		Handles starting a new task, which just stores the start timestamp

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure the project was passed
		if 'project' not in data:
			return Services.Error(1001, [['project', 'missing']])

		# Find the project
		dProject = Project.get(data['project'], raw=['client'])
		if not dProject:
			return Services.Error(2003)

		# Check rights
		Rights.verifyOrRaise(sesh, 'task', ERights.CREATE, dProject['client'])

		# Create an instance to verify the fields
		try:
			oTask = Task({
				"project": data['project'],
				"user": sesh['user']['_id'],
				"start": int(time()),
				"description": ('description' in data and data['description'] or '')
			})
		except ValueError as e:
			return Services.Error(1001, e.args[0])

		# Create the record and check for a duplicate name
		try:
			sID = oTask.create()
		except DuplicateException:
			return Services.Error(2004)

		# Return the new ID and start time
		return Services.Response({
			"_id": sID,
			"start": oTask['start']
		})

	def taskEnd_update(self, data, sesh):
		"""Task End

		Handles ending an existing task

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If the ID is missing
		if '_id' not in data:
			return Services.Error(1001, ['_id', 'missing'])

		# Find the task
		oTask = Task.get(data['_id'])
		if not oTask:
			return Services.Error(2003)

		# If the user doesn't match the person who started the task
		if sesh['user']['_id'] != oTask['user']:
			return Services.Error(Rights.INVALID)

		# If the description was passed
		if 'description' in data:
			oTask['description'] = data['description']

		# Set the end time
		oTask['end'] = int(time())

		# Save the task
		if not oTask.save():
			return Services.Response(False)

		# Return the end time
		return Services.Response(oTask['end'])

	def task_delete(self, data, sesh):
		"""Task delete

		Deletes an existing task

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# If the ID is missing
		if '_id' not in data:
			return Services.Error(1001, ['_id', 'missing'])

		# Find the task
		oTask = Task.get(data['_id'])
		if not oTask:
			return Services.Error(2003)

		# Check rights
		Rights.verifyOrRaise(sesh, 'task', Rights.DELETE, oTask['project'])

		# Delete the task and return the result
		return Services.Response(
			oTask.delete()
		)

	def tasks_read(self, data, sesh):
		"""Tasks read

		Fetches and returns data on tasks for a specific client in a range

		Arguments:
			data (dict): The data passed to the request
			sesh (Sesh._Session): The session associated with the request

		Returns:
			Services.Response
		"""

		# Make sure we have all necessary data
		try: DictHelper.eval(data, ['client', 'start', 'end'])
		except ValueError as e: return Services.Response(error=(1001, [(f, 'missing') for f in e.args]))

		# Check rights
		Rights.verifyOrRaise(sesh, 'task', Rights.DELETE, data['client'])

		# Get all tasks that end in the given timeframe
		lTasks = Task.getByClient(data['client'], data['start'], data['end'])

		# Return the records
		return Services.Response(lProjects)

	def verify_update(self, data):
		"""Verify

		Takes the key and the email and makrs the user as verified

		Arguments:
			data (dict): Data sent with the request

		Returns:
			Services.Response
		"""

		# Verify minimum fields
		try: DictHelper.eval(data, ['email', 'key'])
		except ValueError as e: return Services.Response(error=(1001, [(f, 'missing') for f in e.args]))

		# Find the user by email
		oUser = User.filter({"email": data['email']}, limit=1)

		# If there's no such user, or the code doesn't match
		if not oUser or oUser['verified'] != data['key']:
			return Services.Error(2101)

		# Update the user to verified
		oUser['verified'] = True
		oUser.save()

		# Return OK
		return Services.Response(True)
