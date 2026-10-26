import { buildSchema, GraphQLBoolean, GraphQLList, GraphQLNonNull, GraphQLString, type GraphQLArgument } from 'graphql';
import { MAX_STRING_LENGTH } from '../../mcp.constants';
import { clip, objectSchema, schemaForType } from '../../catalog/json-schema';

const SDL = /* GraphQL */ `
  scalar JSON
  "Where a pod stands."
  enum PodStatus {
    LIVE
    DRAFT
  }
  enum Plain {
    A
  }
  "A pod to create."
  input PodInput {
    "Shown on the pod card."
    pod_title: String!
    spots: Int = 10
    status: PodStatus = DRAFT
    tags: [String!]
    location: LocationInput
    old_field: String @deprecated(reason: "Use pod_title")
  }
  input LocationInput {
    lat: Float!
    lng: Float!
  }
  input L1 {
    l2: L2
  }
  input L2 {
    l3: L3
  }
  input L3 {
    l4: L4
  }
  input L4 {
    l5: L5
  }
  input L5 {
    leaf: String
  }
  input Filter {
    field: String
    and: [Filter!]
  }
  type Query {
    scalars(s: String, id: ID!, n: Int, f: Float, b: Boolean, j: JSON): Int
    enums(status: PodStatus!, plain: Plain, "Pick one." described: PodStatus): Int
    lists(ids: [ID!]!, matrix: [[Int]]): Int
    nested(input: PodInput!): Int
    deep(input: L1): Int
    recursive(filter: Filter): Int
    defaults(page: Int! = 1, flag: Boolean = true, nothing: String = null): Int
  }
`;

const schema = buildSchema(SDL);
const args = (field: string): readonly GraphQLArgument[] => {
  const found = schema.getQueryType()?.getFields()[field];
  if (!found) throw new Error(`no field ${field}`);
  return found.args;
};

describe('clip', () => {
  it('collapses whitespace and trims', () => {
    expect(clip('  Pods\n\n  in   the table  ')).toBe('Pods in the table');
  });

  it('returns undefined for missing or blank text', () => {
    expect(clip(undefined)).toBeUndefined();
    expect(clip(null)).toBeUndefined();
    expect(clip('   \n ')).toBeUndefined();
  });

  it('keeps text of exactly the limit and cuts one character over it with an ellipsis', () => {
    expect(clip('a'.repeat(400))).toBe('a'.repeat(400));
    const cut = clip('a'.repeat(401));
    expect(cut).toHaveLength(400);
    expect(cut?.endsWith('…')).toBe(true);
    expect(clip('abcdef', 4)).toBe('abc…');
  });
});

describe('schemaForType — scalars', () => {
  const props = objectSchema(args('scalars'), 0).properties ?? {};

  it('bounds strings by the server-side string limit', () => {
    expect(props.s).toEqual({ type: 'string', maxLength: MAX_STRING_LENGTH });
  });

  it('describes an ID as a non-empty bounded string', () => {
    expect(props.id).toEqual({ type: 'string', minLength: 1, maxLength: 200 });
  });

  it('keeps Int inside the 32-bit range GraphQL enforces', () => {
    expect(props.n).toEqual({ type: 'integer', minimum: -2_147_483_648, maximum: 2_147_483_647 });
  });

  it('maps Float and Boolean to JSON number and boolean', () => {
    expect(props.f).toEqual({ type: 'number' });
    expect(props.b).toEqual({ type: 'boolean' });
  });

  it('leaves a custom scalar untyped, so the resolver parser decides', () => {
    expect(props.j).toEqual({ description: 'JSON value' });
  });
});

describe('schemaForType — enums and lists', () => {
  const enums = objectSchema(args('enums'), 0);

  it('lists the enum values and carries the enum description', () => {
    expect(enums.properties?.status).toEqual({ type: 'string', enum: ['LIVE', 'DRAFT'], description: 'Where a pod stands.' });
  });

  it('omits the description when the enum has none', () => {
    expect(enums.properties?.plain).toEqual({ type: 'string', enum: ['A'] });
  });

  it('lets the argument description replace the type description', () => {
    expect(enums.properties?.described?.description).toBe('Pick one.');
  });

  it('turns a list (and a list of lists) into arrays of the item schema', () => {
    const lists = objectSchema(args('lists'), 0).properties ?? {};
    expect(lists.ids).toEqual({ type: 'array', items: { type: 'string', minLength: 1, maxLength: 200 } });
    expect(lists.matrix).toEqual({ type: 'array', items: { type: 'array', items: expect.objectContaining({ type: 'integer' }) } });
  });

  it('unwraps non-null wrappers directly built in code too', () => {
    expect(schemaForType(new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLBoolean))))).toEqual({
      type: 'array',
      items: { type: 'boolean' },
    });
  });
});

describe('objectSchema — nested input objects', () => {
  const nested = objectSchema(args('nested'), 0);
  const input = nested.properties?.input;

  it('describes an input object as a closed object with its own fields', () => {
    expect(input?.type).toBe('object');
    expect(input?.additionalProperties).toBe(false);
    expect(Object.keys(input?.properties ?? {})).toEqual(['pod_title', 'spots', 'status', 'tags', 'location', 'old_field']);
    expect(input?.description).toBe('A pod to create.');
  });

  it('requires only non-null fields without a default', () => {
    expect(input?.required).toEqual(['pod_title']);
    expect(input?.properties?.location?.required).toEqual(['lat', 'lng']);
    expect(nested.required).toEqual(['input']);
  });

  it('carries GraphQL defaults (enum names included) as JSON defaults', () => {
    expect(input?.properties?.spots?.default).toBe(10);
    expect(input?.properties?.status?.default).toBe('DRAFT');
  });

  it('uses the field description over the type, and marks deprecated fields', () => {
    expect(input?.properties?.pod_title?.description).toBe('Shown on the pod card.');
    expect(input?.properties?.old_field?.description).toBe('Deprecated: Use pod_title');
  });
});

describe('objectSchema — depth cap', () => {
  it('describes input objects deeper than the cap as a plain object', () => {
    const l1 = objectSchema(args('deep'), 0).properties?.input;
    const l4 = l1?.properties?.l2?.properties?.l3?.properties?.l4;
    expect(l4?.properties?.l5).toEqual({ type: 'object', description: 'L5 input' });
    expect(l4?.type).toBe('object');
    expect(l4?.additionalProperties).toBe(false);
  });

  it('terminates on a self-referencing input type', () => {
    const filter = objectSchema(args('recursive'), 0).properties?.filter;
    let level = filter;
    let depth = 0;
    while (level?.properties?.and) {
      level = level.properties.and.items;
      depth += 1;
    }
    // Four levels of real objects (the same depth as L1→L4), then a plain object.
    expect(depth).toBe(4);
    expect(level).toEqual({ type: 'object', description: 'Filter input' });
  });
});

describe('objectSchema — required versus defaulted', () => {
  const defaults = objectSchema(args('defaults'), 0);

  it('does not require a non-null argument that has a default', () => {
    expect(defaults.required).toBeUndefined();
    expect(defaults.properties?.page?.default).toBe(1);
    expect(defaults.properties?.flag?.default).toBe(true);
  });

  it('keeps an explicit null default', () => {
    expect(defaults.properties?.nothing).toHaveProperty('default', null);
  });

  it('drops a default that cannot be written as JSON instead of throwing', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const arg = {
      name: 'weird',
      description: null,
      type: GraphQLString,
      defaultValue: circular,
      deprecationReason: null,
      extensions: {},
      astNode: undefined,
    } as unknown as GraphQLArgument;
    const result = objectSchema([arg], 0);
    expect(result.properties?.weird).toEqual({ type: 'string', maxLength: MAX_STRING_LENGTH });
  });

  it('returns an empty closed object for a field with no arguments', () => {
    expect(objectSchema([], 0)).toEqual({ type: 'object', properties: {}, additionalProperties: false });
  });
});
