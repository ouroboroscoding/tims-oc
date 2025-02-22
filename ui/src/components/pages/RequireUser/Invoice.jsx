/**
 * Invoice
 *
 * Displays a single invoice
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-25
 */

// Ouroboros modules
import body from '@ouroboros/body';
import events from '@ouroboros/events';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

// Material UI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Local components
import InvoiceComposite from '@/components/composites/Invoice';

/**
 * Invoice
 *
 * Displays a single invoice if it's found
 *
 * @name Invoice
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Invoice(props) {

	// State
	let [invoice, invoiceSet] = useState(false);

	// Params
	let { _id } = useParams();

	// ID effect
	useEffect(() => {

		// Get the invoice data from the server
		body.read('primary', 'invoice', {
			_id: _id,
			details: true
		}).then(data => {

			// If we got data
			if(data) {
				invoiceSet(data);
			}
		}, error => {
			if(error.code === 1100) {
				events.get('error').trigger('No such invoice');
				invoiceSet(null);
			} else {
				events.get('error').trigger(error);
			}
		});

	}, [_id]);

	// Fetch the URL for the PDF
	function pdf() {

		// Tell the server to generate and return the link
		body.read('primary', 'invoice/pdf', {
			_id: _id
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

	// Still loading
	if(invoice === false) {
		return <Box className="singlePage"><Typography>Loading...</Typography></Box>
	}

	// Render
	return <InvoiceComposite pdf={pdf} value={invoice} />
}

// Valid props
Invoice.propTypes = {
	mobile: PropTypes.bool.isRequired
}