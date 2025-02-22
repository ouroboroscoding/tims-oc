/**
 * Tasks
 *
 * Manage the tasks in the system
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2022-02-14
 */

// Ouroboros modules
import body from '@ouroboros/body';
import clone from '@ouroboros/clone';
import { timestamp } from '@ouroboros/dates';
import { Tree } from '@ouroboros/define';
import { Form, Results } from '@ouroboros/define-mui';
import events from '@ouroboros/events';
import { afindi, merge } from '@ouroboros/tools';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

// Material UI
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// Local modules
import { bridge } from '@/rest_to_define.js';

// Load the task and project definitions
import TaskDef from '@/definitions/task';

// Create Trees using the definitions
const TaskTree = new Tree(TaskDef);

/**
 * Tasks
 *
 * Fetches and displays the tasks in the system
 *
 * @name Tasks
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Tasks(props) {

	// State
	let [client, clientSet] = useState(props.clients[0] ? props.clients[0]._id : false);
	let [create, createSet] = useState(false);
	let [project, projectSet] = useState(false);
	let [projects, projectsSet] = useState({});
	let [rights, rightsSet] = useState(false);
	let [tasks, tasksSet] = useState(false);

	// Load effect
	useEffect(() => {

		// Set rights
		rightsSet(['admin', 'manager'].includes(props.user.type));

	}, [props.user]);

	// Client effect
	useEffect(() => {

		// If we have a client selected
		if(client) {

			// If we don't have the projects stored for the client
			if(!projects[client]) {

				// Make the request to the serve
				body.read('primary', 'projects', {
					client: client
				}).then(data => {

					// If there's data
					if(data) {

						// Make sure we have the latest projects and update it
						projectsSet(val => {
							val[client] = data;
							return clone(val);
						});

						// Set the project based on available ones for the
						//	client
						projectSet(data[0] ? data[0]._id : false);
					} else {
						projectSet(false);
					}
				}, error => {
					events.get('error').trigger(error);
				});
			}

			// Else, we already have the projects
			else {

				// Set the project based on available ones for the client
				projectSet(projects[client][0] ? projects[client][0]._id : false);
			}
		}

	}, [client, projects]);

	// Project effect
	useEffect(() => {

		// If we have a project selected
		if(project) {

			// Fetch the tasks
			body.read('primary', 'tasks', {
				project: project
			}).then(data => {

				// If we got data
				if(data) {
					tasksSet(data);
				}
			}, error => {
				events.get('error').trigger(error);
			});
		} else {
			tasksSet([]);
		}

	}, [project]);

	// Called when the create form is submitted
	function createSubmit(task) {

		// Add the project to the task
		task.project = project;

		// Create the task on the server
		return bridge('create', 'primary', 'task', task, data => {
			if(data) {

				// Success
				events.get('success').trigger('Task created');

				// Add the ID and other fields generated on the server
				task._id = data;
				task._created = timestamp();
				task._updated = timestamp();
				task._archived = false;

				// Add the task to the records
				let lTasks = clone(tasks);
				lTasks.unshift(task);
				tasksSet(lTasks);
				createSet(false);
			}
		}, {
			'1101': [['name', 'Already in use']]
		});
	}

	// Called when the delete button is clicked
	function deleteClick(key) {

		// Delete the task from the server
		body.delete('primary', 'task', {
			_id: key
		}).then(data => {

			// If we were successful
			if(data) {

				// Success
				events.get('success').trigger('Task deleted');

				// Remove the task from the records
				let i = afindi(tasks, '_id', key);
				if(i > -1) {
					let lTasks = clone(tasks);
					lTasks.splice(i, 1);
					tasksSet(lTasks);
				}
			}
		}, error => {
			events.get('error').trigger(error);
		});
	}

	// Called when the update form is submitted
	function updateSubmit(task, key) {

		// Add the ID to the task
		task._id = key;

		// Send the update to the server
		return bridge('update', 'primary', 'task', task, data => {
			if(data) {

				// Success
				events.get('success').trigger('Task updated');

				// Update the records
				let i = afindi(tasks, '_id', task._id);
				if(i > -1) {
					let lTasks = clone(tasks);
					task._updated = timestamp();
					merge(lTasks[i], task);
					tasksSet(lTasks);
				}
			}
		}, {
			'1101': [['name', 'Already in use']]
		})
	}

	// Render
	return (
		<Box id="tasks" className="singlePage">
			<Box className="pageHeader flexColumns">
				<Typography className="flexGrow">Tasks</Typography>
				{(rights && project) &&
					<Tooltip title="Create Task">
						<IconButton onClick={ev => createSet(b => !b)}>
							<i className={'fas fa-plus-circle ' + (create ? 'open' : 'close')} />
						</IconButton>
					</Tooltip>
				}
			</Box>
			<Grid container spacing={2}>
				<Grid item xs={12} md={6} className="field">
					<FormControl>
						<InputLabel>Client</InputLabel>
						<Select
							label="Select Client"
							native
							onChange={ev => clientSet(ev.currentTarget.value)}
						>
							{props.clients.map(o =>
								<option key={o._id} value={o._id}>{o.name}</option>
							)}
						</Select>
					</FormControl>
				</Grid>
				{client &&
					<React.Fragment>
						<Grid item xs={12} md={6} className="field">
							{!projects[client] ?
								<Typography>Loading...</Typography>
							:
								<React.Fragment>
									{projects[client].length === 0 ?
										<Typography>No projects associated with client</Typography>
									:
										<FormControl>
											<InputLabel>Project</InputLabel>
											<Select
												label="Select Project"
												native
												onChange={ev => projectSet(ev.currentTarget.value)}
											>
												{projects[client].map(o =>
													<option key={o._id} value={o._id}>{o.name}</option>
												)}
											</Select>
										</FormControl>
									}
								</React.Fragment>
							}
						</Grid>
					</React.Fragment>
				}
			</Grid>
			{create &&
				<Paper>
					<Form
						gridSizes={{__default__: {xs: 12, md: 6}}}
						onCancel={ev => createSet(false)}
						onSubmit={createSubmit}
						title="Create Task"
						tree={TaskTree}
						type="create"
					/>
				</Paper>
			}
			<br />
			{tasks === false ?
				<Typography>Loading...</Typography>
			:
				<React.Fragment>
					{tasks.length === 0 ?
						<Typography>No tasks found</Typography>
					:
						<Results
							data={tasks}
							gridSizes={{__default__: {xs: 12, md: 6}}}
							onDelete={rights ? deleteClick : false}
							onUpdate={rights ? updateSubmit : false}
							orderBy="name"
							tree={TaskTree}
						/>
					}
				</React.Fragment>
			}
		</Box>
	);
}

// Valid props
Tasks.propTypes = {
	clients: PropTypes.array.isRequired,
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}