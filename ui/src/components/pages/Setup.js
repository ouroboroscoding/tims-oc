/**
 * Setup
 *
 * Page to allow new user to setup their account
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-16
 */

// Ouroboros modules
import { rest } from '@ouroboros/body';
import { Node } from '@ouroboros/define';
import { DefineNode } from '@ouroboros/define-mui';
import events from '@ouroboros/events';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Material UI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

// Get the user definition
import UserDef from 'definitions/user';

// Create the name and password nodes
const ConfirmNode = new Node(UserDef['passwd'], {
	__ui__: { title: 'Confirm Password' }
});
const NameNode = new Node(UserDef['name'], {
	__ui__: { title: 'Your Name' }
});
const PasswdNode = new Node(UserDef['passwd']);

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

	// Refs
	let confirmRef = useRef();
	let nameRef = useRef();
	let passwdRef = useRef();

	// Hooks
	const navigate = useNavigate();
	const location = useLocation();

	// Fetch info effect
	useEffect(() => {

		// Split the location pathname
		let lLocation = location.pathname.substr(1).split('/');

		// If we didn't get enough info
		if(lLocation.length < 2) {
			navigate('/');
			return;
		}

		// Send it to the service
		rest.read('primary', 'account/setup', {
			key: lLocation[1]
		}, {session: false}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				if(res.error.code === 1100) {
					if(res.error.msg === 'key') {
						events.get('error').trigger('Invalid key')
					} else if(res.error.msg === 'user') {
						events.get('error').trigger('User no longer exists')
					}
				} else {
					events.get('error').trigger(rest.errorMessage(res.error));
				}

				// Redirect in 5 seconds
				setTimeout(() => {
					navigate('/')
				}, 5000);
			}

			// If we got data
			if(res.data) {

				// Add the key to the data
				res.data.key = lLocation[1];

				// Store the data
				userSet(res.data);
			}
		});

	// eslint-disable-next-line
	}, []); // React to user changes

	// Submit the setup info
	function submit() {

		// Get the password and confirm password
		let sPasswd = passwdRef.current.value;
		let sConfirm = confirmRef.current.value;

		// If they don't match
		if(sPasswd !== sConfirm) {
			confirmRef.current.error('Passwords do not match')
			return;
		}

		// Send the info to the server
		rest.update('primary', 'account/setup', {
			key: user.key,
			name: nameRef.current.value.trim(),
			passwd: passwdRef.current.value
		}, {session: false}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				if(res.error.code === 1001) {
					if('name' in res.error.msg) {
						nameRef.current.error(res.error.msg['name'])
					}
					if('passwd' in res.error.msg) {
						passwdRef.current.error(res.error.msg['passwd'])
					}
				}
				else if(res.error.code === 1100) {
					events.get('error').trigger('Setup key invalid');
				}
				else if(res.error.code === 2102) {
					passwdRef.current.error('Password not strong enough');
				}
			}

			// If we got data
			if(res.data) {

				// Set the session
				rest.session(res.data);

				// Fetch the user
				rest.read('primary', 'user').done(res => {
					events.get('signedIn').trigger(res.data);
					navigate('/');
				});
			}
		});
	}

	// Render
	return (
		<Box id="setup" className="singlePage">
			{(user === false &&
				<Typography>Loading...</Typography>
			) || (user === null &&
				<Typography className="error">Invalid setup link.</Typography>
			) || (user &&
				<Box className="container sm">
					<Paper>
						<Box className="pageHeader">
							<Typography>Welcome!</Typography>
						</Box>
						<Typography>
							One more step and you can access invoices and tasks
							related to the projects you have been given access
							to.
						</Typography>
						<Box className="form">
							<Box className="field">
								<DefineNode
									ref={nameRef}
									name="name"
									node={NameNode}
									type="create"
									value={user.name}
									variant="standard"
								/>
							</Box>
							<Box className="field">
								<DefineNode
									ref={passwdRef}
									name="passwd"
									node={PasswdNode}
									type="create"
									variant="standard"
								/>
							</Box>
							<Box className="field">
								<DefineNode
									ref={confirmRef}
									name="confirm"
									node={ConfirmNode}
									type="create"
									variant="standard"
								/>
							</Box>
							<Box className="actions">
								<Button onClick={submit} variant="contained">Submit</Button>
							</Box>
						</Box>
					</Paper>
				</Box>
			)}
		</Box>
	);
}

// Valid props
Setup.propTypes = {
	mobile: PropTypes.bool.isRequired
}