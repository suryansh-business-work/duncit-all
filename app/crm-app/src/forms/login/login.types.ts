import { loginDefaults, makeLoginSchema, type LoginFormValues } from '@duncit/forms/schemas';

/**
 * The CRM portal's sign-in rules: the shared email + password schema from
 * @duncit/forms/schemas (the EMAIL channel), so the app refuses exactly what
 * the server and the other sign-in forms refuse. The form shows only the
 * email and password boxes; the phone boxes stay at their blank defaults.
 */
export { loginDefaults, makeLoginSchema, type LoginFormValues };
