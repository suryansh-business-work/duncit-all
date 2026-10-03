import type { FlowIssue } from './types';

interface ErrorWithIssues {
  extensions?: { issues?: unknown };
}

/** An issue field as text: a non-empty string or number, otherwise null. */
function textOrNull(value: unknown): string | null {
  if (typeof value === 'string') return value || null;
  return typeof value === 'number' ? String(value) : null;
}

/**
 * The step-by-step issues the server attaches when it refuses to run or
 * activate a flow. Apollo Client 4 lists GraphQL errors under `errors`; the
 * older `graphQLErrors` is read too, the same way `parseApiError` does.
 */
export function issuesFromError(error: unknown): FlowIssue[] {
  const source = error as { errors?: ErrorWithIssues[]; graphQLErrors?: ErrorWithIssues[] } | null;
  const first = source?.errors?.[0] ?? source?.graphQLErrors?.[0];
  const issues = first?.extensions?.issues;
  if (!Array.isArray(issues)) return [];
  return issues
    .filter((issue): issue is { node_id?: unknown; message?: unknown } => !!issue && typeof issue === 'object')
    .map((issue) => ({ node_id: textOrNull(issue.node_id), message: textOrNull(issue.message) ?? '' }));
}
