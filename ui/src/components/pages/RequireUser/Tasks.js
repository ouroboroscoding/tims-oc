/**
 * Tasks
 *
 * Manage the tasks in the system
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2022-02-14
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import Tree from 'format-oc/Tree';

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

// Shared components
import { Form, Results } from 'shared/components/Format';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';
import { afindi, clone } from 'shared/generic/tools';

// Load the task and project definitions
import TaskDef from 'definitions/task';

// Create Trees using the definitions
const TaskTree = new Tree(clone(TaskDef));

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
				Rest.read('primary', 'projects', {
					client: client
				}).done(res => {

					// If there's an error
					if(res.error && !res._handled) {
						Events.trigger('error', Rest.errorMessage(res.error));
					}

					// If there's data
					if(res.data) {

						// Make sure we have the latest projects and update it
						projectsSet(val => {
							val[client] = res.data;
							return clone(val);
						});

						// Set the project based on available ones for the
						//	client
						projectSet(res.data[0] ? res.data[0]._id : false);
					}
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
			Rest.read('primary', 'tasks', {
				project: project
			}).done(res => {

				// If we got an error
				if(res.error && !res._handled) {
					Events.trigger('error', Rest.errorMessage(res.error));
				}

				// If we got data
				if(res.data) {
					tasksSet(res.data);
				}
			});
		}

	}, [project]);

	// Called when a task has been updated
	function taskArchived(task) {
		let i = afindi(tasks, '_id', task._id);
		if(i > -1) {
			let lTasks = clone(tasks);
			lTasks.splice(i, 1);
			tasksSet(lTasks);
		}
	};

	// Called when a new task is created
	function taskCreated(task) {
		let lTasks = clone(tasks);
		task._created = Date.now()/1000;
		task._updated = Date.now()/1000;
		task._archived = false;
		lTasks.unshift(task);
		tasksSet(lTasks);
		createSet(false);
	}

	// Called when a task has been updated
	function taskUpdated(task) {
		let i = afindi(tasks, '_id', task._id);
		if(i > -1) {
			let lTasks = clone(tasks);
			task._updated = Date.now()/1000;
			lTasks[i] = task;
			tasksSet(lTasks);
		}
	};

	// Render
	return (
		<Box id="tasks" className="singlePage">
			<Box className="pageHeader flexColumns">
				<Typography className="flexGrow">Tasks</Typography>
			</Box>
			<Grid container spacing={2}>
				<Grid item xs={12} md={6} lg={4} xl={3} className="field">
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
						<Grid item xs={12} md={6} lg={4} xl={3} className="field">
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
						{(rights && project) &&
							<Grid item xs={12} md={6} lg={4} xl={3} className="actions">
								<Tooltip title="Create Task">
									<IconButton onClick={ev => createSet(b => !b)}>
										<i className={'fas fa-plus-circle ' + (create ? 'open' : 'close')} />
									</IconButton>
								</Tooltip>
							</Grid>
						}
					</React.Fragment>
				}
			</Grid>
			{create &&
				<Paper>
					<Form
						beforeSubmit={values => {
							values.project = project;
							return values;
						}}
						cancel={ev => createSet(false)}
						errors={{
							"2004": "Name already in use"
						}}
						noun="task"
						service="primary"
						success={taskCreated}
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
							noun="task"
							orderBy="name"
							remove={rights ? taskArchived : false}
							service="primary"
							tree={TaskTree}
							update={rights ? taskUpdated : false}
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