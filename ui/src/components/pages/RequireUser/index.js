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
import React from 'react';
import { Switch, Route } from 'react-router-dom';

// Dialog components
import SignIn from 'components/dialogs/SignIn';

// Local components
import Users from './/Users';

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

	// If no user is signed in
	if(!props.user) {
		return <SignIn />
	}

	// Render
	return (
		<Switch>
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