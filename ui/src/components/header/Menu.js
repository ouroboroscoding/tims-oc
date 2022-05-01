/**
 * Menu
 *
 * Handles the menu drawer
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
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

// No Rights
const _NO_RIGHTS = {
	clients: false,
	company: false,
	invoices: false,
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
			clients: ['admin', 'accounting', 'manager'].includes(props.user.type),
			company: props.user.type === 'admin',
			invoices: ['admin', 'accounting', 'client'].includes(props.user.type),
			payments: ['admin', 'accounting', 'client'].includes(props.user.type),
			tasks: ['admin', 'manager'].includes(props.user.type),
			users: ['admin', 'manager'].includes(props.user.type),
			work: ['admin', 'manager', 'client', 'worker'].includes(props.user.type)
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
				{rights.invoices &&
					<Link to="/invoices" onClick={props.onClose}>
						<ListItem button>
							<ListItemIcon><i className="fas fa-file-invoice-dollar" /></ListItemIcon>
							<ListItemText primary="Invoices" />
						</ListItem>
					</Link>
				}
				{rights.payments &&
					<Link to="/payments" onClick={props.onClose}>
						<ListItem button>
							<ListItemIcon><i className="fas fa-money-bill-1" /></ListItemIcon>
							<ListItemText primary="Payments" />
						</ListItem>
					</Link>
				}
				{rights.tasks &&
					<Link to="/tasks" onClick={props.onClose}>
						<ListItem button>
							<ListItemIcon><i className="fas fa-tasks" /></ListItemIcon>
							<ListItemText primary="Tasks" />
						</ListItem>
					</Link>
				}
				{rights.work &&
					<Link to="/work" onClick={props.onClose}>
						<ListItem button>
							<ListItemIcon><i className="fas fa-clock" /></ListItemIcon>
							<ListItemText primary="Work" />
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
