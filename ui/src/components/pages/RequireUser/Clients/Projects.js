/**
 * Clients: Projects
 *
 * Manage the projects for a specific client in the system
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
import { afindi, merge } from '@ouroboros/tools';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

// Material UI
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// Local modules
import { bridge } from 'rest_to_define.js';

// Load the client and project definitions
import ProjectDef from 'definitions/project';

// Create Trees using the definitions
const ProjectTree = new Tree(ProjectDef);

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
		body.read('primary', 'projects', {
			client: props.value._id
		}).then(data => {

			// If there's data
			if(data) {
				resultsSet(data);
			}
		}, error => {
			events.get('error').trigger(error);
		});

	// eslint-disable-next-line
	}, [props.value._id]);

	// Called when the create form is submitted
	function createSubmit(project) {

		// Add the client to the project
		project.client = props.value._id;

		// Create the project on the server
		return bridge('create', 'primary', 'project', project, data => {
			if(data) {

				// Success
				events.get('success').trigger('Project created');

				// Hide the form
				createSet(false);

				// Clone the current projects, add the project to the top, and set the
				//	new projects
				const lResults = clone(results);
				project._id = data;
				project._archived = false;
				lResults.unshift(project);
				resultsSet(lResults);
			}
		}, {
			'1101': [['name', 'Already in use']]
		});
	}

	// Called when the delete key is clicked
	function deleteClick(key) {

		// Delete the project on the server
		body.delete('primary', 'project', {
			_id: key
		}).then(data => {

			// If we got success
			if(data) {

				// Success
				events.get('success').trigger('Project deleted');

				// Remove it from the results
				let i = afindi(results, '_id', key);
				if(i > -1) {
					let lResults = clone(results);
					lResults[i]._archived = 1;
					resultsSet(lResults);
				}
			}
		}, error => {
			events.get('error').trigger(error);
		});
	}

	// Called when the update form is submitted
	function updateSubmit(project, key) {

		// Add the ID to the project
		project._id = key;

		// Send the update to the server
		return bridge('update', 'primary', 'project', project, data => {
			if(data) {

				// Success
				events.get('success').trigger('Project updated');

				// Update the results
				let i = afindi(results, '_id', key);
				if(i > -1) {
					let lResults = clone(results);
					merge(lResults[i], project);
					resultsSet(lResults);
				}
			}
		}, {
			'1101': [['name', 'Already in use']]
		});
	}

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
						gridSizes={{__default__: {xs: 12, md: 6}}}
						onCancel={ev => createSet(false)}
						onSubmit={createSubmit}
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
							orderBy="name"
							onDelete={deleteClick}
							onUpdate={updateSubmit}
							tree={ProjectTree}
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