import {describe, expect, it} from 'vitest';
import {current, NOTICE_MS, NOTICE_QUEUE, push, shownOf, type Notice, unfoldSign} from './notices';

describe('notices', () => {
  it('shows one at a time, queues the rest, and times each from when it shows', () => {
    let list: Notice[] = [];
    for (let i = 0; i < 3; i++) list = push(list, {id: i, text: `n${i}`, at: i * 100});
    expect(shownOf(list).map((n) => n.text)).toEqual(['n0']);
    expect(list.map((n) => n.text)).toEqual(['n0', 'n1', 'n2']);
    // the head goes after its time, and the next starts its own then
    list = current(list, NOTICE_MS);
    expect(shownOf(list).map((n) => n.text)).toEqual(['n1']);
    expect(list[0]!.at).toBe(NOTICE_MS);
    expect(current(list, NOTICE_MS + 10)[0]!.at).toBe(NOTICE_MS);
    expect(current(list, NOTICE_MS + NOTICE_MS - 1).map((n) => n.text)).toEqual(['n1', 'n2']);
    expect(current(list, 3 * NOTICE_MS)).toEqual([]);
  });
  it('keeps a choice until it is answered, never stacks the same text, and drops the oldest waiting past the queue', () => {
    let list: Notice[] = push([], {id: 1, text: 'Pick one', choice: true, at: 0});
    list = push(list, {id: 2, text: 'a', at: 10});
    list = push(list, {id: 3, text: 'b', at: 20});
    list = push(list, {id: 4, text: 'b', at: 30});
    expect(list.map((n) => n.id)).toEqual([1, 2, 4]);
    expect(current(list, 1e9).map((n) => n.id)).toEqual([1, 2, 4]);
    for (let i = 5; i < 10; i++) list = push(list, {id: i, text: `n${i}`, at: 40 + i});
    expect(list).toHaveLength(NOTICE_QUEUE);
    expect(list[0]!.id).toBe(1);
    expect(list.at(-1)!.id).toBe(9);
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
