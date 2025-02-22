import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Site from './components/Site.jsx';

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<Site />
	</StrictMode>,
)