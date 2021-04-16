/**
 * Setup
 *
 * Page to allow new user to setup their account
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
 * @created 2021-04-16
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

// Material UI
import Box from '@material-ui/core/Box';
//import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';

/**
 * Setup
 *
 * Displays a form to finish setting up your account
 *
 * @name Setup
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Setup(props) {

	// State
	let [user, userSet] = useState(false);

	// Hooks
	const history = useHistory();
	const location = useLocation();

	// Fetch info effect
	useEffect(() => {

		// Split the location pathname
		let lLocation = location.pathname.substr(1).split('/');

		// If we didn't get enough info
		if(lLocation.length < 2) {
			history.push('/');
			return;
		}

		// Send it to the service
		Rest.read('primary', 'account/setup', {
			key: lLocation[1]
		}, {session: false}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				if(res.error.code === 2003) {
					if(res.error.msg === 'key') {
						Events.trigger('error', 'Invalid key')
					} else if(res.error.msg === 'user') {
						Events.trigger('error', 'User no longer exists')
					}
				} else {
					Events.trigger('error', Rest.errorMessage(res.error));
				}

				// Redirect in 5 seconds
				setTimeout(() => {
					history.push('/')
				}, 5000);
			}

			// If we got data
			if(res.data) {
				userSet(res.data);
			}
		});

	// eslint-disable-next-line
	}, []); // React to user changes

	// Render
	return (
		<Box id="setup" className="singlePage">
			{user === false &&
				<Typography>Loading...</Typography>
			}
			{user === null &&
				<Typography className="error">Invalid setup link.</Typography>
			}
			{user &&
				<Box className="container sm">
					<Paper>
						<pre>{JSON.stringify(user, null, 4)}</pre>
					</Paper>
				</Box>
			}
		</Box>
	);
}

// Valid props
Setup.propTypes = {
	mobile: PropTypes.bool.isRequired
}
