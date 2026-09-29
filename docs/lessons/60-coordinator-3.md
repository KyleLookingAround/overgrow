Theme: coordinator

# The first slice's third coordinator · 29 Sep 2026

- **Numbers:**
  - About $19.30 against a $20 estimate, and about 455k of context at the handover.
  - Ran from 09:43 to 20:30 UTC.
  - Merged in that time: 6a (#45), the nutrients fix (#48), 6b (#53), the playable garden (#56), the Final Call exchange (#57) and the coordinator's briefs (#52). Round two (#59) was on its last CI round.
  - The parts cost $14.64 to $38.41 each, and every one ran past its estimate.
- **Went well:**
  - **Two cheap playtests (about $5 each) turned the plan.** The first found six parts had built a garden with nothing to buy, dig or aim for. The second found the loop ran out by day 150. Each report became a brief within the hour.
  - **Answering sessions' questions from the numbers they gave:**
    - #50: one person's veg;
    - #55: the garden's own Reliability and its measured targets.
    
    The owner's "you can choose" (decision 15) then removed the wait altogether.
  - **Messaging a session with one short trigger for each turn of events:**
    - a pass mark;
    - a merge of `main`;
    - a speed fix;
    - "carry on" after a stall.
- **Lessons:**
  - **A playtest before calling a level done.** Parts built to their briefs can still add up to no game. A helper agent on the cheaper model, playing days 2 to 365 at desktop and phone sizes, found it in under an hour. → In the `coordinator` playbook (#52).
  - **A session can stop after planning.** The playable garden ended its first turn with a plan and no code, and was idle for half an hour. → Book a check-in about 30 minutes after each start, and say in the first message "don't end a turn after planning". Now in the fourth brief.
  - **A check-in can be lost.** The 14:52 one never fired across a container restart; the hourly heartbeat caught it 40 minutes late. → Keep the heartbeat, and check `get_trigger` on a check-in that's overdue.
  - **The speed budget crept past its limit part by part.** Each part added stocks the snapshot copies every hour, and `main`'s garden-day test failed a docs-only PR at 2.04 ms. → Parts measure over the busiest stretch, and the next part fixes a red `main` first.
  - **Measure a pass mark's ceiling before setting it** (#48). → In the `coordinator` playbook.
  - **The spec's step-up targets had never been checked against the sim.** 1.5 kg a day was an allotment's figure, and Reliability as 1 − CV is 0 for any garden. → Before a level's goal ships, the bot measures what an engaged player reaches.
  - **Estimate a part that touches the sim, the UI and the bot at $30.** Part 5, 6b and both playable rounds ran past $20–25, from mid-build questions, speed work and the size of the ask.
