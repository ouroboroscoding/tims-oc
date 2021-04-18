/**
 * Clients
 *
 * Manage the clients in the system
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
 * @created 2021-04-17
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
import { afindi, clone, omap } from 'shared/generic/tools';

// Load the country and division data
import Countries from 'data/countries';
import Divisions from 'data/divisions';

// Load the client and project definitions
import ClientDef from 'definitions/client';
import ProjectDef from 'definitions/project';

// Add the countries and divisions
let ClientWithOptions = clone(ClientDef);
ClientWithOptions.country.__react__.options = omap(Countries, (s,k) => [k,s]);
ClientWithOptions.division.__react__.options = omap(Divisions, (s,k) => [k,s]);

// Create Trees using the definitions
const ClientTree = new Tree(clone(ClientWithOptions));
const ProjectTree = new Tree(clone(ProjectDef));

/**
 * Projects
 *
 * Lists out the projects associated with the given client
 *
 * @name Projects
 * @access private
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
function Projects(props) {

	// State
	let [create, createSet] = useState(false);
	let [results, resultsSet] = useState(false);
	let [rights, rightsSet] = useState({
		create: false,
		update: false
	});

	// Load effect
	useEffect(() => {

		// Fetch the projects
		projectsFetch();

		// Set rights
		rightsSet({
			create: Rights.has('project', 'create', props.value._id),
			update: Rights.has('project', 'update', props.value._id)
		});

	// eslint-disable-next-line
	}, [props.value._id]);

	// Called when a new project is created
	function projectCreated(project) {

		// Clone the current projects
		let lResults = clone(results);

		// Add the project to the top
		lResults.unshift(project);

		// Set the new projects
		resultsSet(lResults);

		// Hide the form
		createSet(false);
	}

	// Called when a project has been removed
	function projectRemoved(_id) {
		let i = afindi(results, '_id', _id);
		if(i > -1) {
			let lResults = clone(results);
			delete lResults[i];
			resultsSet(lResults);
		}
	};

	// Fetch the projects associated with the user
	function projectsFetch() {

		// Make the request to the server
		Rest.read('primary', 'projects', {
			client: props.value._id
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

	// Called when a project has been updated
	function projectUpdated(project) {
		let i = afindi(results, '_id', project._id);
		if(i > -1) {
			let lResults = clone(results);
			lResults[i] = project;
			resultsSet(lResults);
		}
	};

	// Render
	return (
		<Box className="users_projects">
			<Box className="sectionHeader flexColumns">
				<Typography className="flexGrow">Projects</Typography>
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
						beforeSubmit={data => {
							data.client = props.value._id;
							return data;
						}}
						cancel={ev => createSet(false)}
						errors={{
							"2004": "Name already in use"
						}}
						noun="project"
						service="primary"
						success={projectCreated}
						title="Add Project"
						tree={ProjectTree}
						type="create"
					/>
				</Paper>
			}
			{results === false ?
				<Typography>Loading...</Typography>
			:
				<React.Fragment>
					{results.length === 0 ?
						<Typography>No projects</Typography>
					:
						<Results
							data={results}
							noun="project"
							orderBy="name"
							service="primary"
							tree={ProjectTree}
							update={rights.update ? projectUpdated : false}
						/>
					}
				</React.Fragment>
			}
		</Box>
	);
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
		update: false
	});
	let [clients, clientsSet] = useState(false);

	// Load effect
	useEffect(() => {

		// Fetch the clients
		clientsFetch();

		// Set rights
		rightsSet({
			create: Rights.has('client', 'create'),
			update: Rights.has('client', 'update')
		});

	}, []);

	// Called when a new client is created
	function clientCreated(client) {

		// Clone the current clients
		let lClients = clone(clients);

		// Add the client to the top
		lClients.unshift(client);

		// Set the new clients
		clientsSet(lClients);

		// Hide the form
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
							actions={[
								{tooltip: 'View Projects', icon: 'fas fa-project-diagram', component: Projects}
							]}
							data={clients}
							noun="client"
							orderBy="name"
							remove={false}
							service="primary"
							tree={ClientTree}
							update={rights.update ? clientUpdated : false}
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