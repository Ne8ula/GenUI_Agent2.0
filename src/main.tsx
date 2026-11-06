import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/300.css';
import '@fontsource/ibm-plex-sans/300-italic.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import App from './App.tsx';
import './App.css';

const root = document.getElementById('root');
if (!root) throw new Error('The application root is missing.');

createRoot(root).render(<StrictMode><App /></StrictMode>);
