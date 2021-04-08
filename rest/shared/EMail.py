# coding=utf8
""" Email Module

Methods for sending and receiving email
"""

__author__		= "Chris Nasr"
__copyright__	= "OuroborosCoding"
__version__		= "1.0.0"
__maintainer__	= "Chris Nasr"
__email__		= "chris@ouroboroscoding.com"
__created__		= "2021-04-02"

# Pip imports
from RestOC import SMTP, Templates

last_error = '';
"""The last error generated"""

def send(conf):
	"""Send

	Sends an email over SMTP

	Arguments:
		conf (dict): Data used to generate the email config

	Returns:
		bool
	"""

	global last_error

	# Check that we have at least one type of body
	if 'html' not in conf and 'text' not in conf:
		raise ValueError('must pass one of "text" or "html"')

	# If the from is not set
	if 'from' not in conf:
		conf['from'] = 'noreply@localhost'

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
	iRes = SMTP.Send(conf['to'], conf['subject'], conf)

	# If there was an error
	if iRes != SMTP.OK:
		last_error = '%i %s' % (iRes, SMTP.lastError())
		return False

	# Clear the error
	last_error = ''

	# Return OK
	return True
