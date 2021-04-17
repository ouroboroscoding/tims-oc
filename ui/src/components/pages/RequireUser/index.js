/**
 * Signed In
 *
 * Wrapper for all pages that require sign in
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
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
import Users from './Users';

// Shared communication modules
import Rest from 'shared/communication/rest';
import Rights from 'shared/communication/rights';

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
					mobile={props.mobile}
					user={props.user}
				/>
			</Route>
			<Route exact path="/users">
				<Users
					mobile={props.mobile}
					user={props.user}
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