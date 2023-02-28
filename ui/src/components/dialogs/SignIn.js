/**
 * Signin
 *
 * Handles signing in
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-13
 */

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

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';

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
		Rest.create('primary', 'signin', {
			"email": emailRef.current.value,
			"passwd": passRef.current.value
		}, {session: false}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				switch(res.error.code) {
					case 1001:
						// Go through each message and mark the error
						let errors = {};
						for(let i in res.error.msg) {
							errors[i] = res.error.msg[i];
						}
						errorsSet(errors);
						break;
					case 2100:
						Events.trigger('error', 'E-mail or password invalid');
						break;
					default:
						Events.trigger('error', Rest.errorMessage(res.error));
						break;
				}
			}

			// If there's data
			if(res.data) {

				// Set the session
				Rest.session(res.data);

				// Fetch the user
				Rest.read('primary', 'user').done(res => {
					Events.trigger('signedIn', res.data);
				});
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
				/>
				<TextField
					error={errors.passwd ? true : false}
					helperText={errors.passwd || ''}
					inputRef={passRef}
					label="Password"
					onKeyPress={keyPressed}
					type="password"
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
