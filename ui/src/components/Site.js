/**
 * Site
 *
 * Primary entry into React app
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
 * @created 2021-04-02
 */

// NPM modules
import React, { useEffect, useState } from 'react';
import { useHistory, Switch, Route } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';

// Shared communication modules
import Rest from 'shared/communication/rest';

// Shared generic modules
import Events from 'shared/generic/events';

// Shared hooks
import { useEvent } from 'shared/hooks/event';
import { useResize } from 'shared/hooks/resize';

// Site components
import Alerts from './Alerts';
import Header from './header';

// Dialog components
import SignIn from 'components/dialogs/SignIn';

// Page component modules
import Verify from 'components/pages/Verify';

// Rest init
import 'rest_init';

// CSS
import 'sass/site.scss';

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
	let history = useHistory();

	// load effect
	useEffect(() => {
		if(Rest.session()) {
			Rest.read('primary', 'user').done(res => {
				Events.trigger('signedIn', res.data);
			});
		} else {
			userSet(false);
		}
	}, []);

	// Sign In/Out hooks
	useEvent('signedIn', user => {
		userSet(user);
	});
	useEvent('signedOut', () => {
		history.push('/');
		userSet(false);
	});

	// Resize hooks
	useResize(() => mobileSet(document.documentElement.clientWidth < 600 ? true : false));

	// Render
	return (
		<SnackbarProvider maxSnack={3}>
			<Alerts />
			<Header
				mobile={mobile}
				user={user || false}
			/>
			{user === false &&
				<SignIn />
			}
			<div id="content" className="flexGrow">
				<Switch>
					<Route path="/verify">
						<Verify
							user={user}
						/>
					</Route>
					{/*user !== null &&
						<Route path="/">
							<Root
								mobile={mobile}
								user={user}
							/>
						</Route>
					*/}
				</Switch>
			</div>
		</SnackbarProvider>
	);
}
