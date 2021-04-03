/**
 * Rest Init
 *
 * Initialises Rest module and adds callbacks
 *
 * @author Chris Nasr <ouroboroscode@gmail.com>
 * @copyright OuroborosCoding
 * @created 2021-04-02
 */

// Site component modules
//import { LoaderHide, LoaderShow } from './Loader';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';

// Init the rest services
Rest.init(process.env.REACT_APP_REST_DOMAIN, {

	after: (method, url, data, opts) => {
//		LoaderHide();
	},

	before: (method, url, data, opts) => {
//		LoaderShow();
	},

	cookie: window.location.host,

	error: xhr => {

		// If we got a 401, let everyone know we signed out
		if(xhr.status === 401) {
			Events.trigger('error', 'You have been signed out!');
			Events.trigger('signedOut');
		} else {
			Events.trigger('error',
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
					Events.trigger("signout");
					res._handled = true;
					break;

				case 207:

					// Notify the user
					console.error('Request to ' + res.error.msg + ' failed. Please contact support');
					res._handled = true;
					break;

				// no default
			}
		}
	}
});

// Hide the loader
//LoaderHide();
