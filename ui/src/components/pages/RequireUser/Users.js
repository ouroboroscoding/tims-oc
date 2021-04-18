/**
 * Users
 *
 * Manage the users in the system
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
 * @created 2021-04-15
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import Tree from 'format-oc/Tree';

// Material UI
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

// Shared components
import { Form, Results } from 'shared/components/Format';

// Shared communication modules
import Rest from 'shared/communication/rest';
import Rights from 'shared/communication/rights';

// Shared generic modules
import Events from 'shared/generic/events';
import { afindi, clone } from 'shared/generic/tools';

// Load the user and permission definitions
import PermDef from 'definitions/permission';
import UserDef from 'definitions/user';

// Create Trees using the definitions
const PermTree = new Tree(clone(PermDef));
const UserTree = new Tree(clone(UserDef));

/**
 * Permissions
 *
 * Displays permissions associated with the user
 *
 * @name Permissions
 * @access private
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
function Permissions(props) {

	// State
	let [results, resultsSet] = useState(false);
	let [rights, rightsSet] = useState({
		create: false,
		update: false
	});

	// Load effect
	useEffect(() => {

		// Fetch the permissions
		permissionsFetch();

		// Set rights
		rightsSet({
			create: Rights.has('user', 'create'),
			update: Rights.has('user', 'update')
		});

	// eslint-disable-next-line
	}, [props.value._id]);

	// Fetch the permissions associated with the user
	function permissionsFetch() {

		// Make the request to the server
		Rest.read('primary', 'user/permissions', {
			_id: props.value._id
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error))
			}

			// If there's data
			if(res.data) {
				resultsSet(res.data);
			}
		});
	}

	// Called when a permission has been removed
	function permissionRemoved(_id) {
		let i = afindi(results, '_id', _id);
		if(i > -1) {
			let lResults = clone(results);
			delete lResults[i];
			resultsSet(lResults);
		}
	};

	// Called when a permission has been updated
	function permissionUpdated(permission) {
		let i = afindi(results, '_id', permission._id);
		if(i > -1) {
			let lResults = clone(results);
			lResults[i] = permission;
			resultsSet(lResults);
		}
	};

	// Render
	return (
		<Box className="users_permissions">
			<Box className="sectionHeader">
				<Typography>Permissions</Typography>
			</Box>
			{results === false ?
				<Typography>Loading...</Typography>
			:
				<React.Fragment>
					{results.length === 0 ?
						<Typography>No permissions</Typography>
					:
						<Results
							data={results}
							noun="permission"
							orderBy="name"
							remove={rights.update ? permissionRemoved : false}
							service="primary"
							tree={PermTree}
							update={rights.update ? permissionUpdated : false}
						/>
					}
				</React.Fragment>
			}
		</Box>
	);
}

/**
 * Users
 *
 * Fetches and displays the users current in the system
 *
 * @name Users
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Users(props) {

	// State
	let [invite, inviteSet] = useState(false);
	let [rights, rightsSet] = useState({
		create: false,
		update: false
	});
	let [users, usersSet] = useState(false);

	// Load effect
	useEffect(() => {

		// Fetch the users
		usersFetch();

		// Set rights
		rightsSet({
			create: Rights.has('user', 'create'),
			update: Rights.has('user', 'update')
		});

	}, []);

	// Called when a new user is created
	function userCreated(user) {

		// Clone the current users
		let lUsers = clone(users);

		// Add the user to the top
		lUsers.unshift(user);

		// Set the new users
		usersSet(lUsers);

		// Hide the form
		inviteSet(false);
	}

	// Fetch the current users
	function usersFetch() {

		// Make the request to the server
		Rest.read('primary', 'users').done(res => {

			// If we got an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If we got data
			if(res.data) {
				usersSet(res.data);
			}
		});
	}

	// Called when a user has been updated
	function userUpdated(user) {
		let i = afindi(users, '_id', user._id);
		if(i > -1) {
			let lUsers = clone(users);
			lUsers[i] = user;
			usersSet(lUsers);
		}
	};

	// Render
	return (
		<Box id="users" className="singlePage">
			<Box className="pageHeader flexColumns">
				<Typography className="flexGrow">Users</Typography>
				{rights.create &&
					<Box className="bigIcon flexStatic">
						<Tooltip title="Invite User">
							<IconButton onClick={ev => inviteSet(b => !b)}>
								<i className={'fas fa-plus-circle ' + (invite ? 'open' : 'close')} />
							</IconButton>
						</Tooltip>
					</Box>
				}
			</Box>
			{invite &&
				<Paper>
					<Form
						beforeSubmit={data => {
							data.url = 'https://' + window.location.host + '/setup/{key}';
							return data;
						}}
						cancel={ev => inviteSet(false)}
						errors={{
							"2004": "E-mail address already in use"
						}}
						noun="user"
						service="primary"
						success={userCreated}
						title="Invite User"
						tree={UserTree}
						type="create"
						value={{
							locale: 'en-US'
						}}
					/>
				</Paper>
			}
			{users === false ?
				<Typography>Loading...</Typography>
			:
				<React.Fragment>
					{users.length === 0 ?
						<Typography>No users found</Typography>
					:
						<Results
							actions={[
								{tooltip: 'Permissions', icon: 'fas fa-id-card', component: Permissions}
							]}
							data={users}
							noun="user"
							orderBy="email"
							remove={false}
							service="primary"
							tree={UserTree}
							update={rights.update ? userUpdated : false}
						/>
					}
				</React.Fragment>
			}
		</Box>
	);
}

// Valid props
Users.propTypes = {
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}