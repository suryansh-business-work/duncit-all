import { apply } from "./e.mjs";
apply("packages/availability-calendar/src/DayDrawer/index.tsx", [
  ["import { formatDate, } from '@duncit/datetime';", "import { formatDate } from '@duncit/datetime';"],
]);
// The drawer's close button reads the shared `Close`; drop the unused key.
apply("packages/i18n/src/bundles/shell.ts", [
  ["      closeDrawer: 'Close',\n", ""],
]);
