// The page: a canvas for the map and HTML panels beside or below it (the founding spec, "The look"). Until the first
// slice it's a placeholder that says Overgrow and proves the simulation worker answers.
import {useEffect, useState} from 'preact/hooks';
import type {SimClient} from '../app/sim-client';
import {MapCanvas} from './MapCanvas';

export function App({sim}: {sim: SimClient}) {
  const [hours, setHours] = useState<number | null>(null);
  useEffect(() => {
    void sim.send({type: 'tick', hours: 1}).then((s) => setHours(s.hours));
  }, [sim]);
  return (
    <main class="page">
      <MapCanvas />
      <section class="panel" aria-label="Overgrow">
        <h1>Overgrow</h1>
        <p>From a back garden to the whole planet. Coming soon.</p>
        <p class="soft" data-sim={hours === null ? 'waiting' : 'ready'}>
          {hours === null ? 'Starting the simulation…' : `The clock reads hour ${hours}.`}
        </p>
      </section>
    </main>
  );
}
