import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/shell.ts", [
  [
    "      leaveTag: 'LEAVE',",
    "      leaveTag: 'LEAVE',\n      // The existing-slot list inside the day drawer.\n      existingSlots: 'Existing slots',\n      noSlotsForDate: 'No slots for this date yet.',\n      free: 'Free',\n      wholeDayRange: 'Whole day · {from} – {to}',\n      timeRange: '{from} – {to}',\n      requestedByPod: 'Requested by pod',\n      bookedByPod: 'Booked by pod',\n      awaitingDecision:\n        'Awaiting your decision — approve or decline it under Slot Requests.',\n      block: 'Block',\n      unblock: 'Unblock',",
  ],
]);

apply("packages/availability-calendar/src/DayDrawer/SlotList.tsx", [
  [
    "import { formatDate, formatDateTime, formatTime } from '@duncit/datetime';\n\nconst priceLabel = (price: number) => (price > 0 ? `₹${price}` : 'Free');",
    "import { formatDate, formatDateTime, formatTime } from '@duncit/datetime';\nimport { useTranslation } from '@duncit/app-settings';\n\n/** The translator this list and its label helper read their copy from. */\ntype Translate = ReturnType<typeof useTranslation>['t'];\n\nconst priceLabel = (price: number, t: Translate) =>\n  price > 0 ? `₹${price}` : t('shell.availability.free');",
  ],
  [
    "export function slotWhenLabel(slot: Pick<VenueSlotRow, 'start_at' | 'end_at' | 'whole_day'>): string {\n  const start = new Date(slot.start_at);\n  const end = new Date(slot.end_at);\n  // The end instant is exclusive: ending exactly at midnight claims no extra day.\n  const multiDay = !isSameDay(start, new Date(end.getTime() - 1));\n  if (slot.whole_day) {\n    return multiDay ? `Whole day · ${formatDate(start)} – ${formatDate(end)}` : 'Whole day';\n  }\n  if (multiDay) {\n    return `${formatDateTime(start)} – ${formatDateTime(end)}`;\n  }\n  return `${formatTime(start)} – ${formatTime(end)}`;\n}",
    "export function slotWhenLabel(\n  slot: Pick<VenueSlotRow, 'start_at' | 'end_at' | 'whole_day'>,\n  t: Translate,\n): string {\n  const start = new Date(slot.start_at);\n  const end = new Date(slot.end_at);\n  // The end instant is exclusive: ending exactly at midnight claims no extra day.\n  const multiDay = !isSameDay(start, new Date(end.getTime() - 1));\n  if (slot.whole_day) {\n    if (!multiDay) return t('shell.slots.wholeDay');\n    return t('shell.availability.wholeDayRange', {\n      vars: { from: formatDate(start), to: formatDate(end) },\n    });\n  }\n  if (multiDay) {\n    return t('shell.availability.timeRange', {\n      vars: { from: formatDateTime(start), to: formatDateTime(end) },\n    });\n  }\n  return t('shell.availability.timeRange', {\n    vars: { from: formatTime(start), to: formatTime(end) },\n  });\n}",
  ],
  [
    "        Existing slots\n      </Typography>",
    "        {t('shell.availability.existingSlots')}\n      </Typography>",
  ],
  [
    "          No slots for this date yet.\n        </Typography>",
    "          {t('shell.availability.noSlotsForDate')}\n        </Typography>",
  ],
  ["                  {slotWhenLabel(slot)}", "                  {slotWhenLabel(slot, t)}"],
  ["                    {priceLabel(slot.price)}", "                    {priceLabel(slot.price, t)}"],
  [
    "                  {slot.capacity ? ` · holds ${slot.capacity}` : ''}",
    "                  {slot.capacity\n                    ? ` · ${t('shell.availability.spaceHolds', {\n                        vars: { label: '', capacity: slot.capacity },\n                      }).replace(/^ ?· ?/, '')}`\n                    : ''}",
  ],
  [
    "                  {slot.status === 'PENDING' ? 'Requested by pod' : 'Booked by pod'}: {slot.booked_pod_title}",
    "                  {slot.status === 'PENDING'\n                    ? t('shell.availability.requestedByPod')\n                    : t('shell.availability.bookedByPod')}\n                  : {slot.booked_pod_title}",
  ],
  [
    "                  Awaiting your decision — approve or decline it under Slot Requests.\n                </Typography>",
    "                  {t('shell.availability.awaitingDecision')}\n                </Typography>",
  ],
  [
    "                    {slot.status === 'BLOCKED' ? 'Unblock' : 'Block'}\n                  </Button>",
    "                    {slot.status === 'BLOCKED'\n                      ? t('shell.availability.unblock')\n                      : t('shell.availability.block')}\n                  </Button>",
  ],
  [
    "                  <Button size=\"small\" color=\"error\" startIcon={<DeleteOutlineIcon />} onClick={() => setConfirmDeleteId(slot.id)}>\n                    Delete\n                  </Button>",
    "                  <Button\n                    size=\"small\"\n                    color=\"error\"\n                    startIcon={<DeleteOutlineIcon />}\n                    onClick={() => setConfirmDeleteId(slot.id)}\n                  >\n                    {t('shell.common.delete')}\n                  </Button>",
  ],
  [
    "          <Button color=\"error\" variant=\"contained\" onClick={handleConfirmDelete}>\n            Delete\n          </Button>",
    "          <Button color=\"error\" variant=\"contained\" onClick={handleConfirmDelete}>\n            {t('shell.common.delete')}\n          </Button>",
  ],
]);
