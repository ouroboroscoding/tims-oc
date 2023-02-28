/**
 * Home
 *
 * Main page of the site once signed in
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-17
 */

// NPM modules
import PropTypes from 'prop-types';
import React from 'react';

// Material UI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Local components
import Owes from './Owes';
import Work from './Work';

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

	// Render
	return (
		<Box id="home" className="singlePage">
			<Box className="container sm">
				{props.clients === false ?
					<Typography>Loading...</Typography>
				:
					<React.Fragment>
						{props.user.type === 'client' &&
							<Owes
								{...props}
							/>
						}
						{props.user.type === 'worker' &&
							<Work
								clients={props.clients}
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
	clients: PropTypes.array.isRequired,
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}