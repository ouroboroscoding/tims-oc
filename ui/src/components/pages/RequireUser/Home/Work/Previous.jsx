/**
 * Work Previous
 *
 * Home sub component for displaying previous work
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2025-06-21
 */

// Ouroboros modules
import body from '@ouroboros/body';
import { safeLocalStorage } from '@ouroboros/browser';
import { timeframe } from '@ouroboros/dates';
import events from '@ouroboros/events';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

// Material UI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';

/**
 * Previous
 *
 * Shows previous work with an option to start it or swap it
 *
 * @name Previous
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Previous({
	start, swap, work
}) {

	// State
	const [ opts, optsSet ] = useState(
		safeLocalStorage.json('work_prev_list', {
			count: 1,
			type: 'day'
		})
	);
	const [ results, resultsSet ] = useState(null);

	// Previous list effect
	useEffect(() => {
		fetch();
	}, [ opts ]);

	// Called to fetch the previous work done
	function fetch() {

		// Generate the timeframe
		const lDates = timeframe(opts.count, opts.type, 'timestamp');

		// Send the request to the server
		body.read('primary', 'account/works', {
			'start': lDates[0],
			'end': lDates[1]
		}).then(data => {

			// Current work fingerprint
			const workId = work ? `${work.client}-${work.project}-${work.task}` : null;

			// Create a unique list
			const unique = {};
			for(const o of data) {
				const id = `${o.client}-${o.project}-${o.task}`;
				if(!(id in unique) && id !== workId) {
					unique[id] = o;
				}
			}
			resultsSet(Object.values(unique));
		}, error => {
			events.get('error').trigger(error);
		});
	}

	// Render
	return (
		<Box>
			<Typography>
				Previous work in the last &nbsp;
				<Select
					native
					onChange={ev => {
						optsSet(o => {
							const n = { ...o, count: parseInt(ev.target.value) };
							localStorage.setItem('work_prev_list', JSON.stringify(n));
							return n;
						});
					}}
					value={opts.count}
					variant="standard"
				>
					{[...Array(30)].map((_, i) => (
						<option key={i} value={i + 1}>{i + 1}</option>
					))}
				</Select>&nbsp;
				<Select
					native
					onChange={ev => {
						optsSet(o => {
							const n = { ...o, type: ev.target.value }
							localStorage.setItem('work_prev_list', JSON.stringify(n));
							return n;
						});
					}}
					value={opts.type}
					variant="standard"
				>
					{[ 'day', 'week' ].map(s => (
						<option key={s} value={s}>{s}{opts.count > 1 && 's'}</option>
					))}
				</Select>
			</Typography>
			{results && results.map(o =>
				<Typography key={o._id} className="flexColumns">
					<span className="flexGrow">
						{o.clientName} - {o.projectName} - {o.taskName}
					</span>
					<Button
						onClick={() => work ? swap(o) : start(o)}
						size="small"
						variant="contained"
					>{work ? 'Swap' : 'Start'}</Button>
				</Typography>
			)}
		</Box>
	);
}

// Valid props
Previous.propTypes = {
	start: PropTypes.func.isRequired,
	swap: PropTypes.func.isRequired,
	work: PropTypes.object
}