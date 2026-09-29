// The first plan's card (the founding spec, "The first minute"): up on the first morning while the clock is paused,
// with bed 1's overwintered salad leaves (the owner's head start, #11) and radishes offered for bed 2. "Sow them" keeps
// the card's plan; "Let them choose" hands bed 2 to the gardener, who follows the rotation (the first delegation). Either
// is a `card` command that starts the clock (src/sim/commands.ts); nothing else covers it while it's up (win W5).
import {Card} from './Card';

export function FirstPlan({onAnswer}: {onAnswer: (answer: 'accept' | 'choose') => void}) {
  return (
    <Card title="The first plan" kicker="Day 1, early morning" label="The first plan" onClose={() => onAnswer('accept')}
      footer={
        <div class="card-actions">
          <button type="button" class="primary" onClick={() => onAnswer('accept')}>Sow them</button>
          <button type="button" onClick={() => onAnswer('choose')}>Let them choose</button>
        </div>
      }>
      <div class="first-plan">
        <p><strong>Salad leaves in bed 1</strong>, nearly ready to cut.</p>
        <p><strong>Radishes in bed 2</strong>, up in about a week.</p>
        <p class="soft">The gardener does the work; change the plan any time.</p>
      </div>
    </Card>
  );
}
