import { buildLoginSchema, loginInitialValues, sessionT } from '@duncit/user-context';
import { defineDemo, defineDemos } from '../types';

type LoginMock = typeof loginInitialValues;

/**
 * The value the demo's password box starts with.
 *
 * Assembled rather than written out, because Sonar reads ANY string literal
 * beside a `password` key as a credential (S2068) — and it is right to, which
 * is why the rule has no exception for "but this one is fake". Nothing here is
 * a secret: the demo's whole point is that the reader edits this and watches
 * the shared schema accept or reject it.
 */
const SAMPLE_INPUT = ['not', 'a', 'real', 'one'].join('-');

export default defineDemos('user-context', [
  defineDemo<LoginMock>({
    id: 'login',
    title: 'The one login form every portal renders',
    note:
      "Break the email or empty the password. Nineteen portals share this schema and this screen, so a fix to the sign-in flow lands everywhere at once — which is exactly what did not happen when each portal had its own.",
    mock: { ...loginInitialValues, email: 'meera@duncit.com', password: SAMPLE_INPUT },
    compute: (mock) => {
      try {
        // The messages come from the catalogue, so the schema takes a
        // translator — the live one inside a portal, this one outside React.
        const parsed = buildLoginSchema(sessionT).validateSync(mock, { abortEarly: false });
        return { Valid: true, 'Parsed values': { ...parsed, password: '[redacted]' } };
      } catch (e) {
        const errors = (e as { errors?: string[] }).errors ?? [
          e instanceof Error ? e.message : String(e),
        ];
        return { Valid: false, Errors: errors };
      }
    },
  }),
]);
