/**
 * Work
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
import { dayOfWeek, elapsed, iso } from '@ouroboros/dates';
import events from '@ouroboros/events';
import { afindi } from '@ouroboros/tools';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

// Material UI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// Local components
import Previous from './Previous';
import Start from './Start';

/**
 * Store Last Used
 *
 * Stores the last used variables in local storage so they can be used next
 * time the app is used
 *
 * @name storeLastUsed
 * @access private
 * @param String which 'last', 'prev'
 * @param String type 'client', 'project', 'task'
 * @param String value The value to store
 * @returns void
 */
function storeLastUsed(which, type, value) {

	// Generate the name
	const sName = `work_${which}_${type}`;

	// Get the existing values
	const sLastUsed = safeLocalStorage.string(sName, false);

	// If the value changed
	if(sLastUsed !== value) {

		// Store the data in local storage
		localStorage.setItem(sName, value);
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
	const [ client, clientSet ] = useState(
		safeLocalStorage.string(
			'work_last_client',
			props.clients[0] ? props.clients[0]._id : false
		)
	);
	const [ descr, descrSet ] = useState('');
	const [ elapsedTime, elapsedTimeSet ] = useState(false);
	const [ elapsedType, elapsedTypeSet ] = useState(
		safeLocalStorage.string('work_elapsed_type', 'day')
	);
	const [ pclient, pclientSet ] = useState(
		safeLocalStorage.string(
			'work_prev_client',
			props.clients[0] ? props.clients[0]._id : false
		)
	);
	const [ pdescr, pdescrSet ] = useState('');
	const [ pproject, pprojectSet ] = useState(
		safeLocalStorage.string('work_prev_project', false)
	);
	const [ ptask, ptaskSet ] = useState(
		safeLocalStorage.string('work_prev_task', false)
	);
	const [ project, projectSet ] = useState(
		safeLocalStorage.string('work_last_project', false)
	);
	const [ projects, projectsSet ] = useState({ });
	const [ task, taskSet ] = useState(
		safeLocalStorage.string('work_last_task', false)
	);
	const [ tasks, tasksSet ] = useState({ });
	const [ work, workSet ] = useState(null);

	// Refs
	const elapsedRef = useRef();

	// User effect
	useEffect(() => {

		// If we have a user
		if(props.user) {
			workFetch();
		} else {
			workSet(null);
		}

	}, [ props.user ]);

	// Client effect
	useEffect(() => {
		processClientChange('last');
	}, [ client ]);

	// Previous client effect
	useEffect(() => {
		processClientChange('prev');
	}, [ pclient ]);

	// Project effect
	useEffect(() => {
		processProjectChange('last');
	}, [ project ]);

	// Previos project effect
	useEffect(() => {
		processProjectChange('prev');
	}, [ pproject ]);

	// Task effect
	useEffect(() => {

		// If we have a task selected, store it
		if(task) {
			storeLastUsed('last', 'task', task);
		}

	}, [ task ]);

	// Previous task effect
	useEffect(() => {

		// If we have a task selected, store it
		if(ptask) {
			storeLastUsed('prev', 'task', ptask);
		}

	}, [ ptask ]);

	// Elapsed Type effect
	useEffect(() => {

		// If we have a timer, stop it
		if(elapsedRef.current) {
			clearInterval(elapsedRef.current);
		}

		// Fetch the elapsed time
		elapsedRequest();

		// Set a new interval to refresh the elapsed every 5 minutes
		elapsedRef.current = setInterval(elapsedRequest, 300000);

	}, [ elapsedType ]);

	// Called to get elapsed time
	function elapsedRequest() {

		// Init the start / end dates
		let oStart, oEnd;

		// Calculate the start and end based on the type
		switch(elapsedType) {
			case 'day':
				oStart = new Date();
				oEnd = new Date();
				break;
			case 'week':
				oStart = dayOfWeek(0);
				oEnd = dayOfWeek(6);
				break;
			case 'month':
				oStart = new Date();
				oStart = new Date(oStart.getFullYear(), oStart.getMonth(), 1);
				oEnd = new Date(oStart.getFullYear(), oStart.getMonth() + 1, 0);
				break;
		}

		// Make sure we clear the hours/minutes/seconds
		oStart.setHours(0, 0, 0, 0);
		oEnd.setHours(23, 59, 59, 0);

		// Send the request to the server
		body.read('primary', 'account/elapsed', {
			'start': Math.floor(oStart.getTime() / 1000),
			'end': Math.floor(oEnd.getTime() / 1000)
		}).then(data => {
			elapsedTimeSet(data);
		});
	}

	// Called by the client and pclient effects
	function processClientChange(which) {

		// Variables
		let c, p;

		// If we're on the last
		if(which == 'last') {
			c = client;
			p = [ project, projectSet ];
		} else if(which == 'prev') {
			c = pclient;
			p = [ pproject, pprojectSet ];
		} else {
			throw Error(`Invalid "which" passed to processClientChange(): ${which}`);
		}

		// If we have a client selected
		if(c) {

			// Update local storage
			storeLastUsed(which, 'client', c);

			// If we don't have the projects stored for the client
			if(!projects[c]) {

				// Make the request to the server
				props.user && body.read('primary', 'projects', {
					client: c
				}).then(data => {

					// If there's data
					if(data) {

						// Make sure we have the latest projects and update it
						projectsSet(val => {
							return { ...val, [c]: data }
						});

						// If the project is not already valid
						if(afindi(data, '_id', p[0]) === -1) {

							// Set the project based on available ones for the
							//	client
							p[1](data[0] ? data[0]._id : false);
						}
					}
				}, error => {
					events.get('error').trigger(error);
				});
			}

			// Else, we already have the projects
			else {

				// If the value is not already valid
				if(afindi(projects[c], '_id', p[0]) === -1) {

					// Set the project based on available ones for the client
					p[1](projects[c][0] ?
						projects[c][0]._id :
						false
					);
				}
			}
		}
	}

	// Called by the project and pproject effects
	function processProjectChange(which) {

		// Variables
		let p, t;

		// If we're on the last
		if(which == 'last') {
			p = project;
			t = [ task, taskSet ];
		} else if(which == 'prev') {
			p = pproject;
			t = [ ptask, ptaskSet ];
		} else {
			throw Error(`Invalid "which" passed to processProjectChange(): ${which}`);
		}

		// If we have a project selected
		if(p) {

			// Update local storage
			storeLastUsed(which, 'project', p);

			// If we don't have the projects stored for the project
			if(!tasks[p]) {

				// Make the request to the serve
				props.user && body.read('primary', 'tasks', {
					project: p
				}).then(data => {

					// If there's data
					if(data) {

						// Make sure we have the latest tasks and update it
						tasksSet(val => {
							return { ...val, [p]: data }
						});

						// If the task is not already valid
						if(afindi(data, '_id', t[0]) === -1) {

							// Set the task based on available ones for the
							//	project
							t[1](data[0] ? data[0]._id : false);
						}
					}
				}, error => {
					events.get('error').trigger(error);
				});
			}

			// Else, we already have the tasks
			else {

				// If the value is not already valid
				if(afindi(tasks[p], '_id', t[0]) === -1) {

					// Set the task based on available ones for the project
					t[1](tasks[p][0] ? tasks[p][0]._id : false);
				}
			}
		}
	}

	// End the work
	function workEnd(callback) {

		// Tell the server to end the current work
		body.update('primary', 'work/end', {
			_id: work._id,
			description: descr
		}).then(data => {

			// If there's data
			if(data) {

				// Clear the work
				workSet(null);

				// If we have a callback
				if(callback) {
					callback();
				}
			}
		}, error => {
			events.get('error').trigger(error);
		});
	}

	// Fetches information about the current work
	function workFetch() {

		// Request from the server if there's any existing open work
		body.read('primary', 'account/work').then(data => {
			workSet(data);
		}, error => {
			events.get('error').trigger(error);
		});
	}

	// Start the work
	function workStart(item) {

		// Add the project to the data
		let oData = {
			project: item.project,
			task: item.task
		}

		// If there's a description, add it
		let sDescription = item.description.trim();
		if(sDescription !== '') {
			oData.description = sDescription;
		}

		// Tell the server to start a work
		body.create('primary', 'work/start', oData).then(data => {

			// If we got data
			if(data) {
				workFetch();
			}
		}, error => {
			events.get('error').trigger(error);
		});
	}

	// End some sort and start some other work
	function workSwap(item) {

		// Store all the current values
		const cur = {
			client: work.client,
			description: descr,
			project: work.project,
			task: work.task
		}

		// Init the new task
		let tostart;

		// If we have an item
		if(item) {
			tostart = item;
		} else {
			tostart = {
				client: pclient,
				project: pproject,
				task: ptask,
				description: pdescr
			}
		}

		// End the current work
		workEnd(() => {

			// Set the new work values to the swap values
			clientSet(tostart.client);
			descrSet(tostart.description);
			projectSet(tostart.project);
			taskSet(tostart.task);

			// Set the prev values to the work ones
			pclientSet(cur.client);
			pdescrSet(cur.description);
			pprojectSet(cur.project);
			ptaskSet(cur.task);

			// Start the new work
			workStart(tostart);
		});
	}

	// If we are still checking for an existing work
	if(work === false) {
		return <Box id="work"><Typography>Loading...</Typography></Box>
	}

	// Render
	return (<>
		<Box id="work">
			{work ? (<>
				<Paper className="work_end">
					<Box className="sectionHeader">
						<Typography>End Existing Work</Typography>
					</Box>
					<Typography>{work.clientName} - {work.projectName} - {work.taskName}</Typography>
					<br />
					<Typography>Started at: {iso(work.start)}</Typography>
					<Box className="field">
						<TextField
							defaultValue={work.description || ''}
							label="Description"
							onChange={ev => descrSet(ev.target.value)}
							placeholder="Description"
							value={descr}
							variant="standard"
						/>
					</Box>
					<Box className="actions">
						<Button color="primary" onClick={workEnd} variant="contained">End</Button>
					</Box>
				</Paper>
				<Paper className="work_start">
					<Box className="sectionHeader">
						<Typography>Swap to other Work?</Typography>
					</Box>
					<Previous
						start={workStart}
						swap={workSwap}
						work={work}
					/>
					<Start
						client={pclient}
						clients={props.clients}
						clientSet={pclientSet}
						project={pproject}
						projects={projects}
						projectSet={pprojectSet}
						task={ptask}
						tasks={tasks}
						taskSet={ptaskSet}
						tasksSet={tasksSet}
					>
						<Box className="field">
							<TextField
								label="Description"
								onChange={ev => pdescrSet(ev.target.value)}
								placeholder="Description"
								value={pdescr}
								variant="standard"
							/>
						</Box>
						<Box className="actions">
							<Button color="primary" onClick={workSwap} variant="contained">Swap</Button>
						</Box>
					</Start>
				</Paper>
			</>) : (
				<Paper className="work_start">
					<Box className="sectionHeader">
						<Typography>Start New Work</Typography>
					</Box>
					<Start
						client={client}
						clients={props.clients}
						clientSet={clientSet}
						project={project}
						projects={projects}
						projectSet={projectSet}
						task={task}
						tasks={tasks}
						taskSet={taskSet}
						tasksSet={tasksSet}
					>
						<Box className="field">
							<TextField
								label="Description"
								onChange={ev => descrSet(ev.target.value)}
								placeholder="Description"
								value={descr}
								variant="standard"
							/>
						</Box>
						<Box className="actions">
							<Button
								color="primary"
								onClick={() => {
									workStart(client, project, task, descr);
								}}
								variant="contained"
							>Start</Button>
						</Box>
					</Start>
					<Previous
						start={workStart}
						swap={workSwap}
					/>
				</Paper>
			)}
		</Box>
		<Paper id="elapsed">
			<Select
				label="Type"
				native
				onChange={ev => {
					localStorage.setItem('work_elapsed_type', ev.target.value);
					elapsedTypeSet(ev.target.value);
				}}
				value={elapsedType}
				variant="standard"
			>
				<option value="day">Today</option>
				<option value="week">This Week</option>
				<option value="month">This Month</option>
			</Select>
			{elapsed(elapsedTime, {show_zero_minutes: true})}
		</Paper>
	</>);
}

// Valid props
Work.propTypes = {
	clients: PropTypes.array.isRequired,
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}