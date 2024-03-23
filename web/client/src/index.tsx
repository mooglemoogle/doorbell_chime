import { createRoot } from 'react-dom/client';

import '@blueprintjs/core/lib/css/blueprint.css';

import { App } from './App';

const rootEl = document.getElementById('root');
if (!rootEl) {
    throw new Error('No root element found');
}
const root = createRoot(rootEl);
root.render(<App />);
