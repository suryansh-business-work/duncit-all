import { apply } from "./e.mjs";
apply("packages/earn/src/meeting-reason/meeting-reason.form.cy.tsx", [
  [
    "import { meetingReasonSchema } from './meeting-reason.form';\nimport { blankMeetingReasonValues, type MeetingReasonValues } from './meeting-reason.types';",
    "import { buildEarnMeetingLabels } from '../labels';\nimport { buildMeetingReasonSchema } from './meeting-reason.form';\nimport { blankMeetingReasonValues, type MeetingReasonValues } from './meeting-reason.types';\n\n// The schema reads its messages from the surface's labels; outside React the\n// key itself stands in for a translator.\nconst meetingReasonSchema = buildMeetingReasonSchema(\n  buildEarnMeetingLabels((key) => key, 'mweb'),\n);",
  ],
]);
