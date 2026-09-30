// Numbers as the panels show them: the unit chosen after rounding, and never "−0".
import {describe, expect, it} from 'vitest';
import {amount, days, effectAmount, grams, UNIT_SPACE} from './format';

describe('format', () => {
  it('picks grams or kilograms after rounding, with no negative zero', () => {
    expect(grams(0.012)).toBe(`12${UNIT_SPACE}g`);
    expect(grams(0.9996)).toBe(`1${UNIT_SPACE}kg`);
    expect(grams(1.25)).toBe(`1.3${UNIT_SPACE}kg`);
    expect(grams(-0.0001)).toBe(`0${UNIT_SPACE}g`);
    expect(grams(0.0056)).toBe(`5.6${UNIT_SPACE}g`);
  });
  it('keeps a number and its unit together with a narrow no-break space', () => {
    expect(UNIT_SPACE).toBe('\u202f');
    expect(amount({unit: 'L', amount: 2.5, cap: 200} as never)).toBe(`2.5 of 200${UNIT_SPACE}L`);
    expect(days(1)).toBe(`1${UNIT_SPACE}day`);
    expect(effectAmount(3, 'h')).toBe(`3${UNIT_SPACE}h`);
    expect(effectAmount(0.1, 'share')).toBe(`10${UNIT_SPACE}% of the crop`);
  });
});
