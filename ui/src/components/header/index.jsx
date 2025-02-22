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
import { cookies } from '@ouroboros/browser';
import body from '@ouroboros/body';
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
import { useWidth } from '@/shared/hooks/mui';

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
		body.create('primary', 'signout').then(data => {

			// If there's data
			if(data) {

				// Clear the cookie
				cookies.remove('_session');

				// Reset the session
				body.session(null);

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
						<Link to="/" onClick={menuHide}>{props.mobile ? import.meta.envVITE_SITENAME_SHORT : import.meta.envVITE_SITENAME}</Link>
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