/**
 * Invoices
 *
 * Displays invoices
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-25
 */

// Ouroboros modules
import { rest } from '@ouroboros/body';
import clone from '@ouroboros/clone';
import { Tree } from '@ouroboros/define';
import { Results } from '@ouroboros/define-mui';
import { increment, iso } from '@ouroboros/dates';
import events from '@ouroboros/events';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Material UI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// Locale components
import Invoice from 'components/composites/Invoice';

// Load the invoice definition
import InvoiceDef from 'definitions/invoice';

// Create the Tree using the definition
const InvoiceTree = new Tree(InvoiceDef, {
	__ui__: {
		results: ['_created', 'clientName', 'identifier', 'start', 'end', 'total']
	},
	clientName: { __type__: 'string', __ui__: { title: 'Client' }}
});

/**
 * Previous Month
 *
 * Returns the strings representing the first and last days of the previous
 * month
 *
 * @name previousMonth
 * @access private
 * @return Array
 */
function previousMonth() {

	// Init the return
	let lRet = ['', ''];

	// Get today
	let o = new Date();

	// Set it to the last day of the month
	o.setDate(0);
	o.setHours(23, 59, 59, 0);

	// Store the last day as a timestamp
	lRet[1] = o.getTime() / 1000;

	// Set it to the first day of the month
	o.setDate(1);
	o.setHours(0, 0, 0, 0);

	// Store the first day as a timestamp
	lRet[0] = o.getTime() / 1000;

	// Return the strings
	return lRet;
}

/**
 * Generate
 *
 * Displays a form to generate a new invoice
 *
 * @name Generate
 * @access private
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
function Generate(props) {

	// State
	let [client, clientSet] = useState(props.clients.length ? props.clients[0]._id : null);
	let [previewData, previewDataSet] = useState(false);
	let [range, rangeSet] = useState(previousMonth());

	// Get today's date
	let sToday = iso(new Date(), false);

	// Generate the new invoice
	function generate() {

		// Send the request to the server
		rest.create('primary', 'invoice', {
			client: client,
			start: range[0],
			end: range[1]
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				events.get('error').trigger(rest.errorMessage(res.error));
			}

			// If there was a warning (PDF generation)
			if(res.warning) {
				events.get('warning').trigger(res.warning);
			}

			// If we got data
			if(res.data) {
				props.onSuccess(res.data);
			}
		});
	}

	// Called to preview the invoice info
	function preview() {

		// Send the request to the server
		rest.read('primary', 'invoice/preview', {
			client: client,
			start: range[0],
			end: range[1]
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				events.get('error').trigger(rest.errorMessage(res.error));
			}

			// If there was a warning (PDF generation)
			if(res.warning) {
				events.get('warning').trigger(res.warning);
			}

			// If we got data
			if(res.data) {
				previewDataSet(res.data);
			}
		});
	}

	// Called when either range value is changed
	function rangeUpdate(type, value) {

		// Clone the existing range
		let lRange = clone(range);

		// If we got a start
		if(type === 'start') {
			lRange[0] = (new Date(value + ' 00:00:00')).getTime() / 1000
		} else {
			lRange[1] = (new Date(value + ' 23:59:59')).getTime() / 1000
		}

		// Set the new range
		rangeSet(lRange);
	}

	// Render
	return (
		<Paper>
			<Box className="sectionHeader">
				<Typography>Generate New Invoice</Typography>
			</Box>
			<Box className="form">
				<Grid container spacing={2}>
					<Grid item xs={12} md={6} className="field">
						<FormControl variant="outlined">
							<InputLabel>Client</InputLabel>
							<Select
								label="Client"
								native
								onChange={ev => clientSet(ev.currentTarget.value)}
								value={client}
							>
								{props.clients.map(o =>
									<option key={o._id} value={o._id}>{o.name}</option>
								)}
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={12} md={3} className="field">
						<TextField
							InputLabelProps={{ shrink: true }}
							inputProps={{
								min: '2020-01-01',
								max: sToday
							}}
							label="From"
							onChange={ev => rangeUpdate('start', ev.currentTarget.value)}
							type="date"
							variant="outlined"
							value={iso(range[0], false)}
						/>
					</Grid>
					<Grid item xs={12} md={3} className="field">
						<TextField
							InputLabelProps={{ shrink: true }}
							inputProps={{
								min: '2020-01-01',
								max: sToday
							}}
							label="To"
							onChange={ev => rangeUpdate('end', ev.currentTarget.value)}
							type="date"
							variant="outlined"
							value={iso(range[1], false)}
						/>
					</Grid>
				</Grid>
				<Box className="actions">
					<Button variant="contained" color="secondary" onClick={props.onCancel}>Cancel</Button>
					<Button variant="contained" color="neutral" onClick={preview}>Preview</Button>
					<Button variant="contained" color="primary" onClick={generate}>Generate</Button>
				</Box>
				{previewData &&
					<React.Fragment>
						<Invoice value={previewData} />
						<Box className="actions">
							<Button variant="contained" color="primary" onClick={() => previewDataSet(false)}>Close Preview</Button>
						</Box>
					</React.Fragment>
				}
			</Box>
		</Paper>
	);
}

// Valid props
Generate.propTypes = {
	clients: PropTypes.array.isRequired,
	onCancel: PropTypes.func.isRequired,
	onSuccess: PropTypes.func.isRequired
}

/**
 * Invoices
 *
 * Displays invoices
 *
 * @name Invoices
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Invoices(props) {

	// State
	let [generate, generateSet] = useState(false);
	let [range, rangeSet] = useState(null);
	let [rights, rightsSet] = useState({
		create: false
	})
	let [invoices, invoicesSet] = useState(false);

	// Hooks
	let navigate = useNavigate();

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

			// Make the request to the server
			rest.read('primary', 'invoices', {
				range: range
			}).done(res => {

				// If there's an error
				if(res.error && !res._handled) {
					events.get('error').trigger(rest.errorMessage(res.error));
				}

				// If we got data
				if(res.data) {
					invoicesSet(res.data);
				}
			});
		}
	}, [range]);

	// Called when a new invoice is generated
	function invoiceGenerated(invoice) {

		// Success
		events.get('success').trigger('Invoice generated')

		// Hide the form
		generateSet(false);

		// Add it to the top of the results
		let lInvoices = clone(invoices);
		lInvoices.unshift(invoice);
		invoicesSet(lInvoices);
	}

	// Called to load pdf of invoice
	function invoicePdf(invoice) {

		// Tell the server to generate and return the link
		rest.read('primary', 'invoice/pdf', {
			_id: invoice._id
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				if(res.error.code === 1100) {
					events.get('error').trigger('No such invoice');
				} else {
					events.get('error').trigger(rest.errorMessage(res.error));
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

	// Converts the start and end dates into timestamps
	function rangeUpdate() {
		rangeSet([
			(new Date(refStart.current.value + ' 00:00:00')).getTime() / 1000,
			(new Date(refEnd.current.value + ' 23:59:59')).getTime() / 1000
		]);
	}

	// Generate today date
	let sToday = iso(new Date(), false);

	// Render
	return (
		<Box id="tasks" className="singlePage">
			<Box className="pageHeader flexColumns">
				<Typography className="flexGrow">Invoices</Typography>
				{rights.create &&
					<Box className="bigIcon flexStatic">
						<Tooltip title="Generate Invoice">
							<IconButton onClick={ev => generateSet(b => !b)}>
								<i className={'fas fa-plus-circle ' + (generate ? 'open' : 'close')} />
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
			{generate &&
				<Generate
					onCancel={() => generateSet(false)}
					onSuccess={invoiceGenerated}
					{...props}
				/>
			}
			<br />
			{invoices === false ?
				<Typography>Loading...</Typography>
			:
				<React.Fragment>
					{invoices.length === 0 ?
						<Typography>No invoices found</Typography>
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
							custom={{
								start: value => iso(value.start, false),
								end: value => iso(value.end, false),
								total: value => '$' + value.total
							}}
							data={invoices}
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
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}