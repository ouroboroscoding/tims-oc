/**
 * Header
 *
 * Handles app bar and drawer
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2021-04-13
 */

// Ouroboros modules
import events from '@ouroboros/events';

// NPM modules
import React from 'react';
import { withSnackbar } from 'notistack';

/**
 * Library Writes Are Often Idiots
 *
 * It should not be necessary to implement this this way
 *
 * @name LibraryWritersAreOftenIdiots
 * @access private
 * @extends React.Component
 */
class LibraryWritersAreOftenIdiots extends React.Component {

	constructor(props) {

		// Call the parent constructor
		super(props);

		// Bind methods to this instance
		this.error = this.error.bind(this);
		this.popup = this.popup.bind(this);
		this.success = this.success.bind(this);
		this.warning = this.warning.bind(this);
	}

	componentDidMount() {

		// Track any popup events
		events.get('error').subscribe(this.error);
		events.get('info').subscribe(this.popup);
		events.get('popup').subscribe(this.popup);
		events.get('success').subscribe(this.success);
		events.get('warning').subscribe(this.warning);
	}

	componentWillUnmount() {

		// Stop tracking any popup events
		events.get('error').unsubscribe(this.error);
		events.get('info').unsubscribe(this.popup);
		events.get('popup').unsubscribe(this.popup);
		events.get('success').unsubscribe(this.success);
		events.get('warning').unsubscribe(this.warning);
	}

	error(msg) {
		this.popup(msg, 'error');
	}

	popup(text, type='info') {

		// Add the popup
		this.props.enqueueSnackbar(text, {variant: type});
	}

	render() {
		return <div />
	}

	success(msg) {
		this.popup(msg, 'success');
	}

	warning(msg) {
		this.popup(msg, 'warning');
	}
}

export default withSnackbar(LibraryWritersAreOftenIdiots);