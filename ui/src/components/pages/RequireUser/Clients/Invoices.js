/**
 * Clients: Invoices
 *
 * Manage the invoices for a specific client in the system
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2022-05-01
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import Tree from 'format-oc/Tree';
import { useNavigate } from 'react-router-dom';

// Material UI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Shared components
import { Results } from 'shared/components/Format';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';
import { clone } from 'shared/generic/tools';

// Load the client and invoice definitions
import InvoiceDef from 'definitions/invoice';
let InvoiceClone = clone(InvoiceDef)
InvoiceClone.__react__ = {
	results: ['_created', 'identifier', 'start', 'end', 'total']
};

// Create the Tree using the definition
const InvoiceTree = new Tree(InvoiceClone);

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
		Rest.read('primary', 'invoices', {
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

	// Called to load pdf of invoice
	function invoicePdf(invoice) {

		// Tell the server to generate and return the link
		Rest.read('primary', 'invoice/pdf', {
			_id: invoice._id
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
							noun="invoice"
							orderBy="_created"
							remove={false}
							service="primary"
							tree={InvoiceTree}
							update={false}
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