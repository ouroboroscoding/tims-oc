/**
 * Account
 *
 * Handles account settings
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
 * @created 2021-04-11
 */

// NPM modules
import PropTypes from 'prop-types';
import Tree from 'format-oc/Tree'
import React, { useRef } from 'react';

// Material UI
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import Dialog from '@material-ui/core/Dialog';
import Divider from '@material-ui/core/Divider';

// Format Components
import { Form } from 'shared/components/Format';

// Shared communications modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';
import { clone } from 'shared/generic/tools';

// Definitions
import PassDef from 'definitions/password';
import UserDef from 'definitions/user';

// Generate the Trees
const PassTree = new Tree(clone(PassDef));
const UserTree = new Tree(clone(UserDef));

// Override the react values
UserTree.special('react', {
	update: ['email', 'name']
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

	// Password check
	function passwordCheck(values) {
		if(values.new_passwd !== values.confirm_passwd) {
			Events.trigger('error', 'Passwords don\'t match');
			return false;
		}
		return values;
	}

	// Password success
	function passwordSuccess() {
		passForm.current.value = {
			passwd: '', new_passwd: '', confirm_passwd: ''
		};
	}

	// Update success
	function updateSuccess(user) {
		Rest.read('primary', 'user').done(res => {
			Events.trigger('signedIn', res.data);
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
					beforeSubmit={values => {
						values.url = 'https://' + window.location.host + '/verify/{locale}/{key}';
						return values;
					}}
					noun="user"
					service="primary"
					success={updateSuccess}
					tree={UserTree}
					type="update"
					value={props.user}
				/>
				<br />
				<Divider />
				<br />
				<Form
					beforeSubmit={passwordCheck}
					errors={{2102: "Password not strong enough"}}
					noun="user/passwd"
					ref={passForm}
					success={passwordSuccess}
					service="primary"
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