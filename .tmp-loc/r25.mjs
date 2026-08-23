import { apply } from "./e.mjs";

apply("packages/user-context/src/login-screen/index.ts", [
  [
    "export { default as LoginForm, loginSchema } from './login.form';",
    "export { default as LoginForm, buildLoginSchema } from './login.form';",
  ],
]);
apply("packages/user-context/src/index.ts", [
  [
    "export { LoginScreen, LoginForm, loginSchema, glass, loginInitialValues } from './login-screen';",
    "export { LoginScreen, LoginForm, buildLoginSchema, glass, loginInitialValues } from './login-screen';",
  ],
]);
apply("packages/docs-demos/src/demos/user-context.tsx", [
  [
    "import { loginInitialValues, loginSchema } from '@duncit/user-context';",
    "import { buildLoginSchema, loginInitialValues, sessionT } from '@duncit/user-context';",
  ],
  [
    "        const parsed = loginSchema.validateSync(mock, { abortEarly: false });",
    "        // The messages come from the catalogue, so the schema takes a\n        // translator — the live one inside a portal, this one outside React.\n        const parsed = buildLoginSchema(sessionT).validateSync(mock, { abortEarly: false });",
  ],
]);
