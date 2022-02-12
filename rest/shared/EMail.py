# coding=utf8
""" Email Module

Methods for sending and receiving email
"""

__author__		= "Chris Nasr"
__copyright__	= "OuroborosCoding"
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "chris@ouroboroscoding.com"
__created__		= "2021-03-16"

# Python imports
import re

# Pip imports
from RestOC import Conf, SMTP

last_error = ''
"""The last error generated"""

__regex = re.compile(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
"""E-mail address regular expression"""

__mdConf = None
"""Email conf"""

def _init():
	"""Init

	Initialises the module

	Returns:
		None
	"""

	# Import the module variable
	global __mdConf

	# Load email conf
	__mdConf = Conf.get('email')

	# Init the SMTP module
	SMTP.init(**__mdConf['smtp'])

def error(subject, error):
	"""Email Error

	Send out an email with an error message

	Arguments:
		error (str): The error to email

	Returns:
		bool
	"""

	# For debugging
	print('Emailing: %s, %s' % (subject, error))

	# Send the email
	bRes = send({
		"to": Conf.get(('developer', 'emails')),
		"subject": subject,
		"text": error
	})
	if not bRes:
		print('Failed to send email: %s' % EMail.last_error)
		return False

	# Return OK
	return True

def send(conf):
	"""Send

	Sends an email over SMTP

	Arguments:
		conf (dict): Data used to generate the email config

	Returns:
		bool
	"""

	global last_error

	# If we haven't been initialised
	if not __mdConf:
		_init()

	# Check that we have at least one type of body
	if 'html' not in conf and 'text' not in conf:
		raise ValueError('must pass one of "text" or "html"')

	# If the from is not set
	if 'from' not in conf:
		conf['from'] = __mdConf['from']

	# If there's an attachment
	if 'attachments' in conf:

		# Make sure it's a list
		if not isinstance(conf['attachments'], (list,tuple)):
			conf['attachments'] = [conf['attachments']]

		# Loop through the attachments
		for i in range(len(conf['attachments'])):

			# If we didn't get a dictionary
			if not isinstance(conf['attachments'][i], dict):
				raise ValueError('attachments.%d must be a dict' % i)

			# If the fields are missing
			try:
				DictHelper.eval(conf['attachments'][i], ['body', 'filename'])
			except ValueError as e:
				raise ValueError([("attachments.%d.%s" % (i, s), 'invalid') for s in e.args])

			# Try to decode the base64
			conf['attachments'][i]['body'] = b64decode(conf['attachments'][i]['body'])

	# Send the e-mail
	iRes = SMTP.Send(
		__mdConf['override'] or conf['to'],
		conf['subject'],
		conf
	)

	# If there was an error
	if iRes != SMTP.OK:
		last_error = '%i %s' % (iRes, SMTP.lastError())
		return False

	# Clear the error
	last_error = ''

	# Return OK
	return True

def valid(address):
	"""Valid

	Returns true if the email address is valid

	Arguments:
		address (str): The e-mail address to verify

	Returns
		bool
	"""

	# If we get a match
	if __regex.match(address):
		return True

	# No match
	return False