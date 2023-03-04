/**
 * Work
 *
 * Handles whether to load client or worker work based on the user type
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-24
 */

// Ouroboros modules
import { rest } from '@ouroboros/body';
import clone from '@ouroboros/clone';
import { Tree } from '@ouroboros/define';
import { Results } from '@ouroboros/define-mui';
import { increment, iso, elapsed } from '@ouroboros/dates';
import events from '@ouroboros/events';
import { afindi, merge } from '@ouroboros/tools';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

// Material UI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// Local modules
import { bridge } from 'rest_to_define.js';

// Definitions
import WorkDef from 'definitions/work';

// Create the tree
const WorkTree = new Tree(WorkDef, {
	__ui__: { update: ['start', 'end', 'description'] },
	clientName: {__type__: 'string', __ui__: { title: 'Client' } },
	projectName: {__type__: 'string', __ui__: { title: 'Project' } },
	taskName: {__type__: 'string', __ui__: { title: 'Task' } },
	userName: {__type__: 'string', __ui__: { title: 'Employee' } },
	elapsed: {__type__: 'uint', __ui__: { type: 'time_elapsed' } }
});

/**
 * Work
 *
 * Displays work records
 *
 * @name Work
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Work(props) {

	// State
	let [remove, removeSet] = useState(false);
	let [fields, fieldsSet] = useState([])
	let [noun, nounSet] = useState(null);
	let [range, rangeSet] = useState(null);
	let [records, recordsSet] = useState(false);

	// Refs
	let refStart = useRef();
	let refEnd = useRef();

	// Load effect
	useEffect(() => {

		// Get a range of the last two weeks
		let oStart = increment(-13);
		oStart.setHours(0, 0, 0, 0);
		let oEnd = new Date();
		oEnd.setHours(23, 59, 59, 0);

		// Figure out the noun
		switch(props.user.type) {
			case 'accounting':
			case 'client':
				fieldsSet(['clientName', 'projectName', 'taskName', 'description', 'elapsed'])
				nounSet('client/works');
				removeSet(false);
				break;

			case 'admin':
			case 'manager':
				fieldsSet(['clientName', 'projectName', 'taskName', 'userName', 'description', 'start', 'end', 'elapsed']);
				nounSet('works');
				removeSet(true);
				break;

			case 'worker':
				oStart = new Date();
				oStart.setHours(0, 0, 0, 0);
				fieldsSet(['clientName', 'projectName', 'taskName', 'description', 'start', 'end', 'elapsed'])
				nounSet('account/works');
				removeSet(false);
				break;

			// no default
		}

		// Set the default range
		rangeSet([
			oStart.getTime() / 1000,
			oEnd.getTime() / 1000
		]);

	}, [props.user])

	// Noun/Range effect
	useEffect(() => {
		// If we have a noun and a range
		if(noun && range) {
			rest.read('primary', noun, {
				start: range[0],
				end: range[1]
			}).done(res => {

				// If there's an error
				if(res.error && !res._handled) {
					events.get('error').trigger(rest.errorMessage(res.error));
				}

				// If we got data
				if(res.data) {
					recordsSet(res.data);
				}
			});
		}
	}, [noun, range]);

	// Converts the start and end dates into timestamps
	function rangeUpdate() {
		rangeSet([
			(new Date(refStart.current.value + ' 00:00:00')).getTime() / 1000,
			(new Date(refEnd.current.value + ' 23:59:59')).getTime() / 1000
		]);
	}

	// Called when the delete icon is clicked
	function deleteClick(key) {

		// Delete it from the server
		rest.delete('primary', 'work', {
			__id: key
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				events.get('error').trigger(rest.errorMessage(res.error));
			}

			// If it was deleted
			if(res.data) {

				// Success
				events.get('success').trigger('Work deleted');

				// Remove it from the records
				let i = afindi(records, '_id', key);
				if(i > -1) {
					recordsSet(value => {
						value.splice(i, 1);
						return clone(value);
					});
				}
			}
		});
	}

	// Called when the update form is submitted
	function updateSubmit(work, key) {

		// Add the ID to the work
		work._id = key;

		// Send the update to the server
		return bridge('update', 'primary', 'work', work, data => {
			if(data) {

				// Success
				events.get('success').trigger('Work updated');

				// Find the record
				let i = afindi(records, '_id', work._id);

				// If it's found, update it in the list of records
				if(i > -1) {
					recordsSet(value => {
						const lRecords = clone(records);
						merge(lRecords[i], work);
						lRecords[i].elapsed = lRecords[i].end - lRecords[i].start;
						return lRecords;
					});
				}
			}
		});
	}

	// Generate today date
	let sToday = iso(new Date(), false);

	// Render
	return (
		<Box id="works" className="singlePage">
			<Box className="pageHeader">
				<Typography>Work</Typography>
			</Box>
			<Box className="filter">
				<TextField
					defaultValue={props.user.type === 'worker' ? sToday : iso(increment(-13), false)}
					inputRef={refStart}
					inputProps={{
						min: '2020-01-01',
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
						min: '2020-01-01',
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
			{records &&
				<Box className="records">
					{records.length === 0 ?
						<Typography>No records</Typography>
					:
						<Results
							custom={{
								elapsed: row => elapsed(row.elapsed, {show_zero_minutes: true})
							}}
							data={records}
							fields={fields}
							onDelete={remove ? deleteClick : false}
							onUpdate={remove ? updateSubmit : false}
							orderBy="start"
							totals={true}
							tree={WorkTree}
						/>
					}
				</Box>
			}
		</Box>
	);
}

// Valid props
Work.propTypes = {
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}