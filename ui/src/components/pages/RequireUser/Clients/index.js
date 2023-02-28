/**
 * Clients
 *
 * Manage the clients in the system
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-17
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import Tree from 'format-oc/Tree';

// Material UI
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// Shared components
import { Form, Results } from 'shared/components/Format';

// Local components
import Invoices from './Invoices';
import Payments from './Payments';
import Projects from './Projects';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';
import { afindi, clone, omap } from 'shared/generic/tools';

// Load the country and division data
import Countries from 'data/countries';
import Divisions from 'data/divisions';

// Load the client and project definitions
import ClientDef from 'definitions/client';

// Add the countries and divisions
let ClientWithOptions = clone(ClientDef);
ClientWithOptions.country.__react__.options = omap(Countries, (s,k) => [k,s]);
ClientWithOptions.division.__react__.options = omap(Divisions, (s,k) => [k,s]);

// Create Trees using the definitions
const ClientTree = new Tree(clone(ClientWithOptions));

/**
 * Clients
 *
 * Fetches and displays the clients current in the system
 *
 * @name Clients
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Clients(props) {

	// State
	let [create, createSet] = useState(false);
	let [rights, rightsSet] = useState({
		create: false,
		update: false,
	});
	let [clients, clientsSet] = useState(false);

	// Load effect
	useEffect(() => {

		// Fetch the clients
		clientsFetch();

		// Set rights
		rightsSet({
			accounting: ['admin', 'accounting'].includes(props.user.type),
			create: props.user.type === 'admin',
			projects: ['admin', 'manager'].includes(props.user.type),
			delete: props.user.type === 'admin'
		});

	}, [props.user]);

	// Called when an existing client is archived
	function clientArchived(client) {
		let i = afindi(clients, '_id', client._id);
		if(i > -1) {
			let lClients = clone(clients);
			lClients[i]._archived = 1;
			clientsSet(lClients);
		}
	}

	// Called when a new client is created
	function clientCreated(client) {
		let lClients = clone(clients);
		lClients.unshift(client);
		clientsSet(lClients);
		createSet(false);
	}

	// Fetch the current clients
	function clientsFetch() {

		// Make the request to the server
		Rest.read('primary', 'clients').done(res => {

			// If we got an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If we got data
			if(res.data) {
				clientsSet(res.data);
			}
		});
	}

	// Called when a client has been updated
	function clientUpdated(client) {
		let i = afindi(clients, '_id', client._id);
		if(i > -1) {
			let lClients = clone(clients);
			lClients[i] = client;
			clientsSet(lClients);
		}
	};

	// Result actions
	let oResultActions = [];
	if(rights.accounting) {
		oResultActions.push({
			tooltip: 'View Invoices',
			icon: 'fa-solid fa-file-invoice-dollar',
			component: Invoices
		});
		oResultActions.push({
			tooltip: 'View Payments',
			icon: 'fa-solid fa-money-bill-1',
			component: Payments
		});
	}
	if(rights.projects) {
		oResultActions.push({
			tooltip: 'View Projects',
			icon: 'fas fa-project-diagram',
			component: Projects
		});
	}

	// Render
	return (
		<Box id="clients" className="singlePage">
			<Box className="pageHeader flexColumns">
				<Typography className="flexGrow">Clients</Typography>
				{rights.create &&
					<Box className="flexStatic">
						<Tooltip title="Create Client">
							<IconButton onClick={ev => createSet(b => !b)}>
								<i className={'fas fa-plus-circle ' + (create ? 'open' : 'close')} />
							</IconButton>
						</Tooltip>
					</Box>
				}
			</Box>
			{create &&
				<Paper>
					<Form
						cancel={ev => createSet(false)}
						errors={{
							"2004": "Name already in use"
						}}
						noun="client"
						service="primary"
						success={clientCreated}
						title="Create Client"
						tree={ClientTree}
						type="create"
						value={{
							locale: 'en-US'
						}}
					/>
				</Paper>
			}
			{clients === false ?
				<Typography>Loading...</Typography>
			:
				<React.Fragment>
					{clients.length === 0 ?
						<Typography>No clients found</Typography>
					:
						<Results
							actions={oResultActions}
							data={clients}
							noun="client"
							orderBy="name"
							remove={rights.delete ? clientArchived : false}
							service="primary"
							tree={ClientTree}
							update={rights.accounting ? clientUpdated : false}
						/>
					}
				</React.Fragment>
			}
		</Box>
	);
}

// Valid props
Clients.propTypes = {
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}