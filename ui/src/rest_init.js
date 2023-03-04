/**
 * Rest Init
 *
 * Initialises Rest module and adds callbacks
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-02
 */

// Site component modules
import { LoaderHide, LoaderShow } from 'components/header/Loader';

// Shared communication modules
import { rest } from '@ouroboros/body';

// Shared generic modules
import events from '@ouroboros/events';

// Init the rest services
rest.init(process.env.REACT_APP_REST_DOMAIN, {

	after: (method, url, data, opts) => {
		LoaderHide();
	},

	before: (method, url, data, opts) => {
		LoaderShow();
	},

	cookie: process.env.REACT_APP_COOKIE_DOMAIN,

	error: xhr => {

		// If we got a 401, let everyone know we signed out
		if(xhr.status === 401) {
			events.get('error').trigger('You have been signed out!');
			events.get('signedOut').trigger();
		} else {
			events.get('error').trigger(
				'Unable to connect to ' + process.env.REACT_APP_REST_DOMAIN +
				': ' + xhr.statusText +
				' (' + xhr.status + ')');
		}
	},

	success: res => {

		// If we got an error
		if(res.error) {

			// What error is it?
			switch(res.error.code) {

				// No Session
				case 102:

					// Trigger signout
					events.get('signout').trigger();
					res._handled = true;
					break;

				case 207:

					// Notify the user
					let sMsg = 'Request to ' + res.error.msg + ' failed. Please contact support';
					events.get('error').trigger(sMsg);
					console.error(sMsg);
					res._handled = true;
					break;

				// no default
			}
		}
	}
});

// Hide the loader
LoaderHide();