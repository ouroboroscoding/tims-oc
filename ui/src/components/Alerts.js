/**
 * Header
 *
 * Handles app bar and drawer
 *
 * @author Chris Nasr <chris@ouroboroscoding.com>
 * @copyright OuroborosCoding
 * @created 2021-04-13
 */

// NPM modules
import React from 'react';
import { withSnackbar } from 'notistack';

// Shared generic modules
import Events from 'shared/generic/events';

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
		Events.subscribe('error', this.error);
		Events.subscribe('info', this.popup);
		Events.subscribe('popup', this.popup);
		Events.subscribe('success', this.success);
		Events.subscribe('warning', this.warning);
	}

	componentWillUnmount() {

		// Stop tracking any popup events
		Events.unsubscribe('error', this.error);
		Events.unsubscribe('info', this.popup);
		Events.unsubscribe('popup', this.popup);
		Events.unsubscribe('success', this.success);
		Events.unsubscribe('warning', this.warning);
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
