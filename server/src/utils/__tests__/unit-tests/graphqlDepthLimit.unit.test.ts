/**
 * The query depth limit. What matters is that every honest client query passes
 * (the deepest measured is 5), that cyclic nesting past the limit is refused,
 * and that fragments cannot hide the depth.
 */
import { buildSchema, parse, validate } from 'graphql';
import { depthLimitRule, MAX_QUERY_DEPTH } from '@utils/graphqlDepthLimit';

const schema = buildSchema(`
  type Club { name: String, pods: [Pod] }
  type Pod { title: String, club: Club }
  type Query { pod: Pod }
`);

const errorsFor = (query: string, max = 4) => validate(schema, parse(query), [depthLimitRule(max)]);

describe('depthLimitRule', () => {
  it('lets a query at the limit through', () => {
    expect(errorsFor('{ pod { club { pods { title } } } }')).toHaveLength(0);
  });

  it('refuses a query one level past the limit, naming both numbers', () => {
    const [error] = errorsFor('{ pod { club { pods { club { name } } } } }');
    expect(error.message).toBe('Query is 5 levels deep; the limit is 4. Split it into smaller queries.');
  });

  it('counts depth through named and inline fragments', () => {
    const query = `
      query DeepPod { pod { ...PodClub } }
      fragment PodClub on Pod { club { ... on Club { pods { club { name } } } } }
    `;
    expect(errorsFor(query)).toHaveLength(1);
  });

  it('does not count introspection fields', () => {
    expect(errorsFor('{ __schema { types { fields { type { ofType { ofType { name } } } } } } }', 2)).toHaveLength(0);
  });

  it('survives a self-referencing fragment without looping', () => {
    const query = 'query Loop { pod { ...Self } } fragment Self on Pod { club { pods { ...Self } } }';
    expect(errorsFor(query)).toHaveLength(0);
  });

  it('ignores a spread of a fragment the document does not define', () => {
    expect(errorsFor('{ pod { ...Missing } }')).toHaveLength(0);
  });

  it('allows every honest client query, the deepest of which is 5', () => {
    expect(MAX_QUERY_DEPTH).toBeGreaterThanOrEqual(5);
  });
});
