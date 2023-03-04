/**
 * Users
 *
 * Manage the users in the system
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-15
 */

// Ouroboros modules
import { rest } from '@ouroboros/body';
import clone from '@ouroboros/clone';
import { Tree } from '@ouroboros/define';
import { Form, Results } from '@ouroboros/define-mui';
import events from '@ouroboros/events';
import { afindi, merge } from '@ouroboros/tools';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

// Material UI
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// Locale modules
import { bridge } from 'rest_to_define.js';

// Load the user definition
import UserDef from 'definitions/user';

// Create the Tree using the definition
const UserTree = new Tree(UserDef, {
	name: { __ui__: { title: 'Full Name' } }
});

// Constants
const GRID_SIZES = {
	__default__: {xs: 12, md: 6, xl: 3},
	verified: {xs: 12}
}

/**
 * Client
 *
 * Displays a single client
 *
 * @name Client
 * @access private
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
function Client(props) {

	// When the switch is flipped
	function changed(ev) {
		if(ev.currentTarget.checked) {
			props.onEnable(props._id);
		} else {
			props.onDisable(props._id);
		}
	}

	// Render
	return (
		<Box className="flexColumns">
			<Box className="flexGrow">{props.name}</Box>
			<Box className="flexStatic">
				<Switch
					checked={props.on}
					color="primary"
					onChange={changed}
				/>
			</Box>
		</Box>
	);
}

// Valid props
Client.propTypes = {
	_id: PropTypes.string.isRequired,
	name: PropTypes.string.isRequired,
	onDisable: PropTypes.func.isRequired,
	onEnable: PropTypes.func.isRequired
}

/**
 * Clients
 *
 * Displays access to clients for the user
 *
 * @name Clients
 * @access private
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
function Clients(props) {

	// State
	let [clients, clientsSet] = useState([]);
	let [results, resultsSet] = useState(false);

	// Load effect
	useEffect(() => {
		fetch();
	// eslint-disable-next-line
	}, [props.value._id]);

	// Clients or results effect
	useEffect(() => {
		let lClients = [];
		for(let o of props.clients) {
			lClients.push({
				on: (afindi(results, 'client', o._id) > -1),
				...o
			})
		}
		clientsSet(lClients);

	}, [props.clients, results])

	// Fetch the permissions associated with the user
	function fetch() {

		// Make the request to the server
		rest.read('primary', 'user/access', {
			_id: props.value._id
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				events.get('error').trigger(rest.errorMessage(res.error))
			}

			// If there's data
			if(res.data) {
				resultsSet(res.data);
			}
		});
	}

	// Called when a client should be added
	function add(client) {

		// Call the server
		rest.create('primary', 'user/access', {
			user: props.value._id,
			client: client
		}).done(res => {

			// If we got an error
			if(res.error && !res._handled) {
				events.get('error').trigger(rest.errorMessage(res.error));
			}

			// If we got data
			if(res.data) {
				let i = afindi(results, 'client', client);
				if(i === -1) {
					let lResults = clone(results);
					lResults.push({user: props.value._id, client: client})
					resultsSet(lResults);
				}
			}
		});
	}

	// Called when a client should be removed
	function remove(client) {

		// Call the server
		rest.delete('primary', 'user/access', {
			user: props.value._id,
			client: client
		}).done(res => {

			// If we got an error
			if(res.error && !res._handled) {
				events.get('error').trigger(rest.errorMessage(res.error));
			}

			// If we got data
			if(res.data) {
				let i = afindi(results, 'client', client);
				if(i > -1) {
					let lResults = clone(results);
					lResults.splice(i,1);
					resultsSet(lResults);
				}
			}
		});
	};

	// Render
	return (
		<Box className="users_permissions">
			<Box className="sectionHeader">
				<Typography>Clients</Typography>
			</Box>
			{results === false ?
				<Typography>Loading...</Typography>
			:
				<React.Fragment>
					{clients.length === 0 ?
						<Typography>No client access</Typography>
					:
						<React.Fragment>
							{clients.map((o,i) =>
								<Client
									onDisable={remove}
									onEnable={add}
									{...o}
								/>
							)}
						</React.Fragment>
					}
				</React.Fragment>
			}
		</Box>
	);
}

// Valid props
Clients.propTypes = {
	clients: PropTypes.array.isRequired,
	rights: PropTypes.object.isRequired
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
		update: false,
		delete: false
	})
	let [records, recordsSet] = useState(false);

	// Load effect
	useEffect(() => {

		// Fetch the users
		rest.read('primary', 'users').done(res => {

			// If we got an error
			if(res.error && !res._handled) {
				events.get('error').trigger(rest.errorMessage(res.error));
			}

			// If we got data
			if(res.data) {
				recordsSet(res.data);
			}
		});

		// Set Rights
		rightsSet({
			create: ['admin', 'manager'].includes(props.user.type),
			update: ['admin', 'manager'].includes(props.user.type),
			delete: props.user.type === 'admin'
		});

	}, [props.user]);

	// Called when the create form is submitted
	function createSubmit(user) {

		// Add the url to the user
		user.url = 'https://' + window.location.host + '/setup/{key}';

		// Send the user to the server
		return bridge('create', 'primary', 'user', user, data => {

			// If we got data
			if(data) {

				// Success
				events.get('success').trigger('User created');

				// Hide the form
				inviteSet(false);

				// Add the user to the front of the records
				let lRecords = clone(records);
				lRecords.unshift(user);
				recordsSet(lRecords);
			}
		}, {
			'1101': [['email', 'Already in use']]
		}
);
	}

	// Called when the delete icon is clicked
	function deleteClick(key) {

		// Delete the user from the server
		rest.delete('primary', 'user', {
			_id: key
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				events.get('error').trigger(rest.errorMessage(res.error));
			}

			// If we got data
			if(res.data) {

				// Remove the user from the records
				let i = afindi(records, '_id', key);
				if(i > -1) {
					let lRecords = clone(records);
					lRecords[i]._archived = 1;
					recordsSet(lRecords);
				}
			}
		});
	}

	// Called when the update form is submitted
	function updateSubmit(user, key) {

		// Add the ID to the user
		user._id = key;

		// Send the user update to the server
		return bridge('update', 'primary', 'user', user, data => {

			// If we got data
			if(data) {

				// Update the user in the records
				let i = afindi(records, '_id', key);
				if(i > -1) {
					let lRecords = clone(records);
					merge(lRecords[i], user);
					recordsSet(lRecords);
				}
			}
		})
	}

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
						gridSizes={GRID_SIZES}
						onCancel={ev => inviteSet(false)}
						onSubmit={createSubmit}
						title="Invite User"
						tree={UserTree}
						type="create"
						value={{
							locale: 'en-US'
						}}
					/>
				</Paper>
			}
			{records === false ?
				<Typography>Loading...</Typography>
			:
				<React.Fragment>
					{records.length === 0 ?
						<Typography>No users found</Typography>
					:
						<Results
							actions={[{
								tooltip: 'Clients',
								icon: 'fas fa-id-card',
								component: Clients,
								props: {clients: props.clients, rights: rights}
							}]}
							data={records}
							gridSizes={GRID_SIZES}
							onDelete={props.user.type === 'admin' ? deleteClick : false}
							onUpdate={['admin', 'manager'].includes(props.user.type) ? updateSubmit : false}
							orderBy="email"
							tree={UserTree}
						/>
					}
				</React.Fragment>
			}
		</Box>
	);
}

// Valid props
Users.propTypes = {
	clients: PropTypes.array.isRequired,
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}