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
from botocore.client import Config as BotoConfig
from botocore.exceptions import ClientError
from botocore.vendored.requests.packages.urllib3.exceptions import ReadTimeoutError

# Module constants
MAX_TIMEOUTS = 5

class SSSException(Exception):
	"""SSS Exception

	Used for raising s3 specific exceptions

	Extends:
		Exception
	"""
	pass

class SSSBucket(object):
	"""SSS Bucket

	Handles managing a single S3 Bucket

	Extends:
		object
	"""

	def __init__(self, profile, conf, bucket, path=None):
		"""Init / Constructor

		Initialises the module so that it can be used

		Arguments:
			profile (str): The name of the profile to use to connect
			conf (dict): The configuration parameters, see boto3.resource for more info
			bucket (str): The bucket to associated with this instance
			path (str): Optional path to prepend to all keys

		Returns:
			Bucket
		"""

		# Store the bucket and path
		self.__bucket = bucket
		self.__path = path

		# Create a new session using the profile
		session = boto3.Session(profile_name=profile)

		# Get an S3 resource
		self.__r = session.resource('s3', config=BotoConfig(**conf))

		# Get a client
		self.__c = session.client('s3', config=boto3.session.Config(s3={'addressing_style': 'path'}, signature_version='s3v4'))

	def acl(self, key, acl):
		"""ACL

		Changes the ACL for a specific key

		Arguments:
			key (str): The key to store the content under
			acl (str): The ACL mode of the upload
			bucket (str): The name of the bucket to upload the key to

		Returns
			None

		"""

		# If there's a path, prepend it
		if self.__path:
			key = self.__path + key

		# Keep trying if we get timeout errors
		iTimeouts = 0
		while True:

			# Create new object and upload it
			try:
				return self.__r.Object(self.__bucket, key).Acl().put(ACL=acl)

			# Check for client Errors
			except ClientError as e:
				raise SSSException(e.args, self.__bucket, key)

			except ReadTimeoutError as e:
				iTimeouts += 1					# increment the timeout count
				if iTimeouts >= MAX_TIMEOUTS:	# if we've timed out the max times
					raise SSSException('S3 not available', str(e))
				sleep(1)						# else sleep for a second
				continue						# and try again

			except Exception as e:
				raise SSSException('Unknown S3 exception', str(e))

	def copy(self, source, destination):
		"""Copy

		Copies an object on S3

		Arguments:
			source (str): The key of the source image
			destination (str): The key of the copied image
			bucket (str): The name of the bucket to upload the key to

		Returns:
			None

		Raises:
			RuntimeError: If init is not called prior to calling upload
			ValueError: If fields are missing
			SSSException: To pass along uncatchable errors
		"""

		# If there's a path, prepend it
		if self.__path:
			source = self.__path + source
			destination = self.__path + destination

		# Keep trying if we get timeout errors
		iTimeouts = 0
		while True:

			# Create new object and copy it
			try:
				return self.__r.Object(self.__bucket, destination).copy_from(CopySource={
					'Bucket': self.__bucket,
					'Key': source
				})

			# Check for client Errors
			except ClientError as e:
				raise SSSException(e.args, self.__bucket, source, destination)

			except ReadTimeoutError as e:
				iTimeouts += 1					# increment the timeout count
				if iTimeouts >= MAX_TIMEOUTS:	# if we've timed out the max times
					raise SSSException('S3 not available', str(e))
				sleep(1)						# else sleep for a second
				continue						# and try again

			except Exception as e:
				raise SSSException('Unknown S3 exception', str(e))

	def delete(self, key):
		"""Delete

		Deletes an existing object off S3

		Arguments:
			key (str): The key the object is stored under
			Returns:
			None
		"""

		# If there's a path, prepend it
		if self.__path:
			key = self.__path + key

		# Keep trying if we get timeout errors
		iTimeouts = 0
		while True:

			try:

				# Attempt to delete the object
				return self.__r.Object(self.__bucket, key).delete()

			except ClientError as e:
				raise SSSException(e.args, self.__bucket, key)

			except ReadTimeoutError as e:
				iTimeouts += 1					# increment the timeout count
				if iTimeouts >= MAX_TIMEOUTS:	# if we've timed out the max times
					raise SSSException('S3 not available', str(e))
				sleep(1)						# else sleep for a second
				continue						# and try again

			except Exception as e:
				raise SSSException('Unknown S3 exception', str(e))

	def get(self, key, details=None):
		"""Get

		Gets an existing object off S3

		Arguments:
			key (str): The key the object is stored under
			details (dict): Optional dict to store details about the object

		Returns:
			str
		"""

		# If there's a path, prepend it
		if self.__path:
			key = self.__path + key

		# Keep trying if we get timeout errors
		iTimeouts = 0
		while True:

			try:

				# Attempt to fetch the object
				dBlob = self.__r.Object(self.__bucket, key).get()

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
				raise SSSException(e.args, self.__bucket, key)

			except ReadTimeoutError as e:
				iTimeouts += 1					# increment the timeout count
				if iTimeouts >= MAX_TIMEOUTS:	# if we've timed out the max times
					raise SSSException('S3 not available', str(e))
				sleep(1)						# else sleep for a second
				continue						# and try again

			except Exception as e:
				raise SSSException('Unknown S3 exception', str(e))


	def list(self, root):
		"""List

		Fetches a list of keys starting with a root string

		Arguments:
			root (str): The start of each key

		Returns:
			list
		"""

		# If there's a path, prepend it to the root
		if self.__path:
			root = self.__path + root

		# Get the bucket
		oBucket = self.__r.Bucket(self.__bucket)

		# Set the length of the path so we can remove it
		iLen = self.__path is not None and len(self.__path) or 0

		# Go through the list of objects returned
		lRet = []
		for o in oBucket.objects.filter(Prefix=root):

			# Remove the path and return the part of the key that remains
			lRet.append(o.key[iLen:])

		# Return the list
		return lRet

	def move(self, source, destination):
		"""Move

		Moves an object on S3 by first copying, then deleting

		Arguments:
			source (str): The key of the source image
			destination (str): The key of the moved image
			bucket (str): The name of the bucket to upload the key to

		Returns:
			None

		Raises:
			RuntimeError: If init is not called prior
			ValueError: If fields are missing
			SSSException: To pass along uncatchable errors
		"""

		# If there's a path, prepend it
		if self.__path:
			source = self.__path + source
			destination = self.__path + destination

		# Keep trying if we get timeout errors
		iTimeouts = 0
		while True:

			# Create new object and copy it, then delete it
			try:
				self.__r.Object(self.__bucket, destination).copy_from(CopySource={
					'Bucket': self.__bucket,
					'Key': source
				})
				return self.__r.Object(self.__bucket, source).delete()

			# Check for client Errors
			except ClientError as e:
				raise SSSException(e.args, self.__bucket, source, destination)

			except ReadTimeoutError as e:
				iTimeouts += 1					# increment the timeout count
				if iTimeouts >= MAX_TIMEOUTS:	# if we've timed out the max times
					raise SSSException('S3 not available', str(e))
				sleep(1)						# else sleep for a second
				continue						# and try again

			except Exception as e:
				raise SSSException('Unknown S3 exception', str(e))

	def presigned_url(self, key, expires, headers={}):
		"""Presigned URL

		Generates a presigned URL

		Arguments:
			key (str): The key the object is stored under
			expires (uint): The seconds the URL should be valid
			bucket (str): The name of the bucket the key is in
			headers (dict): Misc. headers that can be set, see boto3.S3.Client.generate_presigned_url

		Returns:
			string

		Raises:
			RuntimeError: If init is not called prior
			ValueError: If fields are missing
		"""

		# If there's a path, prepend it
		if self.__path:
			key = self.__path + key

		# Add the bucket and key to the headers to simplify our life
		headers['Bucket'] = self.__bucket
		headers['Key'] = key

		# Generate and return the URL
		return self.__c.generate_presigned_url(
			'get_object',
			headers,
			ExpiresIn=expires
		)

	def put(self, key, content, acl='private', headers={}, metadata={}):
		"""Put

		Puts an object on S3

		Arguments:
			key (str): The key to store the content under
			content (str): The content of the upload
			bucket (str): The name of the bucket to upload the key to
			acl (str): The ACL mode of the upload
			headers (dict): Misc. headers that can be set, see boto3.S3.Object.put for reference
			metadata (dict): Misc. metadata that will be associated with the object

		Returns:
			None

		Raises:
			RuntimeError: If init is not called prior
			ValueError: If fields are missing
			SSSException: To pass along uncatchable errors
		"""

		# Add the ACL, Body and Metdata to the headers variable to simplify our life
		headers['ACL'] = acl
		headers['Body'] = content
		headers['Metadata'] = metadata

		# Calculate the size of the object
		headers['ContentLength'] = len(content)

		# If there's a path, prepend it
		if self.__path:
			key = self.__path + key

		# Keep trying if we get timeout errors
		iTimeouts = 0
		while True:

			# Create new object and upload it
			try:
				return self.__r.Object(self.__bucket, key).put(**headers)

			# Check for client Errors
			except ClientError as e:
				raise SSSException(e.args, self.__bucket, key)

			except ReadTimeoutError as e:
				iTimeouts += 1					# increment the timeout count
				if iTimeouts >= MAX_TIMEOUTS:	# if we've timed out the max times
					raise SSSException('S3 not available', str(e))
				sleep(1)						# else sleep for a second
				continue						# and try again

			except Exception as e:
				raise SSSException('Unknown S3 exception', str(e))

	def url(self, key):
		"""URL

		Generates a URL

		Arguments:
			key (str): The key the object is stored under
			bucket (str): The name of the bucket the key is in

		Returns:
			str

		Raises:
			RuntimeError
			ValueError
		"""

		# If there's a path, prepend it
		if self.__path:
			key = self.__path + key

		# Return the URL
		return 'https://%s.s3.amazonaws.com/%s' % (
			self.__bucket,
			key
		)