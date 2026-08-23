import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/shell.ts", [
  [
    "      spaceHolds: '{label} · holds {capacity}',",
    "      spaceHolds: '{label} · holds {capacity}',\n      holdsCapacity: 'holds {capacity}',",
  ],
]);

apply("packages/availability-calendar/src/DayDrawer/SlotList.tsx", [
  [
    "                  {slot.capacity\n                    ? ` · ${t('shell.availability.spaceHolds', {\n                        vars: { label: '', capacity: slot.capacity },\n                      }).replace(/^ ?· ?/, '')}`\n                    : ''}",
    "                  {slot.capacity\n                    ? ` · ${t('shell.availability.holdsCapacity', { vars: { capacity: slot.capacity } })}`\n                    : ''}",
  ],
]);
