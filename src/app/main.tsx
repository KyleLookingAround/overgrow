// Starts the page: the stylesheet, the simulation worker, and the UI.
import {render} from 'preact';
import '../ui/styles/tokens.css';
import '../ui/styles/page.css';
import {App} from '../ui/App';
import {connectSim} from './sim-client';

render(<App sim={connectSim()} />, document.getElementById('app')!);
