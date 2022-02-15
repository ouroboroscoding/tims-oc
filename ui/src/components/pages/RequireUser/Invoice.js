/**
 * Invoice
 *
 * Displays a single invoice
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
 * @created 2021-04-25
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

// Material UI
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableFooter from '@material-ui/core/TableFooter';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import { increment, iso, elapsed } from 'shared/generic/dates';
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

		console.log(_id);

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
	return (
		<Box id="invoice" className="singlePage">
			<Box className="header flexColumns">
				<Box className="logo flexStatic"></Box>
				<Box className="company flexGrow">
					<Typography className="name">{invoice.details.company.name}</Typography>
					<Typography className="address">
						{invoice.details.company.address1 + (invoice.details.company.address2 || '')}<br />
						{invoice.details.company.city}, {invoice.details.company.division}, {invoice.details.company.country}
					</Typography>
				</Box>
				<Box className="pdf flexStatic">
					<Tooltip title="Generate PDF">
						<IconButton onClick={pdf}>
							<i className="fas fa-file-pdf" />
						</IconButton>
					</Tooltip>
				</Box>
			</Box>
			<hr />
			<Box className="details flexColumns">
				<Box className="client flexGrow">
					<Typography className="title">Bill To:</Typography>
					<Typography className="name">{invoice.details.client.name}</Typography>
					<Typography className="address">
						{invoice.details.client.address1 + (invoice.details.client.address2 || '')}<br />
						{invoice.details.client.city}, {invoice.details.client.division}, {invoice.details.client.country}
					</Typography>
				</Box>
				<Box className="invoice flexGrow">
					<Typography className="title">Invoice #{invoice.identifier}</Typography>
					{(invoice.details.company.payable_to !== null && invoice.details.company.payable_to !== '') &&
						<Typography>Payable to: {invoice.details.company.payable_to}</Typography>
					}
					<Typography>Created: {iso(invoice._created, false)}</Typography>
					<Typography>Due: {iso(increment(invoice.details.client.due, invoice._created), false)}</Typography>
				</Box>
			</Box>
			<Table className="items">
				<TableHead>
					<TableRow>
						<TableCell className="project">Project</TableCell>
						<TableCell className="hours">Hours</TableCell>
						<TableCell className="amount">Amount</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{invoice.items.map((o,i) =>
						<TableRow className={i%2 === 0 ? 'even' : 'odd'}>
							<TableCell className="project">{o.projectName}</TableCell>
							<TableCell className="hours">{elapsed(o.minutes*60, {show_seconds: false, show_zero_hours: true})}</TableCell>
							<TableCell className="amount">${o.amount}</TableCell>
						</TableRow>
					)}
				</TableBody>
				<TableFooter>
					{invoice.taxes.length > 0 &&
						<React.Fragment>
							<TableRow className="subtotal">
								<TableCell className="name">Sub-Total</TableCell>
								<TableCell className="hours">{elapsed(invoice.minutes*60, {show_seconds: false, show_zero_hours: true})}</TableCell>
								<TableCell className="amount">${invoice.subtotal}</TableCell>
							</TableRow>
							{invoice.taxes.map(o =>
								<TableRow className="tax">
									<TableCell className="name">{o.name}</TableCell>
									<TableCell className="hours">&nbsp;</TableCell>
									<TableCell className="amount">${o.amount}</TableCell>
								</TableRow>
							)}
						</React.Fragment>
					}
					<TableRow className="total">
						<TableCell className="name">Total</TableCell>
						<TableCell className="hours">&nbsp;</TableCell>
						<TableCell className="amount">${invoice.total}</TableCell>
					</TableRow>
				</TableFooter>
			</Table>
		</Box>
	);
}

// Valid props
Invoice.propTypes = {
	mobile: PropTypes.bool.isRequired
}