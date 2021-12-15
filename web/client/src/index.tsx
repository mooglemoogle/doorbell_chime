import * as React from 'react';
import { render } from 'react-dom';

import '@blueprintjs/core/lib/css/blueprint.css';

import { App } from './components/App';

const rootEl = document.getElementById('root');

render(<App />, rootEl);
