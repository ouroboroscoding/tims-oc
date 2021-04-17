/**
 * Task Start
 *
 * Home component for starting a new task
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

// Shared communication modules
import Rest from 'shared/communication/rest';
import Rights from 'shared/communication/rights';

// Shared generic modules
import Events from 'shared/generic/events';
import { afindi, clone } from 'shared/generic/tools';

// Local modules
import TaskStart from './TaskStart';

/**
 * TaskStart
 *
 * Displays dashboard for non-admin users
 *
 * @name TaskStart
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function TaskStart(props) {



	// Render
	return (
		<Box id="home">

		</Box>
	);
}

// Valid props
TaskStart.propTypes = {
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}