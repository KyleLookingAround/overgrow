// Numbers as the panels show them: the unit chosen after rounding, and never "−0".
import {describe, expect, it} from 'vitest';
import {grams} from './format';

describe('format', () => {
  it('picks grams or kilograms after rounding, with no negative zero', () => {
    expect(grams(0.012)).toBe('12 g');
    expect(grams(0.9996)).toBe('1 kg');
    expect(grams(1.25)).toBe('1.3 kg');
    expect(grams(-0.0001)).toBe('0 g');
    expect(grams(0.0056)).toBe('5.6 g');
  });
});
