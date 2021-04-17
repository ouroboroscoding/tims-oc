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
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';

// Local modules
import TaskStart from './TaskStart';

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
		<Box id="home">

		</Box>
	);
}

// Valid props
Home.propTypes = {
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}