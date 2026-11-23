import { firstGraphQLError, parseApiError } from '@duncit/utils';
import type { LeadQualityIssue } from '../../api/leadQuality.gql';

/** What a refused settings write means for the page. */
export interface SettingsFailure {
  /** Someone else saved or published after this editor loaded (`CONFLICT`): only a reload helps. */
  conflict: boolean;
  /** The configuration problems a `BAD_USER_INPUT` refusal listed, for the form's fields. */
  issues: LeadQualityIssue[];
  /** The server's sentence, for anything else. */
  message: string;
}

function isIssue(value: unknown): value is LeadQualityIssue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    typeof value.path === 'string' &&
    'code' in value &&
    typeof value.code === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

/** Reads a thrown save/publish/restore error: its code and, when the server listed them, the issues. */
export function readFailure(error: unknown): SettingsFailure {
  const extensions = firstGraphQLError(error)?.extensions;
  const issues = extensions?.code === 'BAD_USER_INPUT' && Array.isArray(extensions.issues) ? extensions.issues.filter(isIssue) : [];
  return { conflict: extensions?.code === 'CONFLICT', issues, message: parseApiError(error) };
}
