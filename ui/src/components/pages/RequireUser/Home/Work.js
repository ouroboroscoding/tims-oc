/**
 * Work Start
 *
 * Home component for starting new work or completing open work
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-17
 */

// Ouroboros modules
import body from '@ouroboros/body';
import { safeLocalStorage } from '@ouroboros/browser';
import clone from '@ouroboros/clone';
import { iso } from '@ouroboros/dates';
import { Form } from '@ouroboros/define-mui';
import events from '@ouroboros/events';
import { afindi, afindo } from '@ouroboros/tools';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { Tree } from '@ouroboros/define';

// Material UI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// Local modules
import { bridge } from 'rest_to_define.js';

// Load the task and project definitions
import TaskDef from 'definitions/task';

// Create Trees using the definitions
const TaskTree = new Tree(TaskDef);

/**
 * Store Last Used
 *
 * Stores the last used variables in local storage so they can be used next
 * time the app is used
 *
 * @name storeLastUsed
 * @access private
 * @param String which 'client', 'project', 'task'
 * @param String value The value to store
 * @returns void
 */
function storeLastUsed(which, value) {

	// Get the existing values
	let sLastUsed = safeLocalStorage.string('work_last_' + which, false);

	// If the value changed
	if(sLastUsed !== value) {

		// Store the data in local storage
		localStorage.setItem('work_last_' + which, value);
	}
}

/**
 * Work
 *
 * Shows work start or work end depending on whether the user has an open /
 * uncompleted work record
 *
 * @name Work
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Work(props) {

	// State
	let [client, clientSet] = useState(safeLocalStorage.string('work_last_client', props.clients[0] ? props.clients[0]._id : false));
	let [create, createSet] = useState(false);
	let [project, projectSet] = useState(safeLocalStorage.string('work_last_project', false));
	let [projects, projectsSet] = useState({});
	let [task, taskSet] = useState(safeLocalStorage.string('work_last_task', false));
	let [tasks, tasksSet] = useState({});
	let [work, workSet] = useState(null);

	// Refs
	let descrRef = useRef();

	// User effect
	useEffect(() => {

		// If we have a user
		if(props.user) {

			// Request from the server if there's any existing open work
			body.read('primary', 'account/work').then(data => {
				workSet(data);
			}, error => {
				events.get('error').trigger(error);
			});
		} else {
			workSet(null);
		}

	}, [props.user]);

	// Client effect
	useEffect(() => {

		// If we have a client selected
		if(client) {

			// Update local storage
			storeLastUsed('client', client);

			// If we don't have the projects stored for the client
			if(!projects[client]) {

				// Make the request to the server
				props.user && body.read('primary', 'projects', {
					client: client
				}).then(data => {

					// If there's data
					if(data) {

						// Make sure we have the latest projects and update it
						projectsSet(val => {
							val[client] = data;
							return clone(val);
						});

						// If the project is not already valid
						if(afindi(data, '_id', project) === -1) {

							// Set the project based on available ones for the
							//	client
							projectSet(data[0] ? data[0]._id : false);
						}
					}
				}, error => {
					events.get('error').trigger(error);
				});
			}

			// Else, we already have the projects
			else {

				// If the value is not already valid
				if(afindi(projects[client], '_id', project) === -1) {

					// Set the project based on available ones for the client
					projectSet(projects[client][0] ? projects[client][0]._id : false);
				}
			}
		}

	// eslint-disable-next-line
	}, [client, projects]);

	// Project effect
	useEffect(() => {

		// If we have a project selected
		if(project) {

			// Update local storage
			storeLastUsed('project', project);

			// If we don't have the projects stored for the project
			if(!tasks[project]) {

				// Make the request to the serve
				props.user && body.read('primary', 'tasks', {
					project: project
				}).then(data => {

					// If there's data
					if(data) {

						// Make sure we have the latest tasks and update it
						tasksSet(val => {
							val[project] = data;
							return clone(val);
						});

						// If the task is not already valid
						if(afindi(data, '_id', task) === -1) {

							// Set the task based on available ones for the
							//	project
							taskSet(data[0] ? data[0]._id : false);
						}
					}
				}, error => {
					events.get('error').trigger(error);
				});
			}

			// Else, we already have the tasks
			else {

				// If the value is not already valid
				if(afindi(tasks[project], '_id', task) === -1) {

					// Set the task based on available ones for the project
					taskSet(tasks[project][0] ? tasks[project][0]._id : false);
				}
			}
		}

	// eslint-disable-next-line
	}, [project]);

	// Project effect
	useEffect(() => {

		// If we have a task selected
		if(task) {

			// Update local storage
			storeLastUsed('task', task);
		}

	}, [task]);

	// Called when the task form is submitted
	function taskSubmit(task) {

		// Add the project to the task
		task.project = project;

		// Send the task to the server
		return bridge('create', 'primary', 'task', task, data => {

			// Success
			events.get('success').trigger('Task created');

			// Clone the current tasks and push this task to the current project
			let lTasks = clone(tasks);
			task._id = data;
			lTasks[project].push(task);
			tasksSet(lTasks);

			// Set the current selected task to this one
			taskSet(data);

			// Hide the create form
			createSet(false);

		}, {
			'1104': [['name', 'Already in use']]
		});
	}

	// End the work
	function workEnd() {

		// Tell the server to end the current work
		body.update('primary', 'work/end', {
			_id: work._id,
			description: descrRef.current.value.trim()
		}).then(data => {

			// If there's data
			if(data) {

				// Clear the work
				workSet(null);
			}
		}, error => {
			events.get('error').trigger(error);
		});
	}

	// Start the work
	function workStart() {

		// Add the project to the data
		let oData = {
			project: project,
			task: task
		}

		// If there's a description, add it
		let sDescription = descrRef.current.value.trim();
		if(sDescription !== '') {
			oData.description = sDescription;
		}

		// Tell the server to start a work
		body.create('primary', 'work/start', oData).then(data => {

			// If we got data
			if(data) {

				// Find the client, project, and task
				let oClient = afindo(props.clients, '_id', client);
				let oProject = afindo(projects[client], '_id', project);
				let oTask = afindo(tasks[project], '_id', task);

				// Add them to the work
				data.client = client;
				data.clientName = oClient.name;
				data.project = project;
				data.projectName = oProject.name;
				data.task = task;
				data.taskName = oTask.name;
				data.description = sDescription;

				// Store the work
				workSet(data);
			}
		}, error => {
			events.get('error').trigger(error);
		});
	}

	// If we are still checking for an existing work
	if(work === false) {
		return <Box id="work"><Typography>Loading</Typography></Box>
	}

	// Render
	return (
		<Paper id="work">
			{work ?
				<Box className="work_end">
					<Box className="sectionHeader">
						<Typography>End Existing Work</Typography>
					</Box>
					<Typography>{work.clientName} - {work.projectName} - {work.taskName}</Typography>
					<br />
					<Typography>Started at: {iso(work.start)}</Typography>
					<Box className="field">
						<TextField
							defaultValue={work.description || ''}
							inputRef={descrRef}
							label="Description"
							placeholder="Description"
							variant="standard"
						/>
					</Box>
					<Box className="actions">
						<Button color="primary" onClick={workEnd} variant="contained">End</Button>
					</Box>
				</Box>
			:
				<Box className="work_start">
					<Box className="sectionHeader">
						<Typography>Start New Work</Typography>
					</Box>
					<Box className="form">
						<Box className="field">
							<FormControl variant="standard">
								<InputLabel>Client</InputLabel>
								<Select
									label="Select Client"
									native
									onChange={ev => clientSet(ev.currentTarget.value)}
									value={client}
								>
									{props.clients.map(o =>
										<option key={o._id} value={o._id}>{o.name}</option>
									)}
								</Select>
							</FormControl>
						</Box>
						{client &&
							<React.Fragment>
								{!projects[client] ?
									<Typography>Loading...</Typography>
								:
									<React.Fragment>
										{projects[client].length === 0 ?
											<Typography>No projects associated with client</Typography>
										:
											<React.Fragment>
												<Box className="field">
													<FormControl variant="standard">
														<InputLabel>Project</InputLabel>
														<Select
															label="Select Project"
															native
															onChange={ev => projectSet(ev.currentTarget.value)}
															value={project}
														>
															{projects[client].map(o =>
																<option key={o._id} value={o._id}>{o.name}</option>
															)}
														</Select>
													</FormControl>
												</Box>
												{!tasks[project] ?
													<Typography>Loading...</Typography>
												:
													<React.Fragment>
														<Box className="flexColumns">
															<Box className="field flexGrow">
																{tasks[project].length === 0 ?
																	<Typography>No tasks associated with project</Typography>
																:
																	<FormControl variant="standard">
																		<InputLabel>Task</InputLabel>
																		<Select
																			label="Select Task"
																			native
																			onChange={ev => taskSet(ev.currentTarget.value)}
																			value={task}
																		>
																			{tasks[project].map(o =>
																				<option key={o._id} value={o._id}>{o.name}</option>
																			)}
																		</Select>
																	</FormControl>
																}
															</Box>
															<Box className="flexStatic" style={{paddingTop: '20px'}}>
																<Tooltip title="Create Task">
																	<IconButton onClick={ev => createSet(b => !b)}>
																		<i className={'fas fa-plus-circle ' + (create ? 'open' : 'close')} />
																	</IconButton>
																</Tooltip>
															</Box>
														</Box>
														{create ?
															<Form
																gridSizes={{__default__: {xs: 12}}}
																onCancel={ev => createSet(false)}
																onSubmit={taskSubmit}
																title="Create Task"
																tree={TaskTree}
																type="create"
															/>
														:
															task &&
																<React.Fragment>
																	<Box className="field">
																		<TextField
																			inputRef={descrRef}
																			label="Description"
																			placeholder="Description"
																			variant="standard"
																		/>
																	</Box>
																	<Box className="actions">
																		<Button color="primary" onClick={workStart} variant="contained">Start</Button>
																	</Box>
																</React.Fragment>
														}
													</React.Fragment>
												}
											</React.Fragment>
										}
									</React.Fragment>
								}
							</React.Fragment>
						}
					</Box>
				</Box>
			}
		</Paper>
	);
}

// Valid props
Work.propTypes = {
	clients: PropTypes.array.isRequired,
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}