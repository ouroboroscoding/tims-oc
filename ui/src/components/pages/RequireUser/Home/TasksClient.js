/**
 * Tasks Client
 *
 * Shows recent tasks associated with the user's given client access
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
 * @created 2021-04-22
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

// Material UI
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';
import { afindo, clone, datetime } from 'shared/generic/tools';

/**
 * Tasks Client
 *
 * Displays the last few tasks completed
 *
 * @name TasksClient
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function TasksClient(props) {

	// Load Effect
	useEffect(() => {

	});
}

// Valid props
TasksClient.propTypes = {
	clients: PropTypes.array.isRequired,
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}