/**
 * Invoice
 *
 * Displays a single invoice
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-25
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

// Material UI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Local components
import InvoiceComposite from 'components/composites/Invoice';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';

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
		Rest.read('primary', 'invoice', {
			_id: _id,
			details: true
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				if(res.error.code === 2003) {
					Events.trigger('error', 'No such invoice');
					invoiceSet(null);
				} else {
					Events.trigger('error', Rest.errorMessage(res.error));
				}
			}

			// If we got data
			if(res.data) {
				invoiceSet(res.data);
			}
		});

	}, [_id]);

	// Fetch the URL for the PDF
	function pdf() {

		// Tell the server to generate and return the link
		Rest.read('primary', 'invoice/pdf', {
			_id: _id
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				if(res.error.code === 2003) {
					Events.trigger('error', 'No such invoice');
				} else {
					Events.trigger('error', Rest.errorMessage(res.error));
				}
			}

			// If we got data
			if(res.data) {
				window.open(res.data, '_blank');
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