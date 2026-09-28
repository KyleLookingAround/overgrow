// Starts the page: the stylesheet, the simulation worker, and the UI.
import {render} from 'preact';
import '../ui/styles/tokens.css';
import '../ui/styles/page.css';
import {App} from '../ui/App';
import {freshSeed} from '../sim/random';
import {connectSim} from './sim-client';

// the checks set window.__seed so a run repeats; a player gets a fresh seed (a save carries its own, later)
declare global {
  interface Window {
    __seed?: number;
  }
}
const sim = connectSim();
void sim.send({type: 'new-game', seed: window.__seed ?? freshSeed()});
render(<App sim={sim} />, document.getElementById('app')!);
