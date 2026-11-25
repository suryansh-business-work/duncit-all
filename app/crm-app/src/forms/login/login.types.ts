import {
  consoleLoginDefaults,
  makeConsoleLoginSchema,
  type ConsoleLoginValues,
} from '@duncit/forms/schemas';

/**
 * The CRM portal's sign-in rules: the console login schema every portal's
 * login card uses (@duncit/forms/schemas) — an address and any non-empty
 * password, with the portal's own `session.login.*` messages.
 */
export const loginDefaults = consoleLoginDefaults;
export const makeLoginSchema = makeConsoleLoginSchema;
export type LoginFormValues = ConsoleLoginValues;
