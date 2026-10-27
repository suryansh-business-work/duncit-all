import { describe, expect, it } from 'vitest';
import { groupEventsByDay } from '../../../components/events/groupByDay';

const at = (id: string, start: string, timezone = 'Asia/Kolkata') => ({ id, start_at: start, end_at: start, timezone });

describe('groupEventsByDay', () => {
  it('buckets events by the calendar day they start on in their own zone, keeping the given order', () => {
    const groups = groupEventsByDay([
      at('a', '2026-11-21T13:30:00.000Z'),
      at('b', '2026-11-21T15:00:00.000Z'),
      // 20:00 UTC on the 21st is already the 22nd in Delhi.
      at('c', '2026-11-21T20:00:00.000Z'),
    ]);
    expect(groups.map((group) => [group.key, group.events.map((event) => event.id)])).toEqual([
      ['2026-11-21', ['a', 'b']],
      ['2026-11-22', ['c']],
    ]);
  });

  it('labels each day as the host’s clock shows it', () => {
    const [first] = groupEventsByDay([at('a', '2026-11-21T13:30:00.000Z')]);
    expect(first.label).toBe('Sat, 21 Nov 2026');
  });

  it('puts events from different zones on the same local day in one group', () => {
    const groups = groupEventsByDay([
      at('delhi', '2026-11-21T13:30:00.000Z'),
      // 02:00 UTC on the 22nd is 21:00 on the 21st in New York.
      at('nyc', '2026-11-22T02:00:00.000Z', 'America/New_York'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].events.map((event) => event.id)).toEqual(['delhi', 'nyc']);
  });

  it('reads a blank zone as Delhi', () => {
    const [group] = groupEventsByDay([at('blank', '2026-11-21T20:00:00.000Z', '')]);
    expect(group.key).toBe('2026-11-22');
  });

  it('answers no groups for no events', () => {
    expect(groupEventsByDay([])).toEqual([]);
  });
});
