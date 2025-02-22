/**
 * Clients: Invoices
 *
 * Manage the invoices for a specific client in the system
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2022-05-01
 */

// Ouroboros modules
import body from '@ouroboros/body';
import { Tree } from '@ouroboros/define';
import { Results } from '@ouroboros/define-mui';
import events from '@ouroboros/events';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Material UI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Load the client and invoice definitions
import InvoiceDef from '@/definitions/invoice';

// Create the Tree using the definition
const InvoiceTree = new Tree(InvoiceDef, {
	__ui__: {
		results: ['_created', 'identifier', 'start', 'end', 'total']
	}
});

/**
 * Invoices
 *
 * Lists out the invoices associated with the given client
 *
 * @name Invoices
 * @access private
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Invoices(props) {

	// State
	let [results, resultsSet] = useState(false);

	// Hooks
	let navigate = useNavigate();

	// Load effect
	useEffect(() => {

		// Make the request to the server
		body.read('primary', 'invoices', {
			client: props.value._id
		}).then(data => {

			// If there's data
			if(data) {
				resultsSet(data);
			}
		}, error => {
			events.get('error').trigger(error)
		});
	}, [props.value._id]);

	// Called to load pdf of invoice
	function invoicePdf(invoice) {

		// Tell the server to generate and return the link
		body.read('primary', 'invoice/pdf', {
			_id: invoice._id
		}).then(data => {

			// If we got data
			if(data) {
				window.open(data, '_blank');
			}
		}, error => {
			if(error.code === 1100) {
				events.get('error').trigger('No such invoice');
			} else {
				events.get('error').trigger(error);
			}
		});
	}

	// Called to load invoice
	function invoiceView(invoice) {
		navigate('/invoice/' + invoice._id);
	}

	// Render
	return (
		<Box className="clients_invoices">
			<Box className="sectionHeader flexColumns">
				<Typography className="flexGrow">Invoices</Typography>
			</Box>
			{results === false ?
				<Typography>Loading...</Typography>
			:
				<React.Fragment>
					{results.length === 0 ?
						<Typography>No invoices</Typography>
					:
						<Results
							actions={[{
								tooltip: 'View Invoice',
								icon: 'fas fa-external-link-square-alt',
								callback: invoiceView
							}, {
								tooltip: 'Load PDF',
								icon: 'fas fa-file-pdf',
								callback: invoicePdf
							}]}
							data={results}
							orderBy="_created"
							tree={InvoiceTree}
						/>
					}
				</React.Fragment>
			}
		</Box>
	);
}

// Valid props
Invoices.propTypes = {
	rights: PropTypes.object.isRequired,
	value: PropTypes.object.isRequired
}