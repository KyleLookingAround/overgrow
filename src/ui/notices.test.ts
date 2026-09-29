import {describe, expect, it} from 'vitest';
import {current, NOTICE_CAP, NOTICE_MS, push, type Notice, unfoldSign} from './notices';

describe('notices', () => {
  it('shows at most the cap, newest kept, and lets informational ones expire', () => {
    let list: Notice[] = [];
    for (let i = 0; i < 5; i++) list = push(list, {id: i, text: `n${i}`, at: i * 100});
    expect(list).toHaveLength(NOTICE_CAP);
    expect(list.map((n) => n.text)).toEqual(['n3', 'n4']);
    expect(current(list, 400 + NOTICE_MS)).toEqual([]);
  });
  it('keeps a choice until it is answered, and never stacks the same text', () => {
    let list: Notice[] = push([], {id: 1, text: 'Pick one', choice: true, at: 0});
    list = push(list, {id: 2, text: 'a', at: 10});
    list = push(list, {id: 3, text: 'b', at: 20});
    expect(list.map((n) => n.text)).toEqual(['Pick one', 'b']);
    list = push(list, {id: 4, text: 'b', at: 30});
    expect(list.map((n) => n.id)).toEqual([1, 4]);
    expect(current(list, 1e9).map((n) => n.id)).toEqual([1]);
  });
});

describe('the unfold sign', () => {
  it('makes one sign for a batch of keys that unfold together, never one each', () => {
    const s = unfoldSign(['garden.water'], ['garden.water', 'garden.soil', 'garden.carbon'], 1, 0)!;
    expect(s.keys).toEqual(['garden.soil', 'garden.carbon']);
    expect(s.text).toBe('New: organic matter, N-P-K and soil health; the carbon dial and the land');
    expect(unfoldSign(['garden.water'], ['garden.water', 'card.first-plan'], 2, 0)).toBeNull();
    const long = unfoldSign([], ['garden.water', 'garden.slugs', 'garden.shed', 'garden.kitchen'], 3, 0)!;
    expect(long.text).toBe('New: soil moisture and the watering line; the slugs’ policy line, their numbers and badges and 2 more');
    expect(long.keys).toHaveLength(4);
  });
});
