/**
 * Loader
 *
 * Handles the loader
 *
 * @author Chris Nasr <ouroboroscoding@gmail.com>
 * @copyright Ouroboros Coding Inc.
 * @created 2020-05-08
 */

// Ouroboros modules
import events from '@ouroboros/events';

// NPM modules
import React, { useEffect, useState } from 'react';

// Local variables
let _count = 1;

// Loader component
export default function Loader(props) {

	// State
	let [visible, visibleSet] = useState(_count !== 0);

	// Load effect
	useEffect(() => {
		const oLoader = events.get('Loader').subscribe(visibleSet);
		return () => oLoader.unsubscribe();
	}, []);

	// Render
	return <img src="/images/loading.gif" alt="ajax" style={{display: visible ? 'inline' : 'none'}} />
}

export function LoaderHide() {

	// Decrement the count
	_count--;

	// If this is the last one
	if(_count === 0) {
		events.get('Loader').trigger(false);
	}
}

export function LoaderShow() {

	// Increment the count
	_count++;

	// If this is the first one
	if(_count === 1) {
		events.get('Loader').trigger(true);
	}
}