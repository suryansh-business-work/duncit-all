import { apply } from "./e.mjs";

apply("packages/earn/src/EarnSurfaceProvider.tsx", [
  [
    "import type { SlotLabels } from '@duncit/slots';",
    "import type { SlotLabels } from '@duncit/slots';\nimport type { EarnMeetingLabels } from './labels';",
  ],
  [
    "  /** Badge shown on the currently-booked slot in the reschedule picker. */\n  currentSlotBadge: string;",
    "  /** Badge shown on the currently-booked slot in the reschedule picker. */\n  currentSlotBadge: string;\n  /** The meeting dialogs' copy, from `buildEarnMeetingLabels(t, <ns>)`. */\n  meetingLabels: EarnMeetingLabels;",
  ],
]);
