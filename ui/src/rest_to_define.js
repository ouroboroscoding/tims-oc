/**
 * REST to Define
 *
 * Simplifies the process of Define-MUI Components notifying of submit, update,
 * or delete, triggering the request of the server using rest from body, and
 * then returning success or errors to the Define components
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2023-03-02
 */

// Ouroboros modules
import body from '@ouroboros/body';
import events from '@ouroboros/events';

/**
 * Bridge
 *
 * Bridges the REST interface with the Define-MUI one for fetching or passing
 * data and then returning errors
 *
 * @name bridge
 * @access public
 * @param {string} action One of create, read, updated, or delete
 * @param {string} service The service to contact
 * @param {string} noun The noun to request
 * @param {object} data The data to send with the request
 * @param {function} success A callback function to pass success data to
 * @param {object} errors error code to one of either, alist or errors or
 * 							a callback function that can return void, or a list
 * 							of errors
 * @returns {Promise}
 */
export function bridge(action, service, noun, data, success, errors) {

	// Create a new promise and return it
	return new Promise((resolve, reject) => {

		// Call the rest service
		body[action](service, noun, data).then(data => {

			if(success !== undefined) {
				success(data);
			}
			resolve(data ? true : false);
		}, error => {

			// If the error code is 1001
			if(error.code === 1001) {
				return reject(error.msg);
			}

			// If the code is in our list of errors
			if(errors !== undefined && error.code in errors) {

				// If it's a function
				if(typeof errors[error.code] === 'function') {

					// Call it and store the result
					const lErrors = errors[error.code]();

					// If we got errors back
					if(lErrors) {
						reject(lErrors);
					}
				}

				// Else, we should have received a list of errors
				else {
					reject(errors[error.code]);
				}
			}

			// Else, display the error
			else {
				events.get('error').trigger(error);
			}
		});
	});
}