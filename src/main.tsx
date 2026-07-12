import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ServicesProvider } from './services/container';
import './styles/tokens.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ServicesProvider>
			<App />
		</ServicesProvider>
	</StrictMode>,
);
