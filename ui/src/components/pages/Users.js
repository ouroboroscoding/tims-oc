/**
 * Users
 *
 * Manage the users in the system
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
 * @created 2021-04-15
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import Tree from 'format-oc/Tree';

// Material UI
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

// Shared components
import { Form, Results } from 'shared/components/Format';

// Shared communication modules
import Rest from 'shared/communication/rest';
import Rights from 'shared/communication/rights';

// Shared generic modules
import Events from 'shared/generic/events';
import { clone } from 'shared/generic/tools';

// Load the user definition
import UserDef from 'definitions/user';

// Create a Tree using the definition
const UserTree = new Tree(clone(UserDef));

/**
 * Users
 *
 * Fetches and displays the users current in the system
 *
 * @name Users
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Users(props) {

	// State
	let [invite, inviteSet] = useState(false);
	let [users, usersSet] = useState(false);

	// Load effect
	useEffect(() => {

		// Fetch the users
		usersFetch();
	}, []);

	// Fetch the current users
	function usersFetch() {

		// Make the request to the server
		Rest.read('primary', 'users').done(res => {

			// If we got an error
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}

			// If we got data
			if(res.data) {
				usersSet(res.data);
			}
		});
	}

	// Render
	return (
		<Box id="users" className="singlePage">
			<Box className="pageHeader flexColumns">
				<Typography className="flexGrow">Users</Typography>
				{Rights.has}
				<Box className="bigIcon flexStatic">
					<Tooltip title="Invite User">
						<IconButton onClick={ev => inviteSet(b => !b)}>
							<i className="fas fa-plus-circle" />
						</IconButton>
					</Tooltip>
				</Box>
			</Box>
			{users === false ?
				<Typography>Loading...</Typography>
			:
				<React.Fragment>
					{users.length === 0 ?
						<Typography>No users found</Typography>
					:
						<Results
							data={users}
							noun="user"
							service="primary"
							tree={UserTree}
						/>
					}
				</React.Fragment>
			}
		</Box>
	);
}

// Valid props
Users.propTypes = {
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired
}