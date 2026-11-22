import type { ToolInputSchema } from '../../catalog/json-schema';
import { checkArguments, MAX_PROBLEMS, missingFields } from '../../execute/schema-check';

/**
 * A venue-onboarding style input: a required name and nested owner, a list of
 * contacts, an enum, bounded numbers and the fields a form holds to a format.
 */
const SCHEMA: ToolInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['input'],
  properties: {
    input: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'owner'],
      properties: {
        name: { type: 'string', maxLength: 20 },
        venue_id: { type: 'string', minLength: 1, maxLength: 5 },
        kind: { type: 'string', enum: ['CAFE', 'BAR'] },
        seats: { type: 'integer', minimum: 1, maximum: 500 },
        rating: { type: 'number' },
        open: { type: 'boolean' },
        email: { type: 'string' },
        website: { type: 'string' },
        email_enabled: { type: 'boolean' },
        settings: { description: 'JSON value' },
        owner: {
          type: 'object',
          additionalProperties: false,
          required: ['full_name'],
          properties: {
            full_name: { type: 'string' },
            phone: { type: 'string' },
            upi_id: { type: 'string' },
            ifsc_code: { type: 'string' },
            gstin: { type: 'string' },
          },
        },
        tags: { type: 'array', items: { type: 'string', maxLength: 3 } },
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['contact_email'],
            properties: { contact_email: { type: 'string' }, pincode: { type: 'string' } },
          },
        },
      },
    },
  },
};

const valid = () => ({
  input: {
    name: 'Blue Tokai',
    owner: { full_name: 'Asha Rao' },
  },
});

const paths = (problems: ReturnType<typeof checkArguments>) => problems.map((problem) => `${problem.kind}:${problem.path}`);

describe('checkArguments — a complete, well-formed write', () => {
  it('finds nothing wrong with the required fields alone', () => {
    expect(checkArguments(SCHEMA, valid(), true)).toEqual([]);
  });

  it('finds nothing wrong when every optional field is filled in correctly', () => {
    const args = {
      input: {
        ...valid().input,
        venue_id: 'v1',
        kind: 'CAFE',
        seats: 40,
        rating: 4.5,
        open: true,
        email: 'hello@bluetokai.in',
        website: 'bluetokai.in',
        email_enabled: false,
        settings: { anything: ['goes'] },
        owner: { full_name: 'Asha Rao', phone: '+91 98765-43210', upi_id: 'asha@okhdfc', ifsc_code: 'hdfc0001234', gstin: '29ABCDE1234F1Z5' },
        tags: ['wfh', 'pet'],
        contacts: [{ contact_email: 'ops@bluetokai.in', pincode: '560001' }],
      },
    };
    expect(checkArguments(SCHEMA, args, true)).toEqual([]);
  });

  it('accepts nulls in optional fields and in lists — GraphQL decides whether a list may hold one', () => {
    const args = { input: { ...valid().input, email: null, website: undefined, tags: ['a', null], contacts: null } };
    expect(checkArguments(SCHEMA, args, true)).toEqual([]);
  });
});

describe('checkArguments — required fields', () => {
  it('reports a missing nested object, and a missing field inside one, with its full path', () => {
    expect(paths(checkArguments(SCHEMA, { input: { name: 'X' } }, true))).toEqual(['missing:input.owner']);
    expect(paths(checkArguments(SCHEMA, { input: { name: 'X', owner: {} } }, true))).toEqual(['missing:input.owner.full_name']);
  });

  it('treats null as missing', () => {
    expect(paths(checkArguments(SCHEMA, { input: { name: null, owner: { full_name: 'A' } } }, true))).toEqual(['missing:input.name']);
  });

  it('reports blank required text on a write, and says so once even where a length rule would also fire', () => {
    const problems = checkArguments(SCHEMA, { input: { name: '   ', owner: { full_name: '\n\t' } } }, true);
    expect(paths(problems)).toEqual(['blank:input.name', 'blank:input.owner.full_name']);
    expect(problems[0].message).toBe('input.name is required and cannot be blank.');
  });

  it('lets blank text through on a read — a search for "" is not a form being saved', () => {
    expect(checkArguments(SCHEMA, { input: { name: ' ', owner: { full_name: ' ' } } }, false)).toEqual([]);
  });

  it('checks a required field inside every item of a list', () => {
    const args = { input: { ...valid().input, contacts: [{ contact_email: 'a@b.co' }, {}, { contact_email: ' ' }] } };
    expect(paths(checkArguments(SCHEMA, args, true))).toEqual(['missing:input.contacts[1].contact_email', 'blank:input.contacts[2].contact_email']);
  });

  it('lists the fields to ask the person for — missing and blank, not wrongly formatted', () => {
    const problems = checkArguments(SCHEMA, { input: { name: ' ', email: 'nope', owner: {} } }, true);
    expect(missingFields(problems)).toEqual(['input.name', 'input.owner.full_name']);
  });
});

describe('checkArguments — types, enums, lengths and ranges', () => {
  it.each([
    ['text given a number', { name: 7 }, 'type:input.name', 'input.name must be text.'],
    ['a whole number given a fraction', { seats: 2.5 }, 'type:input.seats', 'input.seats must be a whole number.'],
    ['a number given text', { rating: '4' }, 'type:input.rating', 'input.rating must be a number.'],
    ['a number given infinity', { rating: Infinity }, 'type:input.rating', 'input.rating must be a number.'],
    ['true or false given text', { open: 'yes' }, 'type:input.open', 'input.open must be true or false.'],
    ['a list given an object', { tags: { a: 1 } }, 'type:input.tags', 'input.tags must be a list.'],
    ['an object given a list', { owner: [] }, 'type:input.owner', 'input.owner must be an object.'],
    ['an enum given another word', { kind: 'PUB' }, 'enum:input.kind', 'input.kind must be one of: CAFE, BAR.'],
    ['text over its length', { name: 'x'.repeat(21) }, 'length:input.name', 'input.name must be at most 20 characters.'],
    ['an ID under its length', { venue_id: '' }, 'length:input.venue_id', 'input.venue_id must be at least 1 character.'],
    ['a number under its range', { seats: 0 }, 'range:input.seats', 'input.seats must be 1 or more.'],
    ['a number over its range', { seats: 501 }, 'range:input.seats', 'input.seats must be 500 or less.'],
  ])('refuses %s', (_label, extra, path, message) => {
    const args = { input: { ...valid().input, ...extra } };
    const problems = checkArguments(SCHEMA, args, false);
    expect(paths(problems)).toEqual([path]);
    expect(problems[0].message).toBe(message);
  });

  it('checks each item of a list against the item type', () => {
    const args = { input: { ...valid().input, tags: ['ok', 5, 'toolong'] } };
    expect(paths(checkArguments(SCHEMA, args, false))).toEqual(['type:input.tags[1]', 'length:input.tags[2]']);
  });

  it('says "characters" for a minimum length above one', () => {
    const schema: ToolInputSchema = { type: 'object', properties: { code: { type: 'string', minLength: 3 } } };
    expect(checkArguments(schema, { code: 'ab' }, false)[0].message).toBe('code must be at least 3 characters.');
  });

  it('accepts any value for a type it does not know, an object with no declared fields, and a list with no item type', () => {
    const schema: ToolInputSchema = {
      type: 'object',
      properties: { odd: { type: 'null' }, deep: { type: 'object', description: 'TooDeepInput input' }, loose: { type: 'array' } },
    };
    expect(checkArguments(schema, { odd: 'anything', deep: { whatever: [1] }, loose: [1, 'two', { three: 3 }] }, true)).toEqual([]);
  });

  it('leaves a custom scalar to its own parser', () => {
    const args = { input: { ...valid().input, settings: 'any shape at all' } };
    expect(checkArguments(SCHEMA, args, true)).toEqual([]);
  });
});

describe('checkArguments — fields an input does not declare', () => {
  it('names an unknown nested field, at any depth', () => {
    const args = { input: { ...valid().input, colour: 'blue', owner: { full_name: 'A', role: 'admin' } } };
    // `owner` keeps its place from valid(); fields are checked in the order given.
    expect(paths(checkArguments(SCHEMA, args, true))).toEqual(['unknown:input.owner.role', 'unknown:input.colour']);
  });

  it('leaves unknown top-level parameters to parseCallArgs, which names what the tool accepts', () => {
    expect(checkArguments(SCHEMA, { ...valid(), extra: 1 }, true)).toEqual([]);
  });

  it('accepts unknown fields where the schema allows them', () => {
    const open: ToolInputSchema = { type: 'object', properties: { input: { type: 'object', properties: {} } } };
    expect(checkArguments(open, { input: { anything: 1 } }, true)).toEqual([]);
  });
});

describe('checkArguments — formats a form would enforce', () => {
  it.each([
    ['input.email', { email: 'asha at gmail' }, 'must be a valid email address'],
    ['input.website', { website: 'not a site' }, 'must be a website address such as https://example.com'],
    ['input.owner.phone', { owner: { full_name: 'A', phone: 'N/A' } }, 'must be a phone number of 6 to 15 digits'],
    ['input.owner.upi_id', { owner: { full_name: 'A', upi_id: 'asha' } }, 'must be a UPI ID such as name@bank'],
    ['input.owner.ifsc_code', { owner: { full_name: 'A', ifsc_code: 'HDFC1234' } }, 'must be an 11-character IFSC such as HDFC0001234'],
    ['input.owner.gstin', { owner: { full_name: 'A', gstin: '29ABCDE1234F1' } }, 'must be a 15-character GSTIN'],
    ['input.contacts[0].contact_email', { contacts: [{ contact_email: 'x@' }] }, 'must be a valid email address'],
    ['input.contacts[0].pincode', { contacts: [{ contact_email: 'a@b.co', pincode: 'SW1A' }] }, 'must be a PIN code of digits only'],
  ])('refuses a malformed %s on a write', (path, extra, expectation) => {
    const problems = checkArguments(SCHEMA, { input: { ...valid().input, ...extra } }, true);
    expect(problems).toEqual([{ path, kind: 'format', message: `${path} ${expectation}.` }]);
  });

  it('does not hold a read to formats — a search may hold part of an address', () => {
    expect(checkArguments(SCHEMA, { input: { ...valid().input, email: 'asha@' } }, false)).toEqual([]);
  });

  it('leaves an empty optional format field alone', () => {
    expect(checkArguments(SCHEMA, { input: { ...valid().input, email: '' } }, true)).toEqual([]);
  });

  it('never echoes the value back — it may be personal data', () => {
    const [problem] = checkArguments(SCHEMA, { input: { ...valid().input, email: 'secret-person@' } }, true);
    expect(problem.message).not.toContain('secret-person');
  });
});

describe('checkArguments — reporting', () => {
  it('collects every problem in one pass, so the person is asked once', () => {
    const args = { input: { name: ' ', kind: 'PUB', seats: -1, email: 'x', owner: {} } };
    expect(paths(checkArguments(SCHEMA, args, true))).toEqual([
      'blank:input.name',
      'enum:input.kind',
      'range:input.seats',
      'format:input.email',
      'missing:input.owner.full_name',
    ]);
  });

  it(`stops at ${MAX_PROBLEMS} problems`, () => {
    const tags = Array.from({ length: MAX_PROBLEMS + 10 }, () => 7);
    expect(checkArguments(SCHEMA, { input: { ...valid().input, tags } }, false)).toHaveLength(MAX_PROBLEMS);
  });
});
