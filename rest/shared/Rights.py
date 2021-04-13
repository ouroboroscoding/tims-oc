# coding=utf8
""" Permission Rights

Defines for Rights types
"""

__author__		= "Chris Nasr"
__copyright__	= "OuroborosCoding"
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "chris@ouroboroscoding.com"
__created__		= "2021-04-07"

# Pip imports
from RestOC import Services

# Record imports
from records import Permission

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

INVALID = 1000
"""REST invalid rights error code"""

__cache = None
"""The Redis cache instance"""

def verify(user, name, right, ident=None):
	"""_Check

	Checks's if the currently signed in user has the requested right on the
	given permission.

	Arguments:
		user (str): The ID of the user
		name (str): The name of the permission to check
		right (uint): The right to check for
		ident (str): Optional identifier to check against

	Returns:
		bool
	"""

	# Fetch the permissions for the user
	dPermissions = Permission.byUser(user)

	# If the permission doesn't exist at all
	if name not in dPermissions:
		return False

	# If the permission exists but doesn't contain the proper right
	if not dPermissions[name]['rights'] & right:
			return False

	# If the permission has idents
	if dPermissions[name]['idents'] is not None:

		# If no ident was passed
		if not ident:
			return False

		# If the ident isn't in the list
		if str(ident) not in dPermissions[name]['idents']:
			return False

	# Seems OK
	return True

def verifyOrRaise(user, name, right, ident=None):
	"""Verify Or Raise

	Calls verify method and if it fails an exception of ResponseException is
	raised. This method is helpful for adding a single line to each request
	by verifing the user and throwing an exception FormatOC.Rest can handle
	and return to the client if the user is invalid

	Arguments:
		user (str): The ID of the user
		name (str): The name of the permission to check
		right (uint): The right to check for
		ident (str): Optional identifier to check against

	Raises:
		ResponseException

	Returns:
		None
	"""

	# Call verify and if it returns false, raise an exception
	if not verify(user, name, right, ident):
		raise Services.ResponseException(error=INVALID)
