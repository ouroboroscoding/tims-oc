/**
 * Work
 *
 * Handles whether to load client or worker work based on the user type
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-24
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import Tree from 'format-oc/Tree';

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
import { increment, iso, elapsed } from 'shared/generic/dates';
import Events from 'shared/generic/events';
import { afindi, clone } from 'shared/generic/tools';

// Definitions
import WorkDef from 'definitions/work';

// Clone the definition and add the extra fields
let WorkFull = clone(WorkDef);
WorkFull.__react__ = {
	update: ['start', 'end', 'description']
}
WorkFull.clientName = {__type__: 'string', __react__: {title: 'Client'}};
WorkFull.projectName = {__type__: 'string', __react__: {title: 'Project'}};
WorkFull.taskName = {__type__: 'string', __react__: {title: 'Task'}};
WorkFull.userName = {__type__: 'string', __react__: {title: 'Employee'}};
WorkFull.elapsed = {__type__: 'uint', __react__: {type: 'time_elapsed'}};

// Create the tree
const WorkTree = new Tree(WorkFull);

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
	let [results, resultsSet] = useState(false);

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
			fetch();
		}
	// eslint-disable-next-line
	}, [noun, range]);

	// Fetch the work records
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

	// Called when a record is removed
	function removed(_id) {

		// Find the record
		let i = afindi(results, '_id', _id);

		// If it's found, remove it from the list of results
		if(i > -1) {
			resultsSet(value => {
				value.splice(i, 1);
				return clone(value);
			});
		}
	}

	// Called when a record is updated
	function updated(record) {

		// Find the record
		let i = afindi(results, '_id', record._id);

		// If it's found, update it in the list of results
		if(i > -1) {
			resultsSet(value => {
				record.start = parseInt(record.start);
				record.end = parseInt(record.end);
				results[i] = record;
				return clone(value);
			});
		}
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
			{results &&
				<Box className="results">
					{results.length === 0 ?
						<Typography>No results</Typography>
					:
						<Results
							custom={{
								elapsed: row => elapsed(row.elapsed, {show_zero_minutes: true})
							}}
							data={results}
							fields={fields}
							noun="work"
							orderBy="start"
							remove={remove ? removed : false}
							service="primary"
							totals={true}
							tree={WorkTree}
							update={remove ? updated : false}
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