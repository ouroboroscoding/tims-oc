/**
 * Payments
 *
 * Displays payments
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-25
 */

// Ouroboros modules
import body from '@ouroboros/body';
import clone from '@ouroboros/clone';
import { increment, iso, timestamp } from '@ouroboros/dates';
import { Tree } from '@ouroboros/define';
import { Form, Results, Options } from '@ouroboros/define-mui';
import events from '@ouroboros/events';
import { afindo } from '@ouroboros/tools';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

// Material UI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// Local modules
import { bridge } from '@/rest_to_define.js';

// Load the payment definition
import PaymentDef from '@/definitions/payment';

// Create the dynamic clients options
const ClientOptions = new Options.Fetch(() => {
	return new Promise(resolve => {
		body.read('primary', 'clients').then(data => {
			if(data) {
				resolve(data);
			}
		});
	});
});

// Create the Tree using the definition
const PaymentTree = new Tree(PaymentDef, {
	__ui__: {
		create: ['client', 'transaction', 'amount'],
		results: ['_created', 'clientName', 'transaction', 'amount']
	},
	client: {
		__ui__: {
			options: ClientOptions,
			type: 'select'
		}
	},
	clientName: { __type__: 'string', __ui__: { title: 'Client' } }
});

/**
 * Payments
 *
 * Displays payments
 *
 * @name Payments
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Payments(props) {

	// State
	let [create, createSet] = useState(false);
	let [range, rangeSet] = useState(null);
	let [rights, rightsSet] = useState({
		create: false
	})
	let [payments, paymentsSet] = useState(false);

	// Refs
	let refStart = useRef();
	let refEnd = useRef();

	// Load effect
	useEffect(() => {

		// Set Rights
		rightsSet({
			create: ['admin', 'accounting'].includes(props.user.type)
		});

		// Get a range of the last 365 days
		let oStart = increment(-365);
		oStart.setHours(0, 0, 0, 0);
		let oEnd = new Date();
		oEnd.setHours(23, 59, 59, 0);
		rangeSet([
			oStart.getTime() / 1000,
			oEnd.getTime() / 1000
		]);

	}, [props.user]);

	// Range effect
	useEffect(() => {

		// If we have a range
		if(range) {

			// Make the request to the server
			body.read('primary', 'payments', {
				range: range
			}).then(data => {

				// If we got data
				if(data) {
					paymentsSet(data);
				}
			}, error => {
				events.get('error').trigger(error);
			});
		}
	}, [range]);

	// Called when the payment form is submitted
	function paymentSubmit(payment) {

		// Send the payment to the server
		return bridge('create', 'primary', 'payment', payment, data => {
			if(data) {

				// Success
				events.get('success').trigger('Payment added');

				// Hide the form
				createSet(false);

				// Add the ID and created
				payment._id = data;
				payment._created = timestamp();

				// Find the client name
				const lClient = afindo(ClientOptions.get(), 0, payment.client);
				if(lClient) {
					payment.clientName = lClient[1];
				}

				// Add it to the top of the results
				let lPayments = clone(payments);
				lPayments.unshift(payment);
				paymentsSet(lPayments);
			}
		}, {
			'1101': [['transaction', 'Already added']]
		});
	}

	// Converts the start and end dates into timestamps
	function rangeUpdate() {
		rangeSet([
			(new Date(refStart.current.value + ' 00:00:00')).getTime() / 1000,
			(new Date(refEnd.current.value + ' 23:59:59')).getTime() / 1000
		]);
	}

	// Create today date
	let sToday = iso(new Date(), false);

	// Render
	return (
		<Box id="tasks" className="singlePage">
			<Box className="pageHeader flexColumns">
				<Typography className="flexGrow">Payments</Typography>
				{rights.create &&
					<Box className="bigIcon flexStatic">
						<Tooltip title="Create Payment">
							<IconButton onClick={ev => createSet(b => !b)}>
								<i className={'fas fa-plus-circle ' + (create ? 'open' : 'close')} />
							</IconButton>
						</Tooltip>
					</Box>
				}
			</Box>
			<Box className="filter">
				<TextField
					defaultValue={iso(increment(-365), false)}
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
				<span> - </span>
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
				&nbsp;&nbsp;
				<Button
					color="primary"
					onClick={rangeUpdate}
					variant="contained"
				>Fetch</Button>
			</Box>
			{create &&
				<Paper>
					<Form
						gridSizes={{__default__: {xs: 12, md: 4}}}
						onCancel={ev => createSet(false)}
						onSubmit={paymentSubmit}
						title="Add Payment"
						tree={PaymentTree}
						type="create"
					/>
				</Paper>
			}
			<br />
			{payments === false ?
				<Typography>Loading...</Typography>
			:
				<React.Fragment>
					{payments.length === 0 ?
						<Typography>No payments found</Typography>
					:
						<Results
							custom={{
								amount: value => '$' + value.amount
							}}
							data={payments}
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
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}