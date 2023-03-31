/**
 * Require User
 *
 * Wrapper for all pages that require sign in
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-16
 */

// Ouroboros modules
import body from '@ouroboros/body';
import events from '@ouroboros/events';

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';

// Material UI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

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
		body.read('primary', 'account/clients').then(data => {

			// If we got data
			if(data) {
				clientsSet(data);
			}
		}, error => {
			events.get('error').trigger(error);
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
		<Routes>
			<Route exact path="/clients" element={
				<Clients {...props} />
			} />
			<Route path="/invoice/:_id" element={
				<Invoice {...props} />
			} />
			<Route exact path="/invoices" element={
				<Invoices
					clients={clients}
					{...props}
				/>
			} />
			<Route exact path="/payments" element={
				<Payments
					clients={clients}
					{...props}
				/>
			} />
			<Route exact path="/users" element={
				<Users
					clients={clients}
					{...props}
				/>
			} />
			<Route exact path="/tasks" element={
				<Tasks
					clients={clients}
					{...props}
				/>
			} />
			<Route exact path="/work" element={
				<Work
					clients={clients}
					{...props}
				/>
			} />
			<Route exact path="/" element={
				<Home
					clients={clients}
					{...props}
				/>
			} />
		</Routes>
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