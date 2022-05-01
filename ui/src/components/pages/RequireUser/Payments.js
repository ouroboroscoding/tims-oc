/**
 * Payments
 *
 * Displays payments
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-25
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import Tree from 'format-oc/Tree';

// Material UI
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

// Format Components
import { Form, Results } from 'shared/components/Format';
import { SelectData } from 'shared/components/Format/Shared';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import { increment, iso } from 'shared/generic/dates';
import Events from 'shared/generic/events';
import { clone } from 'shared/generic/tools';

// Load the payment definition
import PaymentDef from 'definitions/payment';
let PaymentClone = clone(PaymentDef)
PaymentClone.__react__ = {
	create: ['client', 'transaction', 'amount'],
	results: ['_created', 'clientName', 'transaction', 'amount']
};
PaymentClone.client.__react__ = {
	options: new SelectData('primary', 'clients', '_id', 'name'),
	type: 'select'
}
PaymentClone.clientName = {__type__: 'string', __react__: {title: 'Client'}}

// Create the Tree using the definition
const PaymentTree = new Tree(PaymentClone);

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

	}, [props.user])

	// Range effect
	useEffect(() => {
		// If we have a range
		if(range) {
			fetch();
		}
	// eslint-disable-next-line
	}, [range]);

	// Fetch the payments
	function fetch() {

		// Make the request to the server
		Rest.read('primary', 'payments', {
			range: range
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If we got data
			if(res.data) {
				paymentsSet(res.data);
			}
		});
	}

	// Called when a new payment is created
	function paymentCreated(payment) {

		// Hide the form
		createSet(false);

		// Add it to the top of the results
		let lPayments = clone(payments);
		lPayments.unshift(payment);
		paymentsSet(lPayments);
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
						cancel={ev => createSet(false)}
						noun="payment"
						service="primary"
						success={paymentCreated}
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
							noun=""
							orderBy="_created"
							remove={false}
							service=""
							tree={PaymentTree}
							update={false}
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