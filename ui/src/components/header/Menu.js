/**
 * Menu
 *
 * Handles the menu drawer
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCooding
 * @created 2021-04-11
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Material UI
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

// Shared communication modules
import Rights from 'shared/communication/rights';

// No Rights
const _NO_RIGHTS = {
	client: false,
	company: false,
	invoices: false,
	project: false,
	task: false,
	user: false
}

/**
 * Menu
 *
 * Manages the menu (drawer)
 *
 * @name Menu
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Menu(props) {

	// State
	let [rights, rightsSet] = useState(_NO_RIGHTS);

	// User effect
	useEffect(() => {
		rightsSet(props.user ? {
			client: Rights.has('company', 'read'),
			company: Rights.has('company', 'read'),
			invoices: Rights.has('invoice', 'read'),
			project: Rights.has('project', 'read'),
			task: !Rights.has('task', 'read'),
			user: Rights.has('user', 'read')
		} : _NO_RIGHTS);
	}, [props.user])

	// Render
	return (
		<Drawer
			anchor="left"
			id="menu"
			open={props.open}
			onClose={props.onClose}
		>
			<List>
				{rights.client &&
					<Link to="/client" onClick={props.onClose}>
						<ListItem button>
							<ListItemIcon>{/*<LinkIcon />*/}</ListItemIcon>
							<ListItemText primary="Client" />
						</ListItem>
					</Link>
				}
			</List>
		</Drawer>
	);
}

// Valid props
Menu.propTypes = {
	onClose: PropTypes.func.isRequired,
	open: PropTypes.bool.isRequired
}
