import { apply } from "./e.mjs";

apply("packages/earn/docs/index.mdx", [
  ["  - 'meetingReasonSchema'", "  - 'buildMeetingReasonSchema'\n  - 'buildEarnMeetingLabels'"],
  [
    "import { EarnJourneyList, EarnSurfaceProvider, type EarnSurfaceConfig } from '@duncit/earn';\nimport { mwebCurrentLabel, mwebMeetingLabels } from '@duncit/slots';",
    "import {\n  EarnJourneyList,\n  EarnSurfaceProvider,\n  mwebEarnMeetingLabels,\n  type EarnSurfaceConfig,\n} from '@duncit/earn';\nimport { mwebCurrentLabel, mwebMeetingLabels } from '@duncit/slots';",
  ],
  [
    "  meetingSlotLabels: (rescheduling) => mwebMeetingLabels(t, rescheduling),\n  currentSlotBadge: mwebCurrentLabel(t),\n};",
    "  meetingSlotLabels: (rescheduling) => mwebMeetingLabels(t, rescheduling),\n  currentSlotBadge: mwebCurrentLabel(t),\n  // The dialogs' own copy, from the same namespace (portal:\n  // shellEarnMeetingLabels).\n  meetingLabels: mwebEarnMeetingLabels(t),\n};",
  ],
]);

apply("packages/docs-demos/src/demos/earn.tsx", [
  [
    "import { blankMeetingReasonValues, meetingReasonSchema } from '@duncit/earn';",
    "import {\n  blankMeetingReasonValues,\n  buildEarnMeetingLabels,\n  buildMeetingReasonSchema,\n} from '@duncit/earn';",
  ],
  [
    "      const parsed = meetingReasonSchema.safeParse(mock);",
    "      // The messages come from the catalogue, so the schema takes the same\n      // labels the dialog renders — the key itself stands in for a translator.\n      const parsed = buildMeetingReasonSchema(\n        buildEarnMeetingLabels((key) => key, 'mweb'),\n      ).safeParse(mock);",
  ],
]);
