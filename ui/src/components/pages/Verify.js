/**
 * Verify
 *
 * Displays the verification page
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-03-07
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

// Material UI
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';

/**
 * Verify
 *
 * Handles verification page
 *
 * @name Verify
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Verify(props) {

	// State
	let [msg, msgSet] = useState({
		type: '',
		content: ''
	});

	// Hooks
	const history = useHistory();
	const location = useLocation();

	// Fetch info effect
	useEffect(() => {

		// Split the location pathname
		let lLocation = location.pathname.substr(1).split('/');

		// If we didn't get enough info
		if(lLocation.length < 2) {
			Events.trigger('error', 'Invalid URL');
			history.push('/');
			return;
		}

		// Set initial message
		msgSet({
			type: '',
			content: 'Checking your verification key.'
		});

		// Send it to the service
		Rest.update('primary', 'account/verify', {
			key: lLocation[2]
		}, {session: false}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				if(res.error.code === 2003) {
					msgSet({
						type: 'error',
						content: 'Can not verify, key is invalid. Please make sure you copied the URL correctly. Contact support if you continue to have issues.'
					});
				} else {
					msgSet({
						type: 'error',
						content: JSON.stringify(res.error)
					});
				}
			}

			// On success, redirect to homepage
			if(res.data) {
				msgSet({
					type: 'success',
					content: 'Successfully verified your e-mail address. You will be redirected to the homepage shortly.'
				});

				setTimeout(() => {
					history.push('/')
				}, 5000);
			}
		});
	// eslint-disable-next-line
	}, []); // React to user changes

	// Render
	return (
		<Box id="verify" className="singlePage">
			<Box className={msg.type}><Typography>{msg.content}</Typography></Box>
		</Box>
	);
}

// Valid props
Verify.propTypes = {
	mobile: PropTypes.bool.isRequired
}
