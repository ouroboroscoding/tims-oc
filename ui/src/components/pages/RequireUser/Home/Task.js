/**
 * Task Start
 *
 * Home component for starting a new task or completing an open one
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
 * @created 2021-04-17
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

// Material UI
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';
import { afindo, clone, datetime } from 'shared/generic/tools';

/**
 * Task
 *
 * Shows task start or task end depending on whether the user has an open /
 * uncompleted task
 *
 * @name Task
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Task(props) {

	// State
	let [client, clientSet] = useState(props.clients[0] ? props.clients[0]._id : false);
	let [project, projectSet] = useState(false);
	let [projects, projectsSet] = useState({});
	let [task, taskSet] = useState(null);

	// Refs
	let descrRef = useRef();

	// User effect
	useEffect(() => {
		taskFetch();
	// eslint-disable-next-line
	}, [props.user]);

	// Client effect
	useEffect(() => {
		if(client) {
			if(!projects[client]) {
				projectsFetch();
			}
		}
	// eslint-disable-next-line
	}, [client]);

	// Fetch the projects by client
	function projectsFetch(ev) {

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
				let oProjects = clone(projects);
				oProjects[client] = res.data;
				projectsSet(oProjects);
				projectSet(oProjects[client][0] ? oProjects[client][0]._id : false);
			}
		});
	}

	// End the task
	function taskEnd() {

		// Tell the server to end the current task
		Rest.update('primary', 'task/end', {
			_id: task._id,
			description: descrRef.current.value.trim()
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If there's data
			if(res.data) {

				// Clear the task
				taskSet(null);
			}
		});
	}

	// Start the task
	function taskStart() {

		// Add the project to the data
		let oData = {project: project}

		// If there's a description, add it
		let sDescription = descrRef.current.value.trim();
		if(sDescription !== '') {
			oData.description = sDescription;
		}

		// Tell the server to start a task
		Rest.create('primary', 'task/start', {
			project: project
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If we got data
			if(res.data) {

				// Find the client and project
				let oClient = afindo(props.clients, '_id', client);
				let oProject = afindo(projects[client], '_id', project);

				// Add them to the task
				res.data.client = client;
				res.data.clientName = oClient.name;
				res.data.project = project;
				res.data.projectName = oProject.name;

				// Store the task
				taskSet(res.data);
			}
		});
	}

	// Fetch an existing task
	function taskFetch() {

		// Request from the server if there's any existing open task
		Rest.read('primary', 'account/task').done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If there's data
			if('data' in res) {
				taskSet(res.data);
			}
		});
	}

	// If we are still checking for an existing task
	if(task === false) {
		return <Box id="task"><Typography>Loading</Typography></Box>
	}

	// Render
	return (
		<Paper id="task">
			{task ?
				<Box className="task_end">
					<Box className="sectionHeader">
						<Typography>End Existing Task</Typography>
					</Box>
					<Typography>{task.clientName} - {task.projectName}</Typography>
					<Typography>Started at: {datetime(task.start)}</Typography>
					<Box className="field">
						<TextField
							defaultValue={task.description || ''}
							inputRef={descrRef}
							label="Description"
							placeholder="Description"
						/>
					</Box>
					<Box className="actions">
						<Button color="primary" onClick={taskEnd} variant="contained">End</Button>
					</Box>
				</Box>
			:
				<Box className="task_start">
					<Box className="sectionHeader">
						<Typography>Start New Task</Typography>
					</Box>
					<Box className="form">
						<Box className="field">
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
														>
															{projects[client].map(o =>
																<option key={o._id} value={o._id}>{o.name}</option>
															)}
														</Select>
													</FormControl>
												</Box>
												{project &&
													<React.Fragment>
														<Box className="field">
															<TextField
																inputRef={descrRef}
																label="Description"
																placeholder="Description"
															/>
														</Box>
														<Box className="actions">
															<Button color="primary" onClick={taskStart} variant="contained">Start</Button>
														</Box>
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
Task.propTypes = {
	clients: PropTypes.array.isRequired,
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}