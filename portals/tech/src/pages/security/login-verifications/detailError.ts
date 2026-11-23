import type { Translate } from '@duncit/table';
import { firstGraphQLError } from '@duncit/utils';

/** The refusals worth naming; the keys are written out whole for the shipped-key gate. */
const ERROR_KEY: Readonly<Record<string, string>> = {
  FORBIDDEN: 'tech.loginVerifications.detail.errorForbidden',
  NOT_FOUND: 'tech.loginVerifications.detail.errorNotFound',
};

/**
 * What to tell a reviewer whose attempt to open a record failed.
 *
 * Access is enforced on the server, so a reviewer who has lost the role, and a
 * record that aged out of its retention window, both reach here as an error —
 * and each deserves its own sentence rather than a transport message.
 */
export function detailErrorText(t: Translate, error: unknown): string {
  const code = firstGraphQLError(error)?.extensions?.code;
  const key = typeof code === 'string' ? ERROR_KEY[code] : undefined;
  return key ? t(key) : t('tech.loginVerifications.detail.errorGeneric');
}
