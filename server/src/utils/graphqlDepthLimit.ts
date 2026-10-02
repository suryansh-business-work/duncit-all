import {
  GraphQLError,
  Kind,
  type ASTVisitor,
  type FragmentDefinitionNode,
  type SelectionSetNode,
  type ValidationContext,
} from 'graphql';

/**
 * The deepest selection any operation may make.
 *
 * Measured on 2026-10-02 across every client document (1,982 operations in mWeb,
 * native, the portals, the packages and the websites): the deepest is 5. Ten
 * leaves room for every honest query and still refuses the cyclic
 * `pod { club { pods { club { … } } } }` nesting a hostile caller would use to
 * make one request cost the database thousands of reads.
 */
export const MAX_QUERY_DEPTH = 10;

/**
 * Depth of a selection set, following fragment spreads. Introspection fields
 * (`__schema`, `__type`, …) are not counted: their `ofType` chains are deep by
 * design, and Apollo already disables introspection in production.
 */
function selectionDepth(
  set: SelectionSetNode | undefined,
  fragments: Record<string, FragmentDefinitionNode>,
  visiting: ReadonlySet<string>
): number {
  if (!set) return 0;
  let max = 0;
  for (const node of set.selections) {
    if (node.kind === Kind.FIELD) {
      if (!node.name.value.startsWith('__')) {
        max = Math.max(max, 1 + selectionDepth(node.selectionSet, fragments, visiting));
      }
    } else if (node.kind === Kind.INLINE_FRAGMENT) {
      max = Math.max(max, selectionDepth(node.selectionSet, fragments, visiting));
    } else {
      const name = node.name.value;
      // A fragment that spreads itself is already rejected by the spec's
      // NoFragmentCycles rule; the guard only keeps this walk from looping first.
      if (!visiting.has(name)) {
        max = Math.max(max, selectionDepth(fragments[name]?.selectionSet, fragments, new Set([...visiting, name])));
      }
    }
  }
  return max;
}

/** Apollo `validationRules` entry: refuses any operation deeper than `maxDepth`. */
export function depthLimitRule(maxDepth: number) {
  return (context: ValidationContext): ASTVisitor => {
    const fragments: Record<string, FragmentDefinitionNode> = {};
    for (const definition of context.getDocument().definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) fragments[definition.name.value] = definition;
    }
    return {
      OperationDefinition(operation) {
        const depth = selectionDepth(operation.selectionSet, fragments, new Set());
        // Apollo stamps every validation error GRAPHQL_VALIDATION_FAILED, which
        // graphqlErrorLevel already logs as the caller's problem.
        if (depth > maxDepth) {
          context.reportError(
            new GraphQLError(`Query is ${depth} levels deep; the limit is ${maxDepth}. Split it into smaller queries.`, {
              nodes: [operation],
            })
          );
        }
      },
    };
  };
}
