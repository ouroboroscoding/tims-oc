/**
 * Site
 *
 * Primary entry into React app
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-02
 */

// Ouroboros modules
import { rest } from '@ouroboros/body';
import events from '@ouroboros/events';

// NPM modules
import React, { useEffect, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';

// Material UI
import { createTheme, ThemeProvider }  from '@mui/material/styles'

// Shared hooks
import { useResize } from 'shared/hooks/resize';

// Site components
import Alerts from './Alerts';
import Header from './header';

// Page component modules
import RequireUser from 'components/pages/RequireUser';
import Setup from 'components/pages/Setup';
import Verify from 'components/pages/Verify';

// Rest init
import 'rest_init';

// CSS
import 'sass/site.scss';

// Create the theme
const Theme = createTheme({
	palette: {
		primary: {
			dark: '#246c91',
			light: '#37a3d9',
			main: '#2f8bb9'
		},
		secondary: {
			dark: '#ad0303',
			light: '#ed4c4c',
			main: '#d42828'
		},
		neutral: {
			dark: '#a3a3a3',
			light: '#dddddd',
			main: '#c5c5c5'
		}
	},
	typography: {
		fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif'
	}
});

/**
 * Site
 *
 * Primary site component
 *
 * @name Site
 * @access public
 * @param Object props Attributes sent to the component
 * @return React.Component
 */
export default function Site(props) {

	// State
	let [mobile, mobileSet] = useState(document.documentElement.clientWidth < 600 ? true : false);
	let [user, userSet] = useState(null);

	// Hooks
	let navigate = useNavigate();

	// load effect
	useEffect(() => {

		// Subscribe to signed in/out events
		const oSignedIn = events.get('signedIn').subscribe(userSet);
		const oSignedOut = events.get('signedOut').subscribe(() => {
			navigate('/');
			userSet(false)
		});

		// If we have a session
		if(rest.session()) {
			rest.read('primary', 'user').done(res => {
				events.get('signedIn').trigger(res.data);
			});
		} else {
			userSet(false);
		}

		// Unmount
		return () => {
			// Unsubscribe from signed in/out events
			oSignedIn.unsubscribe();
			oSignedOut.unsubscribe();
		}
	}, [navigate]);

	// Resize hooks
	useResize(() => mobileSet(document.documentElement.clientWidth < 600 ? true : false));

	// Render
	return (
		<SnackbarProvider maxSnack={3}>
			<Alerts />
			<ThemeProvider theme={Theme}>
				<Header
					mobile={mobile}
					user={user || false}
				/>
				<div id="content" className="flexGrow">
					<Routes>
						<Route path="/setup/*" element={
							<Setup mobile={mobile} />
						} />
						<Route path="/verify/*" element={
							<Verify mobile={mobile} />
						} />
						{user !== null &&
							<Route path="/*" element={
								<RequireUser
									mobile={mobile}
									user={user}
								/>
							} />
						}
					</Routes>
				</div>
			</ThemeProvider>
		</SnackbarProvider>
	);
}