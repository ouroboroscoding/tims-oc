/**
 * Clients: Projects
 *
 * Manage the projects for a specific client in the system
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

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';
import { afindi, clone } from 'shared/generic/tools';

// Load the client and project definitions
import ProjectDef from 'definitions/project';

// Create Trees using the definitions
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
export default function Projects(props) {

	// State
	let [create, createSet] = useState(false);
	let [results, resultsSet] = useState(false);

	// Load effect
	useEffect(() => {

		// Fetch the projects
		projectsFetch();

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

	// Called when a project has been archived
	function projectArchived(project) {
		let i = afindi(results, '_id', project._id);
		if(i > -1) {
			let lResults = clone(results);
			lResults[i]._archived = 1;
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
		<Box className="clients_projects">
			<Box className="sectionHeader flexColumns">
				<Typography className="flexGrow">Projects</Typography>
				<Box className="flexStatic">
					<Tooltip title="Create Project">
						<IconButton onClick={ev => createSet(b => !b)}>
							<i className={'fas fa-plus-circle ' + (create ? 'open' : 'close')} />
						</IconButton>
					</Tooltip>
				</Box>
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
							remove={props.rights ? projectArchived : false}
							service="primary"
							tree={ProjectTree}
							update={props.rights ? projectUpdated : false}
						/>
					}
				</React.Fragment>
			}
		</Box>
	);
}

// Valid props
Projects.propTypes = {
	value: PropTypes.object.isRequired
}