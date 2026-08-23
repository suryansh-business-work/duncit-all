import { apply } from "./e.mjs";
// The console's own rows for that field are gone with the copy; the shared
// `media.*` namespace answers them now.
apply("packages/i18n/src/bundles/onboarding.ts", [
  [
    "    mediaListField: {\n      addImage: 'Add image',\n      remove: 'Remove',\n      replace: 'Replace',\n    },\n",
    "",
  ],
]);
