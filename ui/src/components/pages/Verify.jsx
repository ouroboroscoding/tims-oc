/**
 * Verify
 *
 * Displays the verification page
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-03-07
 */

// Ouroboros modules
import body from '@ouroboros/body';
import events from '@ouroboros/events';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Material UI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

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
	const navigate = useNavigate();
	const location = useLocation();

	// Fetch info effect
	useEffect(() => {

		// Split the location pathname
		let lLocation = location.pathname.substr(1).split('/');

		// If we didn't get enough info
		if(lLocation.length < 2) {
			events.get('error').trigger('Invalid URL');
			navigate('/');
			return;
		}

		// Set initial message
		msgSet({
			type: '',
			content: 'Checking your verification key.'
		});

		// Send it to the service
		body.update('primary', 'account/verify', {
			key: lLocation[2]
		}).then(data => {

			// On success, redirect to homepage
			if(data) {
				msgSet({
					type: 'success',
					content: 'Successfully verified your e-mail address. You will be redirected to the homepage shortly.'
				});

				setTimeout(() => {
					navigate('/')
				}, 5000);
			}
		}, error => {
			if(error.code === 1100) {
				msgSet({
					type: 'error',
					content: 'Can not verify, key is invalid. Please make sure you copied the URL correctly. Contact support if you continue to have issues.'
				});
			} else {
				msgSet({
					type: 'error',
					content: JSON.stringify(error)
				});
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