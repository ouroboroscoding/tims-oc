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
	clients: false,
	company: false,
	invoices: false,
	projects: false,
	tasks: false,
	users: false
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
			clients: Rights.has('client', 'read') && Rights.idents('client').length === 0,
			company: Rights.has('company', 'read'),
			invoices: Rights.has('invoice', 'read'),
			projects: Rights.has('project', 'read'),
			tasks: !Rights.has('task', 'read'),
			users: Rights.has('user', 'read')
		} : _NO_RIGHTS);
	}, [props.user]);

	// Render
	return (
		<Drawer
			anchor="left"
			id="menu"
			open={props.open}
			onClose={props.onClose}
		>
			<List>
				{rights.clients &&
					<Link to="/clients" onClick={props.onClose}>
						<ListItem button>
							<ListItemIcon><i className="fas fa-user-tie" /></ListItemIcon>
							<ListItemText primary="Clients" />
						</ListItem>
					</Link>
				}
				{rights.users &&
					<Link to="/users" onClick={props.onClose}>
						<ListItem button>
							<ListItemIcon><i className="fas fa-users" /></ListItemIcon>
							<ListItemText primary="Users" />
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
