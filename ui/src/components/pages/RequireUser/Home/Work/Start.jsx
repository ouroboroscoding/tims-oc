/**
 * Work Start
 *
 * Home sub component for starting new work or swapping to new work
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2025-03-09
 */

// Ouroboros modules
import { Form } from '@ouroboros/define-mui';
import events from '@ouroboros/events';

// NPM modules
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { Tree } from '@ouroboros/define';

// Material UI
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
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
 * Start
 *
 * Shows work start and whatever was passed inside it
 *
 * @name Start
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Start({
	children,
	client, clients, clientSet,
	project, projects, projectSet,
	task, tasks, taskSet, tasksSet
}) {

	// State
	const [ create, createSet ] = useState(false);

	// Called when the task form is submitted
	function taskSubmit(task) {

		// Add the project to the task
		task.project = project;

		// Send the task to the server
		return bridge('create', 'primary', 'task', task, data => {

			// Success
			events.get('success').trigger('Task created');

			// Add the ID to the record
			task._id = data;

			// Set the new tasks from the old list and the new record
			tasksSet({ ...tasks, [project]: [ ...tasks[project], task ] });

			// Set the current selected task to this one
			taskSet(data);

			// Hide the create form
			createSet(false);

		}, {
			'1104': [['name', 'Already in use']]
		});
	}

	// Render
	return (
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
						{clients.map(o =>
							<option key={o._id} value={o._id}>{o.name}</option>
						)}
					</Select>
				</FormControl>
			</Box>
			{client && <>
				{!projects[client] ?
					<Typography>Loading...</Typography>
				: <>
					{projects[client].length === 0 ?
						<Typography>No projects associated with client</Typography>
					: <>
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
						: <>
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
									onCancel={() => createSet(false)}
									onSubmit={taskSubmit}
									title="Create Task"
									tree={TaskTree}
									type="create"
								/>
							: task &&
								children
							}
						</> }
					</> }
				</>	}
			</> }
		</Box>
	);
}

// Valid props
Start.propTypes = {
	client: PropTypes.string.isRequired,
	clients: PropTypes.array.isRequired,
	clientSet: PropTypes.func.isRequired,
	project: PropTypes.string.isRequired,
	projects: PropTypes.object.isRequired,
	projectSet: PropTypes.func.isRequired,
	task: PropTypes.string.isRequired,
	tasks: PropTypes.object.isRequired,
	taskSet: PropTypes.func.isRequired,
	tasksSet: PropTypes.func.isRequired
}