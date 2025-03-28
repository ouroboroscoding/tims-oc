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
import body from '@ouroboros/body';
import clone from '@ouroboros/clone';
import { Node, Tree } from '@ouroboros/define';
import { DefineNode, Results } from '@ouroboros/define-mui';
import { increment, iso } from '@ouroboros/dates';
import events from '@ouroboros/events';
import { afindi } from '@ouroboros/tools';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';

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
import Invoice from '@/components/composites/Invoice';

// Load the invoice definition
import InvoiceDef from '@/definitions/invoice';
import InvoiceAdditionalDef from '@/definitions/invoice_additional';

// Create the Tree using the definition
const InvoiceTree = new Tree(InvoiceDef, {
	__ui__: {
		__results__: [
			'_created', 'clientName', 'identifier', 'start', 'end', 'total'
		]
	},
	clientName: { __type__: 'string', __ui__: { __title__: 'Client' }}
});
const AdditionalAmount = new Node(InvoiceAdditionalDef.amount);

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
	const [client, clientSet] = useState(props.clients.length ? props.clients[0]._id : null);
	const [lines, linesSet] = useState([]);
	const [previewData, previewDataSet] = useState(false);
	const [range, rangeSet] = useState(previousMonth());

	// Get today's date
	let sToday = iso(new Date(), false);

	// Generate the new invoice
	function generate() {

		// Init data
		const oData = {
			client: client,
			start: range[0],
			end: range[1]
		};

		// Add additional lines if necessary
		if(lines.length) {
			const lAdditional = [];
			for(const o of lines) {
				lAdditional.push({
					text: o.text,
					type: o.type,
					amount: o.amount
				});
			}
			oData.additional = lAdditional;
		}

		// Send the request to the server
		body.create('primary', 'invoice', oData).then(data => {

			// If we got data
			if(data) {
				props.onSuccess(data);
			}
		}, error => {
			events.get('error').trigger(error);
		});
	}

	// Called to add a new custom line to the invoice
	function lineAdd() {
		linesSet(val => {
			const lLines = clone(val);
			lLines.push({
				_id: uuid(),
				amount: '0.00',
				text: '',
				type: 'cost'
			});
			return lLines;
		});
	}

	// Called when any field on a line changes
	function lineChange(_id, field, value) {
		linesSet(val => {
			const i = afindi(val, '_id', _id);
			if(i > -1) {
				const lLines = clone(val);
				lLines[i][field] = value;
				return lLines;
			} else {
				return val;
			}
		});
	}

	// Called to remove a line
	function lineRemove(_id) {
		linesSet(val => {
			const i = afindi(val, '_id', _id);
			if(i > -1) {
				const lLines = clone(val);
				lLines.splice(i, 1);
				return lLines;
			} else {
				return val;
			}
		});
	}

	// Called to preview the invoice info
	function preview() {

		// Init data
		const oData = {
			client: client,
			start: range[0],
			end: range[1]
		};

		// Add additional lines if necessary
		if(lines.length) {
			const lAdditional = [];
			for(const o of lines) {
				lAdditional.push({
					text: o.text,
					type: o.type,
					amount: o.amount
				});
			}
			oData.additional = lAdditional;
		}

		// Send the request to the server
		body.read('primary', 'invoice/preview', oData).then(data => {

			// If we got data
			if(data) {
				previewDataSet(data);
			}
		}, error => {
			events.get('error').trigger(error);
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
					{lines.map((o, i) =>
						<Grid item xs={12} key={o._id}>
							<Box className="flexColumns">
								<Box className="flexGrow">
									<Grid container spacing={2}>
										<Grid item xs={12} md={6} className="field">
											<TextField
												InputLabelProps={{ shrink: true }}
												inputProps={{
													maxLength: 255
												}}
												label="Text"
												onChange={ev => lineChange(o._id, 'text', ev.target.value)}
												type="text"
												variant="outlined"
												value={o.text}
											/>
										</Grid>
										<Grid item xs={12} md={3} className="field">
											<FormControl variant="outlined">
												<InputLabel>Type</InputLabel>
												<Select
													label="Type"
													native
													onChange={ev => lineChange(o._id, 'type', ev.target.value)}
													value={o.type}
												>
													<option value="cost">Cost</option>
													<option value="discount">Discount</option>
												</Select>
											</FormControl>
										</Grid>
										<Grid item xs={12} md={3} className="field">
											<DefineNode
												name="amount"
												node={AdditionalAmount}
												onChange={val => lineChange(o._id, 'amount', val)}
												type="create"
												value={o.amount}
											/>
										</Grid>
									</Grid>
								</Box>
								<Box className="flexStatic">
									<Tooltip title="Add Line">
										<IconButton onClick={ev => lineRemove(o._id)}>
											<i className="fas fa-trash-alt red" />
										</IconButton>
									</Tooltip>
								</Box>
							</Box>
						</Grid>
					)}
					<Grid item xs={12}>
						<Box className="actions">
							<Tooltip title="Add Line">
								<IconButton onClick={lineAdd}>
									<i className="fas fa-plus-circle blue" />
								</IconButton>
							</Tooltip>
						</Box>
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
			body.read('primary', 'invoices', {
				range: range
			}).then(data => {

				// If we got data
				if(data) {
					invoicesSet(data);
				}
			}, error => {
				events.get('error').trigger(error);
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