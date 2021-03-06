/**
 * Require User
 *
 * Wrapper for all pages that require sign in
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-16
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { Switch, Route } from 'react-router-dom';

// Material UI
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';

// Dialog components
import SignIn from 'components/dialogs/SignIn';

// Local components
import Clients from './Clients';
import Home from './Home';
import Invoice from './Invoice';
import Invoices from './Invoices';
import Payments from './Payments';
import Tasks from './Tasks';
import Work from './Work';
import Users from './Users';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';

/**
 * Require User
 *
 * Handles routing for private pages
 *
 * @name RequireUser
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function RequireUser(props) {

	// State
	let [clients, clientsSet] = useState(false);

	// Load Effect
	useEffect(() => {
		if(props.user) {
			clientsFetch();
		} else {
			clientsSet(false);
		}
	}, [props.user]);

	// Fetch all clients user has access to, regardless of rights type
	function clientsFetch() {

		// Make the request to the server
		Rest.read('primary', 'account/clients').done(res => {

			// If there's an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If we got data
			if(res.data) {
				clientsSet(res.data);
			}
		});
	}

	// If no user is signed in
	if(!props.user) {
		return <SignIn />
	}

	// If we haven't loaded the clients yet
	if(clients === false) {
		return <Box className="singlePage"><Typography>Loading...</Typography></Box>
	}

	// Render
	return (
		<Switch>
			<Route exact path="/clients">
				<Clients
					{...props}
				/>
			</Route>
			<Route path="/invoice/:_id" children={
				<Invoice {...props} />
			}/>
			<Route exact path="/invoices">
				<Invoices
					clients={clients}
					{...props}
				/>
			</Route>
			<Route exact path="/payments">
				<Payments
					clients={clients}
					{...props}
				/>
			</Route>
			<Route exact path="/users">
				<Users
					clients={clients}
					{...props}
				/>
			</Route>
			<Route exact path="/tasks">
				<Tasks
					clients={clients}
					{...props}
				/>
			</Route>
			<Route exact path="/work">
				<Work
					clients={clients}
					{...props}
				/>
			</Route>
			<Route exact path="/">
				<Home
					clients={clients}
					{...props}
				/>
			</Route>
		</Switch>
	);
}

// Valid props
RequireUser.propTypes = {
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.oneOfType([
		PropTypes.bool,
		PropTypes.object
	]).isRequired
}