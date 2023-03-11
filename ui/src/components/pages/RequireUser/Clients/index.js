/**
 * Clients
 *
 * Manage the clients in the system
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-17
 */

// Ouroboros modules
import body from '@ouroboros/body';
import clone from '@ouroboros/clone';
import { Tree } from '@ouroboros/define';
import { Form, Results } from '@ouroboros/define-mui';
import events from '@ouroboros/events';
import { afindi, merge, omap } from '@ouroboros/tools';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

// Material UI
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// Local components
import Invoices from './Invoices';
import Payments from './Payments';
import Projects from './Projects';

// Local modules
import { bridge } from 'rest_to_define.js';

// Load the country and division data
import Countries from 'data/countries';
import Divisions from 'data/divisions';

// Load the client and project definitions
import ClientDef from 'definitions/client';

// Create Trees using the definitions
const ClientTree = new Tree(ClientDef, {
	country: {
		__ui__: { options: omap(Countries, (s,k) => [k,s]) }
	},
	division: {
		__ui__: { options: omap(Divisions, (s,k) => [k,s]) }
	}
});

// Constants
const GRID_SIZES = {
	__default__: {xs: 12, sm: 6, xl: 4},
	name: {xs: 12, lg: 6},
	attention_of: {xs: 12, lg: 6},
	address1: {xs: 12, sm: 8, xl: 5},
	address2: {xs: 12, sm: 4, xl: 3},
	due: {xs: 12, sm: 6, xl: 3},
	currency: {xs: 12, sm: 6, xl: 3},
	rate: {xs: 12, sm: 4, xl: 2},
	task_minimum: {xs: 12, sm: 4, xl: 2},
	task_overflow: {xs: 12, sm: 4, xl: 2}
}

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
	let [records, recordsSet] = useState(false);

	// Load effect
	useEffect(() => {

		// If we have a user
		if(props.user) {

			// Fetch the records
			body.read('primary', 'clients').then(data => {

				// If we got data
				if(data) {
					recordsSet(data);
				}
			}, error => {
				events.get('error').trigger(error);
			});

			// Set rights
			rightsSet({
				accounting: ['admin', 'accounting'].includes(props.user.type),
				create: props.user.type === 'admin',
				projects: ['admin', 'manager'].includes(props.user.type),
				delete: props.user.type === 'admin'
			});
		} else {
			recordsSet(false);
			rightsSet({
				accounting: false,
				create: false,
				projects: false,
				delete: false
			});
		}

	}, [props.user]);

	// Called when the create form is submitted
	function createSubmit(client) {

		// Send the data
		return bridge('create', 'primary', 'client', client, data => {
			if(data) {

				// Sucess
				events.get('success').trigger('Client created');

				// Add the client to the records
				let lClients = clone(records);
				client._id = data;
				client._archived = false;
				lClients.unshift(client);
				recordsSet(lClients);
				createSet(false);
			}
		}, {
			'1101': [['name', 'Already being used']]
		});
	}

	// Called when the delete icon is clicked
	function deleteClick(_id) {

		// Delete the client
		body.delete('primary', 'client', {
			_id: _id
		}).then(data => {

			if(data) {

				// Success
				events.get('success').trigger('Client archived');

				// Remove it from the records
				let i = afindi(records, '_id', _id);
				if(i > -1) {
					let lClients = clone(records);
					lClients[i]._archived = 1;
					recordsSet(lClients);
				}
			}

			// Else, failed
			else {
				events.get('error').trigger('Client failed to be deleted. Is it already archived?')
			}
		})
	}

	// Called when the update form is submitted
	function updateSubmit(client, key) {

		// Add the ID to the client
		client._id = key;

		// Send the data
		return bridge('update', 'primary', 'client', client, data => {
			if(data) {

				// Success
				events.get('success').trigger('Client updated');

				// Update the records
				let i = afindi(records, '_id', key);
				if(i > -1) {
					let lClients = clone(records);
					merge(lClients[i], client);
					recordsSet(lClients);
				}
			}
		}, {
			'1101': [['name', 'Already being used']]
		});
	}

	// Result actions
	let oResultActions = [];
	if(rights.accounting) {
		oResultActions.push({
			tooltip: 'View Invoices',
			icon: 'fa-solid fa-file-invoice-dollar',
			component: Invoices,
			props: { rights: rights }
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
						gridSizes={GRID_SIZES}
						onCancel={ev => createSet(false)}
						onSubmit={createSubmit}
						title="Create Client"
						tree={ClientTree}
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
						<Typography>No clients found</Typography>
					:
						<Results
							actions={oResultActions}
							data={records}
							gridSizes={GRID_SIZES}
							onDelete={rights.delete ? deleteClick : false}
							onUpdate={rights.accounting ? updateSubmit : false}
							orderBy="name"
							tree={ClientTree}
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