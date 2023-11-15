/**
 * Signin
 *
 * Handles signing in
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-13
 */

// Ouroboros modules
import body from '@ouroboros/body';
import events from '@ouroboros/events';

// NPM modules
import React, { useRef, useState } from 'react';

// Material UI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import { cookies } from '@ouroboros/browser';

/**
 * Sign In
 *
 * Displays sign in form
 *
 * @name SignIn
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Signin(props) {

	// State
	let [errors, errorsSet] = useState({})
//	let [forgot, forgotSet] = useState(false);

	// Refs
	let emailRef = useRef();
	let passRef = useRef();

	// Trap key presses
	function keyPressed(event) {
		if(event.key === 'Enter') {
			signin();
		}
	}

	// Submit the sign in
	function signin() {

		// Call the server
		body.create('primary', 'signin', {
			email: emailRef.current.value,
			passwd: passRef.current.value
		}).then(data => {

			// If there's data
			if(data) {

				// Store the cookie
				cookies.set('_session', data, 2592000);

				// Set the session
				body.session(data);

				// Fetch the user
				body.read('primary', 'user').then(data => {
					events.get('signedIn').trigger(data);
				});
			}
		}, error => {
			switch(error.code) {
				case 1001:
					// Go through each message and mark the error
					let errors = {};
					for(let i in error.msg) {
						errors[i] = error.msg[i];
					}
					errorsSet(errors);
					break;
				case 2100:
					events.get('error').trigger('E-mail or password invalid');
					break;
				default:
					events.get('error').trigger(error);
					break;
			}
		});
	}

	return (
		<Dialog
			fullWidth={true}
			id="signin"
			maxWidth="sm"
			open={true}
		>
			<DialogTitle>Sign In</DialogTitle>
			<DialogContent dividers>
				<TextField
					error={errors.email ? true : false}
					helperText={errors.email || ''}
					inputRef={emailRef}
					label="E-Mail"
					onKeyPress={keyPressed}
					type="text"
					variant="standard"
				/>
				<TextField
					error={errors.passwd ? true : false}
					helperText={errors.passwd || ''}
					inputRef={passRef}
					label="Password"
					onKeyPress={keyPressed}
					type="password"
					variant="standard"
				/>
			</DialogContent>
			<DialogActions>
				<Box className="forgot">
					<Link color="secondary" href="#key=f">Forgot Password</Link>
				</Box>
				<Button variant="contained" color="primary" onClick={signin}>
					Sign In
				</Button>
			</DialogActions>
		</Dialog>
	);
}