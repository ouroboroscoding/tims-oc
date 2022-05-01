/**
 * Work Start
 *
 * Home component for starting new work or completing open work
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-17
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import Tree from 'format-oc/Tree';

// Material UI
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import IconButton from '@material-ui/core/IconButton';
import InputLabel from '@material-ui/core/InputLabel';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

// Shared components
import { Form } from 'shared/components/Format';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import { iso } from 'shared/generic/dates';
import Events from 'shared/generic/events';
import {
	afindi,
	afindo,
	clone,
	safeLocalStorage
} from 'shared/generic/tools';

// Load the task and project definitions
import TaskDef from 'definitions/task';

// Create Trees using the definitions
const TaskTree = new Tree(clone(TaskDef));

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
	let sLastUsed = safeLocalStorage('work_last_' + which, false);

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
	let [client, clientSet] = useState(safeLocalStorage('work_last_client', props.clients[0] ? props.clients[0]._id : false));
	let [create, createSet] = useState(false);
	let [project, projectSet] = useState(safeLocalStorage('work_last_project', false));
	let [projects, projectsSet] = useState({});
	let [task, taskSet] = useState(safeLocalStorage('work_last_task', false));
	let [tasks, tasksSet] = useState({});
	let [work, workSet] = useState(null);

	// Refs
	let descrRef = useRef();

	// User effect
	useEffect(() => {

		// Request from the server if there's any existing open work
		Rest.read('primary', 'account/work').done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If there's data
			if('data' in res) {
				workSet(res.data);
			}
		});

	}, [props.user]);

	// Client effect
	useEffect(() => {

		// If we have a client selected
		if(client) {

			// Update local storage
			storeLastUsed('client', client);

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

						// If the project is not already valid
						if(afindi(res.data, '_id', project) === -1) {

							// Set the project based on available ones for the
							//	client
							projectSet(res.data[0] ? res.data[0]._id : false);
						}
					}
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
				Rest.read('primary', 'tasks', {
					project: project
				}).done(res => {

					// If there's an error
					if(res.error && !res._handled) {
						Events.trigger('error', Rest.errorMessage(res.error));
					}

					// If there's data
					if(res.data) {

						// Make sure we have the latest tasks and update it
						tasksSet(val => {
							val[project] = res.data;
							return clone(val);
						});

						// If the task is not already valid
						if(afindi(res.data, '_id', task) === -1) {

							// Set the task based on available ones for the
							//	project
							taskSet(res.data[0] ? res.data[0]._id : false);
						}
					}
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

	// Called when a new task is created
	function taskCreated(task) {

		// Clone the current tasks and push this task to the current project
		let lTasks = clone(tasks);
		lTasks[project].push(task);
		tasksSet(lTasks);

		// Set the current selected task to this one
		taskSet(task._id);

		// Hide the create form
		createSet(false);
	}

	// End the work
	function workEnd() {

		// Tell the server to end the current work
		Rest.update('primary', 'work/end', {
			_id: work._id,
			description: descrRef.current.value.trim()
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If there's data
			if(res.data) {

				// Clear the work
				workSet(null);
			}
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
		Rest.create('primary', 'work/start', oData).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If we got data
			if(res.data) {

				// Find the client, project, and task
				let oClient = afindo(props.clients, '_id', client);
				let oProject = afindo(projects[client], '_id', project);
				let oTask = afindo(tasks[project], '_id', task);

				// Add them to the work
				res.data.client = client;
				res.data.clientName = oClient.name;
				res.data.project = project;
				res.data.projectName = oProject.name;
				res.data.task = task;
				res.data.taskName = oTask.name;
				res.data.description = sDescription;

				// Store the work
				workSet(res.data);
			}
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
							<FormControl>
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
													<FormControl>
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
																	<FormControl>
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
														:
															task &&
																<React.Fragment>
																	<Box className="field">
																		<TextField
																			inputRef={descrRef}
																			label="Description"
																			placeholder="Description"
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