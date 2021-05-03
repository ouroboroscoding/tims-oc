/**
 * Invoices
 *
 * Displays invoices
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
 * @created 2021-04-25
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import Tree from 'format-oc/Tree';
import { useHistory } from 'react-router-dom';

// Material UI
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import InputLabel from '@material-ui/core/InputLabel';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

// Format Components
import { Results } from 'shared/components/Format';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';
import { clone, date, dateInc } from 'shared/generic/tools';

// Load the invoice definition
import InvoiceDef from 'definitions/invoice';
let InvoiceClone = clone(InvoiceDef)
InvoiceClone.__react__ = {
	results: ['_created', 'clientName', 'identifier', 'start', 'end']
};
InvoiceClone.clientName = {__type__: 'string', __react__: {title: 'Client'}}

// Create the Tree using the definition
const InvoiceTree = new Tree(InvoiceClone);

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
	let [range, rangeSet] = useState(previousMonth());

	// Get today's date
	let sToday = date(new Date());

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

	// Generate the new invoice
	function generate() {

		// Send the request to the server
		Rest.create('primary', 'invoice', {
			client: client,
			start: range[0],
			end: range[1]
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If there was a warning (PDF generation)
			if(res.warning) {
				Events.trigger('warning', res.warning);
			}

			// If we got data
			if(res.data) {
				props.onSuccess(res.data);
			}
		});
	}

	console.log(range);

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
							value={date(range[0])}
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
							value={date(range[1])}
						/>
					</Grid>
				</Grid>
				<Box className="actions">
					<Button variant="contained" color="secondary" onClick={props.onCancel}>Cancel</Button>
					<Button variant="contained" color="primary" onClick={generate}>Generate</Button>
				</Box>
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
	let history = useHistory();

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
		let oStart = dateInc(-365);
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

	// Fetch the invoices
	function fetch() {

		// Make the request to the server
		Rest.read('primary', 'invoices', {
			start: range[0],
			end: range[1]
		}).done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If we got data
			if(res.data) {
				invoicesSet(res.data);
			}
		});
	}

	// Called when a new invoice is generated
	function invoiceGenerated(invoice) {
		console.log(invoice);
	}

	// Called to load pdf of invoice
	function invoicePdf(value) {
		console.log(value);
	}

	// Called to load invoice
	function invoiceView(invoice) {
		history.push('/invoice/' + invoice._id);
	}

	// Converts the start and end dates into timestamps
	function rangeUpdate() {
		rangeSet([
			(new Date(refStart.current.value + ' 00:00:00')).getTime() / 1000,
			(new Date(refEnd.current.value + ' 23:59:59')).getTime() / 1000
		]);
	}

	// Generate today date
	let sToday = date(new Date());

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
					defaultValue={date(dateInc(-365))}
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
				<Typography>-</Typography>
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
								start: value => date(value.start),
								end: value => date(value.end)
							}}
							data={invoices}
							noun=""
							orderBy="_created"
							remove={false}
							service=""
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
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}