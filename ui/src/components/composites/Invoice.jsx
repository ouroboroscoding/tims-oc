/**
 * Invoice
 *
 * Handles displaying an invoice
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2023-02-28
 */

// Ouroboros modules
import { increment, iso, elapsed } from '@ouroboros/dates';

// NPM modules
import PropTypes from 'prop-types';
import React from 'react';

// Material UI
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

/**
 * Invoice
 *
 * Displays a single invoice based on passed data
 *
 * @name Invoice
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Invoice(props) {

	// Currency
	const currency = props.value.details.client.currency === 'GBP' ? '£' : '$';

	// Render
	return (
		<Box id="invoice" className="singlePage">
			<Box className="header flexColumns">
				<Box className="logo flexStatic"></Box>
				<Box className="company flexGrow">
					<Typography className="name">{props.value.details.company.name}</Typography>
					<Typography className="address">
						{props.value.details.company.address1 + (props.value.details.company.address2 || '')}<br />
						{props.value.details.company.city}, {props.value.details.company.division}, {props.value.details.company.country}
					</Typography>
				</Box>
				{props.pdf &&
					<Box className="pdf flexStatic">
						<Tooltip title="Generate PDF">
							<IconButton onClick={props.pdf}>
								<i className="fas fa-file-pdf" />
							</IconButton>
						</Tooltip>
					</Box>
				}
			</Box>
			<hr />
			<Box className="details flexColumns">
				<Box className="client flexGrow">
					<Typography className="title">Bill To:</Typography>
					<Typography className="name">
						{props.value.details.client.name}<br />
						{props.value.details.client.address1 &&
							<React.Fragment>
								{props.value.details.client.address1 + (props.value.details.client.address2 || '')}<br />
							</React.Fragment>
						}
						{props.value.details.client.city}, {props.value.details.client.division}, {props.value.details.client.country}
					</Typography>
				</Box>
				<Box className="invoice flexGrow">
					<Typography className="title">Invoice #{props.value.identifier}</Typography>
					{(props.value.details.company.payable_to !== null && props.value.details.company.payable_to !== '') &&
						<Typography>Payable to: {props.value.details.company.payable_to}</Typography>
					}
					<Typography>Created: {iso(props.value._created, false)}</Typography>
					<Typography>Due: {iso(increment(props.value.details.client.due, props.value._created), false)}</Typography>
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
					{props.value.items.map((o,i) =>
						<TableRow key={o.projectName} className={i%2 === 0 ? 'even' : 'odd'}>
							<TableCell className="project">{o.projectName}</TableCell>
							<TableCell className="hours">{elapsed(o.minutes*60, {show_seconds: false, show_zero_hours: true})}</TableCell>
							<TableCell className="amount">{currency}{o.amount}</TableCell>
						</TableRow>
					)}
					{props.value.additional && props.value.additional.map((o,i) =>
						<TableRow key={o._id} className={(i+props.value.items.length)%2 === 0 ? 'even' : 'odd'}>
							<TableCell className="project">{o.text}</TableCell>
							<TableCell className="hours">&nbsp;</TableCell>
							<TableCell className="amount">{currency}{o.type === 'discount' && '-'}{o.amount}</TableCell>
						</TableRow>
					)}
				</TableBody>
				<TableFooter>
					{props.value.taxes.length > 0 &&
						<React.Fragment>
							<TableRow className="subtotal">
								<TableCell className="name">Sub-Total</TableCell>
								<TableCell className="hours">{elapsed(props.value.minutes*60, {show_seconds: false, show_zero_hours: true})}</TableCell>
								<TableCell className="amount">{currency}{props.value.subtotal}</TableCell>
							</TableRow>
							{props.value.taxes.map(o =>
								<TableRow key={o.name} className="tax">
									<TableCell className="name">{o.name}</TableCell>
									<TableCell className="hours">&nbsp;</TableCell>
									<TableCell className="amount">{currency}{o.amount}</TableCell>
								</TableRow>
							)}
						</React.Fragment>
					}
					<TableRow className="total">
						<TableCell className="name">Total</TableCell>
						<TableCell className="hours">&nbsp;</TableCell>
						<TableCell className="amount">{currency}{props.value.total}</TableCell>
					</TableRow>
				</TableFooter>
			</Table>
		</Box>
	);
}

// Valid props
Invoice.propTypes = {
	pdf: PropTypes.oneOfType([
		PropTypes.func,
		PropTypes.bool
	]),
	value: PropTypes.shape({
		_created: PropTypes.number.isRequired,
		additional: PropTypes.arrayOf(PropTypes.object),
		details: PropTypes.exact({
			client: PropTypes.object.isRequired,
			company: PropTypes.object.isRequired
		}),
		end: PropTypes.number.isRequired,
		identifier: PropTypes.string.isRequired,
		items: PropTypes.arrayOf(PropTypes.object).isRequired,
		start: PropTypes.number.isRequired,
		subtotal: PropTypes.string.isRequired,
		total: PropTypes.string.isRequired
	})
}

// Default props
Invoice.defaultProps = {
	pdf: false
}