import { apply } from "./e.mjs";
apply("packages/earn/src/meeting-reason/index.tsx", [
  [
    "export { default as MeetingReasonForm, meetingReasonSchema } from './meeting-reason.form';",
    "export { default as MeetingReasonForm, buildMeetingReasonSchema } from './meeting-reason.form';",
  ],
]);
apply("packages/earn/src/index.ts", [
  [
    "export { MeetingReasonForm, blankMeetingReasonValues, meetingReasonSchema } from './meeting-reason';\nexport type { MeetingReasonValues } from './meeting-reason';",
    "export { MeetingReasonForm, blankMeetingReasonValues, buildMeetingReasonSchema } from './meeting-reason';\nexport type { MeetingReasonValues } from './meeting-reason';\n\nexport {\n  buildEarnMeetingLabels,\n  mwebEarnMeetingLabels,\n  shellEarnMeetingLabels,\n} from './labels';\nexport type { EarnMeetingLabels, EarnTranslate } from './labels';",
  ],
]);
