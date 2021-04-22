/**
 * Home
 *
 * Main page of the site once signed in
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
 * @created 2021-04-17
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

// Material UI
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';

// Local components
import Task from './Task';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';

/**
 * Home
 *
 * Displays dashboard for non-admin users
 *
 * @name Home
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Home(props) {

	// State
	let [clients, clientsSet] = useState(false);

	// User effect
	useEffect(() => {
		clientsFetch();
	}, [props.user]);

	// Fetch all clients the user has access to
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

	// Render
	return (
		<Box id="home" className="singlePage">
			<Box className="container sm">
				{clients === false ?
					<Typography>Loading...</Typography>
				:
					<React.Fragment>
						{props.user.type === 'worker' &&
							<Task
								clients={clients}
								{...props}
							/>
						}
					</React.Fragment>
				}
			</Box>
		</Box>
	);
}

// Valid props
Home.propTypes = {
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}