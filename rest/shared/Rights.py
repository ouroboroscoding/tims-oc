# coding=utf8
""" User Rights

Defines and methods for checking user rights
"""

__author__		= "Chris Nasr"
__copyright__	= "Ouroboros Coding Inc."
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "chris@ouroboroscoding.com"
__created__		= "2021-04-07"

# Pip imports
import body
from RestOC import Services

# Record imports
from records import User

READ	= 0x01
"""Allowed to read records"""

UPDATE	= 0x02
"""Allowed to update records"""

CREATE	= 0x04
"""Allowed to create records"""

DELETE	= 0x08
"""Allowed to delete records"""

ALL		= 0x0F
"""Allowed to CRUD"""

__cache = None
"""The Redis cache instance"""

def verify(user, type_=None, client=None):
	"""_Check

	Checks's if the currently signed in user has the requested rights based on
	type of user and client access

	Arguments:
		user (str|dict): The ID of the user, or the user itself
		type_ (str): The type of user to check for
		client (str): Optional client ID to check against

	Returns:
		bool
	"""

	# If we got a string, fetch the user from the cache
	if isinstance(user, str):
		dUser = User.cache_get(user)

	# Else, use the user passed
	else:
		dUser = user

	# If the type is set
	if type_ is not None:

		# If the user is an admin
		if dUser['type'] == 'admin':
			return True

		# If we got a list
		if isinstance(type_, (list,tuple)):

			# If the user is not in the list
			if dUser['type'] not in type_:
				return False

		# Else, we most likely got a single value
		else:

			# If the user is not the correct type
			if dUser['type'] != type_:
				return False

	# If the user has limited access
	if dUser['access'] is not None:

		# If no client was passed
		if not client:
			return False

		# If the client isn't in the list
		if client not in dUser['access']:
			return False

	# Else if they should have limited access but don't
	elif dUser['type'] == 'client':
		return False

	# Seems OK
	return True

def verify_or_raise(user, type_=None, client=None):
	"""Verify Or Raise

	Calls verify method and if it fails an exception of ResponseException is
	raised. This method is helpful for adding a single line to each request
	by verifing the user and throwing an exception FormatOC.Rest can handle
	and return to the client if the user is invalid

	Arguments:
		user (str|dict): The ID of the user, or the user itself
		type_ (str): The type of user to check for
		client (str): Optional client ID to check against

	Raises:
		ResponseException

	Returns:
		None
	"""

	# Call verify and if it returns false, raise an exception
	if not verify(user, type_, client):
		raise Services.ResponseException(error=body.errors.RIGHTS)
