/**
 * Owe
 *
 * Home component for clients to see how much they owe
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2022-05-01
 */

// Ouroboros modules
import { rest } from '@ouroboros/body';
import events from '@ouroboros/events';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

// Material UI
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

/**
 * Owe
 *
 * Shows work start or work end depending on whether the user has an open /
 * uncompleted work record
 *
 * @name Owe
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Owe(props) {

	// State
	let [owes, owesSet] = useState(null);

	// User effect
	useEffect(() => {

		// Request from the server how much they owe
		rest.read('primary', 'client/owes').done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				events.get('error').trigger(rest.errorMessage(res.error));
			}

			// If there's data
			if('data' in res) {
				owesSet(res.data);
			}
		});

	}, [props.user]);

	// If we are still getting the value
	if(owes === false) {
		return <Box id="owes"><Typography>Loading...</Typography></Box>
	}

	// Convert the value to a number
	let fOwes = parseFloat(owes);
	let oState = {
		title: <Typography variant="h2">Paid in Full</Typography>,
		text: <Typography>You currently have no balance and owe us nothing. Thanks so much.</Typography>
	}
	if(fOwes < 0.0) {
		oState = {
			title: <Typography variant="h2">You're Amazing!</Typography>,
			text: <Typography>You don't owe us anything, in fact we owe you work for <span className="blue bold">${owes.substr(1)}</span>. If you did not pay in advance and need some or all funds back, please contact our accounting and we'll get that out to you as soon as possible.</Typography>
		};
	} else if(fOwes > 0.0) {
		oState = {
			title: <Typography variant="h2">Amount Due</Typography>,
			text: [<Typography>You currently have an amount due of <span className="red bold">${owes}</span>. Please try to send payment as soon as you can so we can keep doing great work together.</Typography>,
					<Typography>Use the menu to view invoices awaiting payment</Typography>
			]
		};
	}

	// Render
	return (
		<Paper id="owes">
			{oState.title}
			<br />
			{oState.text}
		</Paper>
	);
}

// Valid props
Owe.propTypes = {
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}