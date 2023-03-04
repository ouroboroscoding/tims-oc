/**
 * Header
 *
 * Handles app bar and drawer
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCooding
 * @created 2021-04-11
 */

// Ouroboros modules
import { rest } from '@ouroboros/body';
import events from '@ouroboros/events';

// NPM modules
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Material UI
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// Header components
import Account from './Account';
import Loader from './Loader';
import Menu from './Menu';

// Local modules
import { useWidth } from 'shared/hooks/mui';

/**
 * Header
 *
 * Manages
 * @param {[type]} props [description]
 */
export default function Header(props) {

	// State
	const [account, accountSet] = useState(false);
	const [menu, menuSet] = useState(false);

	// Hooks
	const width = useWidth();

	// Hide menu
	function menuHide() {
		menuSet(false);
	}

	// Signout of app
	function signout(ev) {

		// Call the signout
		rest.create('primary', 'signout').done(res => {

			// If there's an error or warning
			if(res.error && !res._handled) {
				events.get('error').trigger(rest.errorMessage(res.error));
			}
			if(res.warning) {
				events.get('warning').trigger(JSON.stringify(res.warning));
			}

			// If there's data
			if(res.data) {

				// Reset the session
				rest.session(null);

				// Trigger the signedOut event
				events.get('signedOut').trigger();
			}
		});
	}

	// Render
	return (
		<Box id="header" className="flexStatic">
			<Box className="bar flexColumns">
				{props.user &&
					<IconButton className="flexStatic" edge="start" color="inherit" aria-label="menu" onClick={() => menuSet(b => !b)}>
						<i className="fas fa-bars" />
					</IconButton>
				}
				<Box className="flexStatic">
					<Typography className="title">
						<Link to="/" onClick={menuHide}>{props.mobile ? process.env.REACT_APP_SITENAME_SHORT : process.env.REACT_APP_SITENAME}</Link>
					</Typography>
				</Box>
				{process.env.NODE_ENV === 'development' &&
					<Box className="flexStatic"><Typography>{width}</Typography></Box>
				}
				<Box id="loader" className="flexGrow">
					<Loader />
				</Box>
				{props.user &&
					<Box className="icons">
						<Tooltip title="Account">
							<IconButton onClick={ev => accountSet(b => !b)}>
								<i className={'fas fa-user-alt ' + (account ? 'open' : 'close')} />
							</IconButton>
						</Tooltip>
						<Tooltip title="Sign Out">
							<IconButton onClick={signout}>
								<i className="fas fa-sign-out-alt" />
							</IconButton>
						</Tooltip>
					</Box>
				}
			</Box>
			<Menu
				onClose={menuHide}
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