import { LEAD_KINDS, LEAD_QUERY_FIELD, isLeadKind, leadQueryFlags } from '../leadKinds';
import { notesOf } from '../useLead';

describe('lead kinds', () => {
  it('knows exactly the five kinds the API has', () => {
    expect(LEAD_KINDS).toEqual(['VENUE_LEAD', 'HOST_LEAD', 'ECOMM_LEAD', 'CREATOR_LEAD', 'COMMUNITY_LEAD']);
    expect(isLeadKind('HOST_LEAD')).toBe(true);
    expect(isLeadKind('USER_LEAD')).toBe(false);
    expect(isLeadKind(undefined)).toBe(false);
  });

  it('turns on exactly one read of the lead query, and reads its answer from the matching field', () => {
    for (const kind of LEAD_KINDS) {
      const flags = leadQueryFlags(kind);
      expect(Object.values(flags).filter(Boolean)).toHaveLength(1);
      expect(flags[LEAD_QUERY_FIELD[kind]]).toBe(true);
    }
  });
});

describe('notesOf', () => {
  it('lists the live manual notes, newest first, and nothing else on the timeline', () => {
    const log = [
      { id: 'n1', type: 'NOTE', summary: 'first', is_deleted: false },
      { id: null, type: 'CALL', summary: 'Outbound call', is_deleted: false },
      { id: 'n2', type: 'NOTE', summary: 'gone', is_deleted: true },
      { id: 'n3', type: 'NOTE', summary: 'latest', is_deleted: false },
    ];
    expect(notesOf({ activity_log: log }).map((n) => n.id)).toEqual(['n3', 'n1']);
    expect(notesOf(null)).toEqual([]);
  });
});
