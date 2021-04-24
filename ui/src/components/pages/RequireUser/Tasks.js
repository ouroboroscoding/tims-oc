/**
 * Tasks
 *
 * Handles whether to load client or worker tasks based on the user type
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
 * @created 2021-04-24
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import Parent from 'format-oc/Parent';

// Material UI
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

// Format Components
import { Results } from 'shared/components/Format';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';
import { date, dateInc, timeElapsed } from 'shared/generic/tools';

// Results info
let TasksParent = new Parent({
	clientName: {__type__: 'string', __react__: {title: 'Client'}},
	projectName: {__type__: 'string', __react__: {title: 'Project'}},
	userName: {__type__: 'string', __react__: {title: 'Employee'}},
	description: {__type__: 'string'},
	start: {__type__: 'timestamp', __react__: {title: 'Started'}},
	end: {__type__: 'timestamp', __react__: {title: 'Finished'}},
	elapsed: {__type__: 'uint', __react__: {type: 'time_elapsed'}}
});

/**
 * Tasks
 *
 * Displays tasks
 *
 * @name Tasks
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Tasks(props) {

	// State
	let [fields, fieldsSet] = useState(['clientName', 'projectName', 'userName', 'description', 'start', 'end', 'elapsed'])
	let [noun, nounSet] = useState(null);
	let [range, rangeSet] = useState(null);
	let [results, resultsSet] = useState(false);

	// Refs
	let refStart = useRef();
	let refEnd = useRef();

	// Load effect
	useEffect(() => {

		// Figure out the noun
		switch(props.user.type) {
			case 'accounting':
			case 'client':
				fieldsSet(['clientName', 'projectName', 'description', 'start', 'end', 'elapsed'])
			// eslint-disable-next-line
			case 'admin':
			case 'manager':
				nounSet('tasks');
				break;

			case 'worker':
				fieldsSet(['clientName', 'projectName', 'description', 'start', 'end', 'elapsed'])
				nounSet('account/tasks');
				break;

			// no default
		}

		// Get a range of the last two weeks
		let oStart = dateInc(-13);
		oStart.setHours(0, 0, 0, 0);
		let oEnd = new Date();
		oEnd.setHours(23, 59, 59, 0);
		rangeSet([
			oStart.getTime() / 1000,
			oEnd.getTime() / 1000
		]);

	}, [props.user])

	// Noun/Range effect
	useEffect(() => {
		// If we have a noun and a range
		if(noun && range) {
			fetch();
		}
	// eslint-disable-next-line
	}, [noun, range]);

	// Fetch the tasks
	function fetch() {

		// Make the request to the server
		Rest.read('primary', noun, {
			start: range[0],
			end: range[1]
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If we got data
			if(res.data) {
				resultsSet(res.data);
			}
		});
	}

	// Converts the start and end dates into timestamps
	function rangeUpdate() {
		rangeSet([
			(new Date(refStart.current.value + ' 00:00:00')).getTime() / 1000,
			(new Date(refEnd.current.value + ' 23:59:59')).getTime() / 1000
		]);
	}

	// Generate today date
	let sToday = date(new Date());

	// Render
	return (
		<Box id="tasks" className="singlePage">
			<Box className="pageHeader">
				<Typography>Tasks</Typography>
			</Box>
			<Box className="filter">
				<TextField
					defaultValue={date(dateInc(-13))}
					inputRef={refStart}
					inputProps={{
						min: '2021-01-01',
						max: sToday
					}}
					label="Start"
					size="small"
					type="date"
					variant="outlined"
					InputLabelProps={{ shrink: true }}
				/>
				<Typography>-</Typography>
				<TextField
					defaultValue={sToday}
					inputRef={refEnd}
					inputProps={{
						min: '2021-01-01',
						max: sToday
					}}
					label="End"
					size="small"
					type="date"
					variant="outlined"
					InputLabelProps={{ shrink: true }}
				/>
				<Button
					color="primary"
					onClick={rangeUpdate}
					variant="contained"
				>Fetch</Button>
			</Box>
			<br />
			{results &&
				<Box className="results">
					{results.length === 0 ?
						<Typography>No results</Typography>
					:
						<Results
							custom={{
								elapsed: row => timeElapsed(row.elapsed)
							}}
							data={results}
							fields={fields}
							noun=""
							orderBy="start"
							remove={false}
							service=""
							totals={true}
							tree={TasksParent}
							update={false}
						/>
					}
				</Box>
			}
		</Box>
	);
}

// Valid props
Tasks.propTypes = {
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}