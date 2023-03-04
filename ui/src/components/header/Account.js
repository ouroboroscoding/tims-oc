/**
 * Account
 *
 * Handles account settings
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-11
 */

// Ouroboros modules
import { rest } from '@ouroboros/body';
import { Tree } from '@ouroboros/define'
import { Form } from '@ouroboros/define-mui';
import events from '@ouroboros/events';

// NPM modules
import PropTypes from 'prop-types';
import React, { useRef } from 'react';

// Material UI
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';

// Local modules
import { bridge } from 'rest_to_define.js';

// Definitions
import PassDef from 'definitions/password';
import UserDef from 'definitions/user';

// Generate the Trees
const PassTree = new Tree(PassDef);
const UserTree = new Tree(UserDef, {
	__ui__: { update: ['email', 'name'] },
	name: { __ui__: { title: 'Your Name' } }
});

/**
 * Account
 *
 * Let's user change their info
 *
 * @name Account
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Account(props) {

	// Refs
	let passForm = useRef();

	// Called when the password form is submitted
	function passwordSubmit(passwd, key) {

		// If the passwords don't match
		if(passwd.new_passwd !== passwd.confirm_passwd) {
			return [['confirm_passwd', 'Passwords don\'t match']];
		}

		// Submit the changes
		return bridge('update', 'primary', 'user/passwd', passwd, data => {
			if(data) {
				passForm.current.reset();
				events.get('success').trigger('Password updated!');
			}
		}, {
			2102: [['new_passd', 'Not strong enough']]
		});
	}

	// Called when the user form is submitted
	function userSubmit(user, key) {

		// Add the URL to the user data
		user.url = 'https://' + window.location.host + '/verify/{locale}/{key}';

		// Submit the changes
		return bridge('update', 'primary', 'user', user, data => {
			if(data) {
				rest.read('primary', 'user').done(res => {
					events.get('signedIn').trigger(res.data);
				});
				events.get('success').trigger('Account details updated');
			}
		});
	}

	// Render
	return (
		<Dialog
			maxWidth="lg"
			onClose={props.onCancel}
			open={true}
			aria-labelledby="confirmation-dialog-title"
		>
			<DialogTitle id="confirmation-dialog-title">Account Details</DialogTitle>
			<DialogContent dividers>
				<Form
					gridSizes={{__default__: {xs:12, md: 6}}}
					onSubmit={userSubmit}
					tree={UserTree}
					type="update"
					value={props.user}
				/>
				<br />
				<Divider />
				<br />
				<Form
					gridSizes={{
						__default__: {xs:12, md: 6, },
						passwd: {xs: 12}
					}}
					onSubmit={passwordSubmit}
					ref={passForm}
					tree={PassTree}
					type="update"
				/>
			</DialogContent>
		</Dialog>
	);
}

// Valid props
Account.propTypes = {
	onCancel: PropTypes.func.isRequired,
	user: PropTypes.object.isRequired
}