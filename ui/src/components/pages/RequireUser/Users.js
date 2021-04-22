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

// Shared generic modules
import Events from 'shared/generic/events';
import { afindi, clone } from 'shared/generic/tools';

// Load the user and permission definitions
import UserDef from 'definitions/user';

// Create Trees using the definitions
const UserTree = new Tree(clone(UserDef));

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

	// Render
	return (
		<Box />
	);
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
	let [results, resultsSet] = useState([]);

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
		Rest.read('primary', 'user/access', {
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

	// Called when a client has been added
	function added(client) {
		let i = afindi(results, 'client', client);
		if(i === -1) {
			let lResults = clone(results);
			lResults.push({user: props.value._id, client: client})
			resultsSet(lResults);
		}
	};

	// Called when a client has been removed
	function removed(client) {
		let i = afindi(results, 'client', client);
		if(i > -1) {
			let lResults = clone(results);
			delete lResults[i];
			resultsSet(lResults);
		}
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
					{results.length === 0 ?
						<Typography>No client access</Typography>
					:
						<React.Fragment>
							{clients.map((o,i) =>
								<Client
									onChange={(client, value) => value ? added(client) : removed(client)}
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
	let [users, usersSet] = useState(false);

	// Load effect
	useEffect(() => {

		// Fetch the users
		usersFetch();

		// Set Rights
		rightsSet({
			create: ['admin', 'manager'].includes(props.user.type),
			update: ['admin', 'manager'].includes(props.user.type),
			delete: props.user.type === 'admin'
		});

	}, [props.user]);

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

	// Called when a user has been archived
	function userArchived(user) {
		let i = afindi(users, '_id', user._id);
		if(i > -1) {
			let lUsers = clone(users);
			lUsers[i]._archived = 1;
			usersSet(lUsers);
		}
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
							actions={[{
								tooltip: 'Clients',
								icon: 'fas fa-id-card',
								component: Clients,
								props: {clients: props.clients, rights: rights}
							}]}
							data={users}
							noun="user"
							orderBy="email"
							remove={props.user.type === 'admin' ? userArchived : false}
							service="primary"
							tree={UserTree}
							update={['admin', 'manager'].includes(props.user.type) ? userUpdated : false}
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