/**
 * Body Init
 *
 * Initialises body module by setting domain and adding callbacks
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @created 2023-03-11
 */

// Ouroboros modules
import body from '@ouroboros/body';
import { cookies } from '@ouroboros/browser';
import events from '@ouroboros/events';

// Set the body domain
body.domain(REST_DOMAIN);

// Set callbacks for errors and no session
body.onError((error, info) => {
	events.get('error').trigger(JSON.stringify(error, null, 4));
	console.error(error, info);
});
body.onErrorCode((error, info) => {
	let message = '';
	switch(error.code) {
		case 207:
			message = `${info.url} crashed. Please see administrator`;
			break;
		case 208:
			message = `${info.url} requires data to be sent`;
			break;
		case 209:
			message = `${info.url} requires a session`;
			break;
		default:
			console.error(error, info);
			return false;
	}
	events.get('error').trigger(message);
});
body.onNoSession(() => {
	events.get('error').trigger('You have been signed out');
	events.get('signedOut').trigger();
	body.session(null);
	cookies.remove('_session');
});