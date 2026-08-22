import { loginInitialValues, loginSchema } from '@duncit/user-context';
import { defineDemo, defineDemos } from '../types';

type LoginMock = typeof loginInitialValues;

export default defineDemos('user-context', [
  defineDemo<LoginMock>({
    id: 'login',
    title: 'The one login form every portal renders',
    note:
      "Break the email or empty the password. Nineteen portals share this schema and this screen, so a fix to the sign-in flow lands everywhere at once — which is exactly what did not happen when each portal had its own.",
    mock: { ...loginInitialValues, email: 'meera@duncit.com', password: 'not-a-real-password' },
    compute: (mock) => {
      try {
        const parsed = loginSchema.validateSync(mock, { abortEarly: false });
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
