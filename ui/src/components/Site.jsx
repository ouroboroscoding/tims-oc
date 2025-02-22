/**
 * Site
 *
 * Primary entry into React app
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-02
 */

// Body init
import '../body_init';

// CSS
import '../sass/site.scss';

// Ouroboros modules
import body from '@ouroboros/body';
import { cookies } from '@ouroboros/browser';
import { Results } from '@ouroboros/define-mui';
import events from '@ouroboros/events';

// NPM modules
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';

// Material UI modules
import { createTheme, StyledEngineProvider, ThemeProvider }  from '@mui/material/styles'

// Shared hooks
import { useResize } from '@/shared/hooks/resize';

// Site components
import Alerts from './Alerts';
import Header from './header';

// Page component modules
import RequireUser from '@/components/pages/RequireUser';
import Setup from '@/components/pages/Setup';
import Verify from '@/components/pages/Verify';

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

// Add default onCopyKey methods to Results
Results.setOnCopyKey(() => {
	events.get('success').trigger('Record ID copied to clipboard!');
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

	// load effect
	useEffect(() => {

		// Subscribe to signed in/out events
		const oSignedIn = events.get('signedIn').subscribe(userSet);
		const oSignedOut = events.get('signedOut').subscribe(() => {
			window.location = '/';
			userSet(false)
		});

		// If we have a session cookie, set it on the body
		const session_cookie = cookies.get('_session');
		if(session_cookie) {
			body.session(session_cookie);
			body.read('primary', 'user').then(data => {
				events.get('signedIn').trigger(data);
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
	}, [ ]);

	// Resize hooks
	useResize(() => mobileSet(document.documentElement.clientWidth < 600 ? true : false));

	// Render
	return (
		<StyledEngineProvider injectFirst>
			<SnackbarProvider maxSnack={3}>
				<BrowserRouter>
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
								{user !== null ?
									<Route path="/*" element={
										<RequireUser
											mobile={mobile}
											user={user}
										/>
									} />
								:
									<Route path="/" element={
										<div><p>Please sign in.</p></div>
									} />
								}
							</Routes>
						</div>
					</ThemeProvider>
				</BrowserRouter>
			</SnackbarProvider>
		</StyledEngineProvider>
	);
}