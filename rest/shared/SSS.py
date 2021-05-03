# coding=utf8
"""SSS (S3) Module

Various helper functions for using S3
"""

# Import future
from __future__ import print_function, absolute_import

__author__		= "Chris Nasr"
__copyright__	= "OuroborosCoding"
__maintainer__	= "Chris Nasr"
__email__		= "chris@ouroboroscoding.com"
__created__		= "2017-12-05"

# Import python modules
from time import sleep

# Import pip modules
import boto3
import botocore.session
from botocore.client import Config as BotoConfig
from botocore.exceptions import ClientError
from botocore.vendored.requests.packages.urllib3.exceptions import ReadTimeoutError

# Module variables
_c = None
_r = None
_s3 = None

# Module constants
MAX_TIMEOUTS = 5

class SSSException(Exception):
	"""SSSException class

	Used for raising s3 specific exceptions

	Extends:
		Exception
	"""
	pass

# copy method
def copy(source, destination, bucket=None):
	"""Copy

	Copies an object on S3

	Args:
		source: The key of the source image
		destination: The key of the copied image
		bucket: The name of the bucket to upload the key to

	Returns:
		None

	Raises:
		RuntimeError: If init is not called prior to calling upload
		ValueError: If fields are missing
		SSSException: To pass along uncatchable errors
	"""

	# If init wasn't called
	if not _s3:
		raise RuntimeError('SSS.init must be called before SSS.copy')

	# If there's a bucket
	if bucket:
		sBucket = bucket
	elif _s3['bucket']:
		sBucket = _s3['bucket']
	else:
		raise ValueError('Must specify bucket in copy or init')

	# If there's a path, prepend it
	if _s3['path']:
		source = _s3['path'] + source
		destination = _s3['path'] + destination

	# Keep trying if we get timeout errors
	iTimeouts = 0
	while True:

		# Create new object and copy it
		try:
			return _r.Object(sBucket, destination).copy_from(CopySource={
				'Bucket': sBucket,
				'Key': source
			})

		# Check for client Errors
		except ClientError as e:
			raise SSSException(e.args, sBucket, source, destination)

		except ReadTimeoutError as e:
			iTimeouts += 1					# increment the timeout count
			if iTimeouts >= MAX_TIMEOUTS:	# if we've timed out the max times
				raise SSSException('S3 not available', str(e))
			sleep(1)						# else sleep for a second
			continue						# and try again

		except Exception as e:
			raise SSSException('Unknown S3 exception', str(e))

# delete method
def delete(key, bucket=None):
	"""Delete

	Deletes an existing object off S3

	Args:
		key: The key the object is stored under
		bucket: Optional bucket (needed if not passed in init)

	Returns:
		None
	"""

	# If init wasn't called
	if not _s3:
		raise RuntimeError('SSS.init must be called before SSS.delete')

	# If there's a bucket
	if bucket:
		sBucket = bucket
	elif _s3['bucket']:
		sBucket = _s3['bucket']
	else:
		raise ValueError('Must specify bucket in delete or init')

	# If there's a path, prepend it
	if _s3['path']:
		key = _s3['path'] + key

	# Keep trying if we get timeout errors
	iTimeouts = 0
	while True:

		try:

			# Attempt to delete the object
			return _r.Object(sBucket, key).delete()

		except ClientError as e:
			raise SSSException(e.args, sBucket, key)

		except ReadTimeoutError as e:
			iTimeouts += 1					# increment the timeout count
			if iTimeouts >= MAX_TIMEOUTS:	# if we've timed out the max times
				raise SSSException('S3 not available', str(e))
			sleep(1)						# else sleep for a second
			continue						# and try again

		except Exception as e:
			raise SSSException('Unknown S3 exception', str(e))

# get method
def get(key, bucket=None, details=None):
	"""Get

	Gets an existing object off S3

	Args:
		key: The key the object is stored under
		bucket: Optional bucket (needed if not passed in init)
		details: Optional dict to store details about the object

	Returns:
		str
	"""

	# If init wasn't called
	if not _s3:
		raise RuntimeError('SSS.init must be called before SSS.get')

	# If there's a bucket
	if bucket:
		sBucket = bucket
	elif _s3['bucket']:
		sBucket = _s3['bucket']
	else:
		raise ValueError('Must specify bucket in get or init')

	# If there's a path, prepend it
	if _s3['path']:
		key = _s3['path'] + key

	# Keep trying if we get timeout errors
	iTimeouts = 0
	while True:

		try:

			# Attempt to fetch the object
			dBlob = _r.Object(sBucket, key).get()

			# If we want details
			if details is not None and isinstance(details, dict):
				details['LastModified'] = dBlob['LastModified']
				details['ContentLength'] = dBlob['ContentLength']
				details['ContentType'] = dBlob['ContentType']
				details['ETag'] = dBlob['ETag']
				if 'VersionId' in dBlob: details['VersionId'] = dBlob['VersionId']

			# Return the body
			return dBlob['Body'].read()

		except ClientError as e:
			raise SSSException(e.args, sBucket, key)

		except ReadTimeoutError as e:
			iTimeouts += 1					# increment the timeout count
			if iTimeouts >= MAX_TIMEOUTS:	# if we've timed out the max times
				raise SSSException('S3 not available', str(e))
			sleep(1)						# else sleep for a second
			continue						# and try again

		except Exception as e:
			raise SSSException('Unknown S3 exception', str(e))

# Initialise method
def init(profile, conf, bucket=None, path=None):
	"""Init

	Initialises the module so that it can be used

	Args:
		profile (str): The name of the profile to use to connect
		conf (dict): The configuration parameters, see boto3.resource for more info
		bucket (str): Optional bucket (needed if not passed in init)
		path (str): Optional path to prepend to all keys

	Returns:
		None
	"""

	# Pull in the module variable
	global _c, _r, _s3

	# Init the conf
	_s3 = {
		"profile": profile,
		"conf": BotoConfig(**conf),
		"bucket": bucket,
		"path": path
	}

	# Create a new session using the profile
	session = boto3.Session(profile_name=profile)

	# Get an S3 resource
	_r = session.resource('s3', config=_s3['conf'])

	# Get a client
	_c = session.client('s3', config=boto3.session.Config(s3={'addressing_style': 'path'}, signature_version='s3v4'))

def list(root, bucket=None):
	"""List

	Fetches a list of keys starting with a root string

	Arguments:
		root {str} -- The start of each key
		bucket {str} -- The optional name of the bucket to list from

	Returns:
		list
	"""

	# If init wasn't called
	if not _s3:
		raise RuntimeError('SSS.init must be called before SSS.list')

	# If there's a bucket
	if bucket:
		sBucket = bucket
	elif _s3['bucket']:
		sBucket = _s3['bucket']
	else:
		raise ValueError('Must specify bucket in move or init')

	# If there's a path, prepend it to the root
	if _s3['path']:
		root = _s3['path'] + root

	# Get the bucket
	oBucket = _r.Bucket(sBucket)

	# Set the length of the path so we can remove it
	iLen = _s3['path'] is not None and len(_s3['path']) or 0

	# Go through the list of objects returned
	lRet = []
	for o in oBucket.objects.filter(Prefix=root):

		# Remove the path and return the part of the key that remains
		lRet.append(o.key[iLen:])

	# Return the list
	return lRet

# move method
def move(source, destination, bucket=None):
	"""Move

	Moves an object on S3 by first copying, then deleting

	Args:
		source: The key of the source image
		destination: The key of the moved image
		bucket: The name of the bucket to upload the key to

	Returns:
		None

	Raises:
		RuntimeError: If init is not called prior to calling upload
		ValueError: If fields are missing
		SSSException: To pass along uncatchable errors
	"""

	# If init wasn't called
	if not _s3:
		raise RuntimeError('SSS.init must be called before SSS.move')

	# If there's a bucket
	if bucket:
		sBucket = bucket
	elif _s3['bucket']:
		sBucket = _s3['bucket']
	else:
		raise ValueError('Must specify bucket in move or init')

	# If there's a path, prepend it
	if _s3['path']:
		source = _s3['path'] + source
		destination = _s3['path'] + destination

	# Keep trying if we get timeout errors
	iTimeouts = 0
	while True:

		# Create new object and copy it, then delete it
		try:
			_r.Object(sBucket, destination).copy_from(CopySource={
				'Bucket': sBucket,
				'Key': source
			})
			return _r.Object(sBucket, source).delete()

		# Check for client Errors
		except ClientError as e:
			raise SSSException(e.args, sBucket, source, destination)

		except ReadTimeoutError as e:
			iTimeouts += 1					# increment the timeout count
			if iTimeouts >= MAX_TIMEOUTS:	# if we've timed out the max times
				raise SSSException('S3 not available', str(e))
			sleep(1)						# else sleep for a second
			continue						# and try again

		except Exception as e:
			raise SSSException('Unknown S3 exception', str(e))

# put method
def put(key, content, bucket=None, acl='private', headers={}, metadata={}):
	"""Put

	Puts an object on S3

	Args:
		key: The key to store the content under
		content: The content of the upload
		bucket: The name of the bucket to upload the key to
		acl: The ACL mode of the upload
		headers: Misc. headers that can be set, see boto3.S3.Object.put for reference
		metadata: Misc. metadata that will be associated with the object

	Returns:
		None

	Raises:
		RuntimeError: If init is not called prior to calling upload
		ValueError: If fields are missing
		SSSException: To pass along uncatchable errors
	"""

	# If init wasn't called
	if not _s3:
		raise RuntimeError('SSS.init must be called before SSS.put')

	# If there's a bucket
	if bucket:
		sBucket = bucket
	elif _s3['bucket']:
		sBucket = _s3['bucket']
	else:
		raise ValueError('Must specify bucket in put or init')

	# Add the ACL, Body and Metdata to the headers variable to simplify our life
	headers['ACL'] = acl
	headers['Body'] = content
	headers['Metadata'] = metadata

	# Calculate the size of the object
	headers['ContentLength'] = len(content)

	# If there's a path, prepend it
	if _s3['path']:
		key = _s3['path'] + key

	# Keep trying if we get timeout errors
	iTimeouts = 0
	while True:

		# Create new object and upload it
		try:
			return _r.Object(sBucket, key).put(**headers)

		# Check for client Errors
		except ClientError as e:
			raise SSSException(e.args, sBucket, key)

		except ReadTimeoutError as e:
			iTimeouts += 1					# increment the timeout count
			if iTimeouts >= MAX_TIMEOUTS:	# if we've timed out the max times
				raise SSSException('S3 not available', str(e))
			sleep(1)						# else sleep for a second
			continue						# and try again

		except Exception as e:
			raise SSSException('Unknown S3 exception', str(e))

#url method
def url(key, expires, bucket=None, headers={}):
	"""URL

	Generates a presigned URL

	Args:
		key: The key the object is stored under
		expires: The seconds the URL should be valid
		bucket: The name of the bucket the key is in
		headers: Misc. headers that can be set, see boto3.S3.Client.generate_presigned_url

	Returns:
		string

	Raises:
		SSSException
	"""

	# If init wasn't called
	if not _s3:
		raise RuntimeError('SSS.init must be called before SSS.url')

	# If there's a bucket
	if bucket:
		sBucket = bucket
	elif _s3['bucket']:
		sBucket = _s3['bucket']
	else:
		raise ValueError('Must specify bucket in url or init')

	# If there's a path, prepend it
	if _s3['path']:
		key = _s3['path'] + key

	# Add the bucket and key to the headers to simplify our life
	headers['Bucket'] = sBucket
	headers['Key'] = key

	# Generate and return the URL
	return _c.generate_presigned_url(
		'get_object',
		headers,
		ExpiresIn=expires
	)
