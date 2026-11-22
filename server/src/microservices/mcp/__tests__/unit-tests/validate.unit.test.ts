import { MAX_STRING_LENGTH, META_CONFIRM, META_GUARD, META_REASON } from '../../mcp.constants';
import { parseCallArgs, peekReason, ToolInputError } from '../../execute/validate';
import { buildFixtureCatalog, toolNamed } from './fixtures';

const catalog = buildFixtureCatalog();
const read = toolNamed(catalog, 'pods_pod'); // pod(id: ID!) — READ
const write = toolNamed(catalog, 'pods_join_free_pod'); // joinFreePod(pod_id: ID!) — WRITE
const destructive = toolNamed(catalog, 'pods_delete_pod'); // deletePod(id: ID!, reason: String) — confirm
const table = toolNamed(catalog, 'pods_pods_table'); // nothing required

const REASON = 'The member asked to join this pod.';

function failure(run: () => unknown): ToolInputError {
  try {
    run();
  } catch (error) {
    if (error instanceof ToolInputError) return error;
    throw error;
  }
  throw new Error('expected a ToolInputError');
}

/** `levels` objects deep: { a: { a: … 'x' } }. */
function nest(levels: number): unknown {
  let node: unknown = 'x';
  for (let i = 0; i < levels; i += 1) node = { a: node };
  return node;
}

describe('parseCallArgs — shape and size', () => {
  it('treats missing arguments as an empty object', () => {
    expect(parseCallArgs(table, undefined)).toEqual({ toolArgs: {}, reason: null, guard: null });
    expect(parseCallArgs(table, null)).toEqual({ toolArgs: {}, reason: null, guard: null });
  });

  it.each([['an array', []], ['a string', 'pod_1'], ['a number', 7]])('refuses %s as the arguments', (_label, raw) => {
    const error = failure(() => parseCallArgs(table, raw));
    expect(error.code).toBe('INVALID_ARGUMENTS');
    expect(error.message).toBe('Arguments must be a JSON object.');
  });

  it('measures the size in bytes, not characters', () => {
    // 7 × 20,000 two-byte characters: every string is within the length limit,
    // the whole is 280,000 bytes — over the 256 KB cap.
    const raw = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`k${i}`, 'é'.repeat(MAX_STRING_LENGTH)]));
    expect(failure(() => parseCallArgs(table, raw)).message).toBe('Arguments are larger than 256 KB.');
  });

  it('accepts arguments nested ten levels deep and refuses eleven', () => {
    // The `query` key is the first level, so nest(9) puts the string at level 10.
    // Ten levels gets past the depth check — the schema then names `a` as no field of the input.
    expect(failure(() => parseCallArgs(table, { query: nest(9) })).code).toBe('VALIDATION_FAILED');
    expect(failure(() => parseCallArgs(table, { query: nest(10) })).message).toBe('Arguments are nested deeper than 10 levels.');
  });

  it('accepts a string of exactly the limit and refuses one character more', () => {
    const exact = failure(() => parseCallArgs(table, { query: { search: 'a'.repeat(MAX_STRING_LENGTH) }, extra: 1 }));
    expect(exact.message).toMatch(/^Unknown parameter/); // got past the length check
    expect(failure(() => parseCallArgs(table, { query: { search: 'a'.repeat(MAX_STRING_LENGTH + 1) } })).message).toBe(
      `A text value is longer than ${MAX_STRING_LENGTH} characters.`
    );
  });
});

describe('parseCallArgs — parameters', () => {
  it('names an unknown parameter and lists what the tool accepts', () => {
    expect(failure(() => parseCallArgs(read, { id: 'p1', podId: 'p1' })).message).toBe(
      `Unknown parameter: podId. pods_pod accepts: id, ${META_REASON}, ${META_GUARD}.`
    );
  });

  it('names every unknown parameter in the plural', () => {
    expect(failure(() => parseCallArgs(read, { id: 'p1', a: 1, b: 2 })).message).toMatch(/^Unknown parameters: a, b\. /);
  });

  it('refuses mcp_confirm on a tool that does not take it', () => {
    expect(failure(() => parseCallArgs(read, { id: 'p1', [META_CONFIRM]: true })).message).toMatch(/^Unknown parameter: mcp_confirm\./);
  });

  it('names a missing required argument, treating null as missing', () => {
    expect(failure(() => parseCallArgs(read, {})).message).toBe('Missing required parameter: id.');
    expect(failure(() => parseCallArgs(read, { id: null })).message).toBe('Missing required parameter: id.');
  });

  it('returns the tool’s own arguments with the meta parameters removed', () => {
    expect(parseCallArgs(write, { pod_id: 'p1', [META_REASON]: `  ${REASON}  `, [META_GUARD]: 'warn' })).toEqual({
      toolArgs: { pod_id: 'p1' },
      reason: REASON,
      guard: 'warn',
    });
  });
});

describe('parseCallArgs — mcp_reason', () => {
  it('requires a reason for a tool that changes data', () => {
    const error = failure(() => parseCallArgs(write, { pod_id: 'p1' }));
    expect(error.code).toBe('INVALID_ARGUMENTS');
    expect(error.message).toMatch(/^mcp_reason is required for tools that change data/);
    expect(failure(() => parseCallArgs(write, { pod_id: 'p1', [META_REASON]: null })).message).toMatch(/is required/);
  });

  it('does not require a reason for a read, but keeps one that is given', () => {
    expect(parseCallArgs(read, { id: 'p1' }).reason).toBeNull();
    expect(parseCallArgs(read, { id: 'p1', [META_REASON]: 'Checking seats' }).reason).toBe('Checking seats');
  });

  it.each([
    ['too short after trimming', '  ab  '],
    ['too long', 'a'.repeat(501)],
    ['not text', 42],
  ])('refuses a reason that is %s', (_label, value) => {
    expect(failure(() => parseCallArgs(write, { pod_id: 'p1', [META_REASON]: value })).message).toBe('mcp_reason must be 3–500 characters of text.');
  });

  it('accepts a reason of exactly 3 and exactly 500 characters', () => {
    expect(parseCallArgs(write, { pod_id: 'p1', [META_REASON]: 'abc' }).reason).toBe('abc');
    expect(parseCallArgs(write, { pod_id: 'p1', [META_REASON]: 'a'.repeat(500) }).reason).toHaveLength(500);
  });
});

describe('parseCallArgs — mcp_guard', () => {
  it('returns null when no guard is chosen, so the settings default applies', () => {
    expect(parseCallArgs(read, { id: 'p1', [META_GUARD]: null }).guard).toBeNull();
  });

  it('refuses a guard mode that does not exist', () => {
    expect(failure(() => parseCallArgs(read, { id: 'p1', [META_GUARD]: 'off' })).message).toBe('mcp_guard must be one of: block, warn.');
  });
});

describe('parseCallArgs — mcp_confirm', () => {
  it('refuses a confirm-tool until mcp_confirm is literally true', () => {
    for (const value of [undefined, false, 'true', 1]) {
      const error = failure(() => parseCallArgs(destructive, { id: 'p1', [META_REASON]: REASON, [META_CONFIRM]: value }));
      expect(error.code).toBe('CONFIRMATION_REQUIRED');
      expect(error.message).toBe(
        "Delete pod needs the user's explicit OK. Describe exactly what will change, ask them, and call again with mcp_confirm: true only if they agree."
      );
    }
  });

  it('checks the reason before asking for confirmation', () => {
    expect(failure(() => parseCallArgs(destructive, { id: 'p1' })).code).toBe('INVALID_ARGUMENTS');
  });

  it('asks for confirmation before reporting a missing argument', () => {
    expect(failure(() => parseCallArgs(destructive, { [META_REASON]: REASON })).code).toBe('CONFIRMATION_REQUIRED');
  });

  it('runs a confirmed call and keeps the GraphQL argument called "reason" apart from mcp_reason', () => {
    expect(parseCallArgs(destructive, { id: 'p1', reason: 'Venue flooded', [META_REASON]: REASON, [META_CONFIRM]: true })).toEqual({
      toolArgs: { id: 'p1', reason: 'Venue flooded' },
      reason: REASON,
      guard: null,
    });
  });
});

describe('parseCallArgs — the values themselves (createPod(input: PodInput!))', () => {
  const create = toolNamed(catalog, 'pods_create_pod');
  const call = (input: unknown) => parseCallArgs(create, { input, [META_REASON]: REASON });

  it('runs a complete, well-formed write', () => {
    expect(call({ pod_title: 'Sunday run', no_of_spots: 8, status: 'LIVE' }).toolArgs).toEqual({
      input: { pod_title: 'Sunday run', no_of_spots: 8, status: 'LIVE' },
    });
  });

  it('refuses a blank required field and says to ask the user for it, not to make one up', () => {
    const error = failure(() => call({ pod_title: '   ' }));
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.message).toBe(
      [
        'Nothing was saved. One value needs fixing:',
        '- input.pod_title is required and cannot be blank.',
        'Ask the user for: input.pod_title. Never guess, invent or fill in placeholder values; call again once you have them.',
      ].join('\n')
    );
  });

  it('refuses a nested input missing its required field', () => {
    expect(failure(() => call({ pod_description: 'Easy 5k' })).message).toContain('- input.pod_title is required.');
  });

  it('lists every wrong value at once, and asks for the correct ones when nothing is missing', () => {
    const error = failure(() => call({ pod_title: 'Run', no_of_spots: 'eight', status: 'OPEN', colour: 'red' }));
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.message.split('\n')).toEqual([
      'Nothing was saved. 3 values need fixing:',
      '- input.no_of_spots must be a whole number.',
      '- input.status must be one of: LIVE, DRAFT, CANCELLED.',
      '- input.colour is not a field of this input.',
      'Ask the user for the correct values if you are not certain of them. Never guess, invent or fill in placeholder values; call again once you have them.',
    ]);
  });

  it('still reports a missing top-level argument the way it always has', () => {
    expect(failure(() => parseCallArgs(create, { [META_REASON]: REASON })).message).toBe('Missing required parameter: input.');
  });

  it('holds a read to types and enums but not to the blank and format checks a form makes before saving', () => {
    expect(() => parseCallArgs(table, { query: { search: '   ' } })).not.toThrow();
    expect(failure(() => parseCallArgs(table, { query: { page: 'two' } })).message).toContain('- query.page must be a whole number.');
    expect(failure(() => parseCallArgs(read, { id: '' })).message).toContain('- id must be at least 1 character.');
  });

  it('checks every item of a nested list', () => {
    const error = failure(() => parseCallArgs(table, { query: { filters: [{ field: 'status', op: 'eq' }, { field: 'city' }] } }));
    expect(error.message).toContain('- query.filters[1].op is required.');
  });
});

describe('peekReason — the reason as given, for the activity log only', () => {
  it.each([['missing arguments', undefined], ['null', null], ['an array', [{ [META_REASON]: REASON }]], ['a string', REASON], ['a number', 7]])(
    'finds no reason in %s',
    (_label, raw) => {
      expect(peekReason(raw)).toBeNull();
    }
  );

  it('finds no reason when none was given', () => {
    expect(peekReason({ pod_id: 'p1' })).toBeNull();
    expect(peekReason({ [META_REASON]: null })).toBeNull();
  });

  it('finds no reason in a value that is not text', () => {
    expect(peekReason({ [META_REASON]: 42 })).toBeNull();
    expect(peekReason({ [META_REASON]: { why: REASON } })).toBeNull();
  });

  it('treats a blank reason as none', () => {
    expect(peekReason({ [META_REASON]: ' \n\t ' })).toBeNull();
  });

  it('trims the reason', () => {
    expect(peekReason({ [META_REASON]: `  ${REASON}\n` })).toBe(REASON);
  });

  it('cuts a reason to 500 characters instead of refusing it', () => {
    expect(peekReason({ [META_REASON]: 'r'.repeat(600) })).toBe('r'.repeat(500));
    expect(peekReason({ [META_REASON]: 'r'.repeat(500) })).toHaveLength(500);
  });

  it('keeps a reason too short to pass validation — it only reports what was sent', () => {
    expect(peekReason({ [META_REASON]: 'ab' })).toBe('ab');
    expect(() => parseCallArgs(write, { pod_id: 'p1', [META_REASON]: 'ab' })).toThrow(ToolInputError);
  });
});
