/**
 * Setup
 *
 * Page to allow new user to setup their account
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-16
 */

// NPM modules
import Node from 'format-oc/Node';
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Material UI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

// Shared components
import { Node as NodeComponent } from 'shared/components/Format';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';
import { clone } from 'shared/generic/tools';


// Get the user definition
import UserDef from 'definitions/user';

// Make a copy of the passwd node
let ConfirmDef = clone(UserDef['passwd']);
ConfirmDef.__react__.title = 'Confirm Password';

// Create the name and password nodes
const ConfirmNode = new Node(ConfirmDef);
const NameNode = new Node(clone(UserDef['name']));
const PasswdNode = new Node(clone(UserDef['passwd']));

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
		Rest.update('primary', 'account/setup', {
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
				else if(res.error.code === 2003) {
					Events.trigger('error', 'Setup key invalid');
				}
				else if(res.error.code === 2102) {
					passwdRef.current.error('Password not strong enough');
				}
			}

			// If we got data
			if(res.data) {

				// Set the session
				Rest.session(res.data);

				// Fetch the user
				Rest.read('primary', 'user').done(res => {
					Events.trigger('signedIn', res.data);
					navigate('/');
				});
			}
		});
	}

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
								<NodeComponent
									ref={nameRef}
									name="name"
									node={NameNode}
									type="create"
									value={user.name}
									variant="standard"
								/>
							</Box>
							<Box className="field">
								<NodeComponent
									ref={passwdRef}
									name="passwd"
									node={PasswdNode}
									type="create"
									variant="standard"
								/>
							</Box>
							<Box className="field">
								<NodeComponent
									ref={confirmRef}
									name="confirm"
									node={ConfirmNode}
									type="create"
									variant="standard"
								/>
							</Box>
							<Box className="actions">
								<Button onClick={submit} variant="outlined">Submit</Button>
							</Box>
						</Box>
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
