/**
 * Clients: Payments
 *
 * Manage the payments for a specific client in the system
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2022-05-01
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import Tree from 'format-oc/Tree';

// Material UI
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

// Shared components
import { Form, Results } from 'shared/components/Format';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';
import { clone } from 'shared/generic/tools';

// Load the client and payment definitions
import PaymentDef from 'definitions/payment';

// Create the Tree using the definition
const PaymentTree = new Tree(clone(PaymentDef));

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
		Rest.read('primary', 'payments', {
			client: props.value._id
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error))
			}

			// If there's data
			if(res.data) {
				resultsSet(res.data);
			}
		});
	}, [props.value._id]);

	// Called when a new payment is created
	function paymentCreated(payment) {

		// Clone the current payments
		let lResults = clone(results);

		// Add the payment to the top
		lResults.unshift(payment);

		// Set the new payments
		resultsSet(lResults);

		// Hide the form
		createSet(false);
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
						beforeSubmit={data => {
							data.client = props.value._id;
							return data;
						}}
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
			{results === false ?
				<Typography>Loading...</Typography>
			:
				<React.Fragment>
					{results.length === 0 ?
						<Typography>No payments</Typography>
					:
						<Results
							data={results}
							noun="payment"
							orderBy="_created"
							remove={false}
							service="primary"
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
	value: PropTypes.object.isRequired
}