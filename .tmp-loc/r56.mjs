import { apply } from "./e.mjs";
apply("packages/ad-request-form/src/ad-request.types.test.ts", [
  [
    "import {\n  adRequestSchema,\n  blankAdRequestValues,\n  makeAdRequestSchema,\n  toSubmitAdRequestInput,\n} from './ad-request.types';",
    "import {\n  buildAdRequestSchema,\n  blankAdRequestValues,\n  makeAdRequestSchema,\n  toSubmitAdRequestInput,\n} from './ad-request.types';\nimport { adRequestT as t } from './i18n/useTranslation';\n\nconst adRequestSchema = buildAdRequestSchema(t);",
  ],
  ["    const short = makeAdRequestSchema({ min: 1, max: 30 });", "    const short = makeAdRequestSchema({ min: 1, max: 30 }, t);"],
  ["    const long = makeAdRequestSchema({ min: 1, max: 90 });", "    const long = makeAdRequestSchema({ min: 1, max: 90 }, t);"],
]);
