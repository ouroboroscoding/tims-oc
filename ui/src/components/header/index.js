/**
 * Header
 *
 * Handles app bar and drawer
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCooding
 * @created 2021-04-11
 */

// NPM modules
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Material UI
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

// Header components
import Account from './Account';
import Loader from './Loader';
import Menu from './Menu';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';

/**
 * Header
 *
 * Manages
 * @param {[type]} props [description]
 */
export default function Header(props) {

	// State
	let [account, accountSet] = useState(false);
	let [menu, menuSet] = useState(false);

	// Show/Hide menu
	function menuToggle() {
		menuSet(val => !val);
	}

	// Signout of app
	function signout(ev) {

		// Call the signout
		Rest.create('primary', 'signout', {}).done(res => {

			// If there's an error or warning
			if(res.error && !res._handled) {
				Events.trigger('error', Rest.errorMessage(res.error));
			}
			if(res.warning) {
				Events.trigger('warning', JSON.stringify(res.warning));
			}

			// If there's data
			if(res.data) {

				// Reset the session
				Rest.session(null);

				// Trigger the signedOut event
				Events.trigger('signedOut');
			}
		});
	}

	// Render
	return (
		<Box id="header">
			<Box className="bar">
				<IconButton edge="start" color="inherit" aria-label="menu" onClick={menuToggle}>
					<i className="fas fa-bars" />
				</IconButton>
				<Box><Typography className="title">
					<Link to="/" onClick={menuToggle}>{props.mobile ? process.env.REACT_APP_SITENAME_SHORT : process.env.REACT_APP_SITENAME}</Link>
				</Typography></Box>
				<Box id="loaderWrapper">
					<Loader />
				</Box>
				{props.user &&
					<React.Fragment>
						<Tooltip title="Account">
							<IconButton onClick={ev => accountSet(b => !b)}>
								<i className="fas fa-user-alt" />
							</IconButton>
						</Tooltip>
						<Tooltip title="Sign Out">
							<IconButton onClick={signout}>
								<i className="fas fa-sign-out-alt" />
							</IconButton>
						</Tooltip>
					</React.Fragment>
				}
			</Box>
			<Menu
				onClose={menuToggle}
				open={menu}
				user={props.user}
			/>
			{account &&
				<Account
					onCancel={ev => accountSet(false)}
					user={props.user}
				/>
			}
		</Box>
	);
}

// Valid props
Header.propTypes = {
	mobile: PropTypes.bool.isRequired,
	user: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]).isRequired
}
