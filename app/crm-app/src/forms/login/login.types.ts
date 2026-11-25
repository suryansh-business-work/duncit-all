/**
 * The CRM portal's sign-in rules: the console login schema every portal's
 * login card uses (@duncit/forms/schemas) — an address and any non-empty
 * password, with the portal's own `session.login.*` messages.
 */
export {
  consoleLoginDefaults as loginDefaults,
  makeConsoleLoginSchema as makeLoginSchema,
  type ConsoleLoginValues as LoginFormValues,
} from '@duncit/forms/schemas';
