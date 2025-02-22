/**
 * Clients: Payments
 *
 * Manage the payments for a specific client in the system
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2022-05-01
 */

// Ouroboros modules
import body from '@ouroboros/body';
import clone from '@ouroboros/clone';
import { timestamp } from '@ouroboros/dates';
import { Tree } from '@ouroboros/define';
import { Form, Results } from '@ouroboros/define-mui';
import events from '@ouroboros/events';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

// Material UI
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// Local modules
import { bridge } from '@/rest_to_define.js';

// Load the client and payment definitions
import PaymentDef from '@/definitions/payment';

// Create the Tree using the definition
const PaymentTree = new Tree(PaymentDef);

/**
 * Payments
 *
 * Lists out the payments associated with the given client
 *
 * @name Payments
 * @access private
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Payments(props) {

	// State
	let [create, createSet] = useState(false);
	let [results, resultsSet] = useState(false);

	// Load effect
	useEffect(() => {

		// Make the request to the server
		body.read('primary', 'payments', {
			client: props.value._id
		}).then(data => {

			// If there's data
			if(data) {
				resultsSet(data);
			}
		}, error => {
			events.get('error').trigger(error);
		});
	}, [props.value._id]);

	// Called when the create form is submitted
	function createSubmit(payment) {

		// Add the client to the payment
		payment.client = props.value._id;

		// Create the payment in the server
		return bridge('create', 'primary', 'payment', payment, data => {
			if(data) {

				// Success
				events.get('success').trigger('Payment added');

				// Hide the form
				createSet(false);

				// Clone the current payments, add the payment to the top, and set the
				//	new payments
				const lResults = clone(results);
				payment._id = data;
				payment._created = timestamp();
				lResults.unshift(payment);
				resultsSet(lResults);
			}
		});
	}

	// Render
	return (
		<Box className="clients_payments">
			<Box className="sectionHeader flexColumns">
				<Typography className="flexGrow">Payments</Typography>
				<Box className="flexStatic">
					<Tooltip title="Add Payment">
						<IconButton onClick={ev => createSet(b => !b)}>
							<i className={'fas fa-plus-circle ' + (create ? 'open' : 'close')} />
						</IconButton>
					</Tooltip>
				</Box>
			</Box>
			{create &&
				<Paper>
					<Form
						gridSizes={{__default__: {xs: 12, md: 6}}}
						onCancel={ev => createSet(false)}
						onSubmit={createSubmit}
						title="Add Payment"
						tree={PaymentTree}
						type="create"
					/>
				</Paper>
			}
			{results === false ?
				<Typography>Loading...</Typography>
			:
				<React.Fragment>
					{results.length === 0 ?
						<Typography>No payments</Typography>
					:
						<Results
							data={results}
							orderBy="_created"
							tree={PaymentTree}
						/>
					}
				</React.Fragment>
			}
		</Box>
	);
}

// Valid props
Payments.propTypes = {
	value: PropTypes.object.isRequired
}