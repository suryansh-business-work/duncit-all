import { apply } from "./e.mjs";
const CURLY = String.fromCharCode(8217); // right single quote used in the copy

apply("packages/earn/src/meeting-reason/meeting-reason.form.tsx", [
  [
    "import { blankMeetingReasonValues, type MeetingReasonValues } from './meeting-reason.types';\n\nexport const meetingReasonSchema = z.object({\n  reason: z.string().trim().min(1, 'Please tell us a reason.').max(500, 'Keep the reason under 500 characters.'),\n});",
    "import type { EarnMeetingLabels } from '../labels';\nimport { blankMeetingReasonValues, type MeetingReasonValues } from './meeting-reason.types';\n\n/** Built from the surface's labels: a validation message is copy the user\n *  reads, so it follows their language like the rest of the dialog (rule 38). */\nexport const buildMeetingReasonSchema = (labels: EarnMeetingLabels) =>\n  z.object({\n    reason: z.string().trim().min(1, labels.reasonRequired).max(500, labels.reasonTooLong),\n  });",
  ],
  [
    "interface Props {\n  formId: string;\n  label: string;\n  helperText: string;\n  onSubmit: (reason: string) => void;\n}",
    "interface Props {\n  formId: string;\n  label: string;\n  helperText: string;\n  labels: EarnMeetingLabels;\n  onSubmit: (reason: string) => void;\n}",
  ],
  [
    "export default function MeetingReasonForm({ formId, label, helperText, onSubmit }: Readonly<Props>) {",
    "export default function MeetingReasonForm({\n  formId,\n  label,\n  helperText,\n  labels,\n  onSubmit,\n}: Readonly<Props>) {",
  ],
  ["    resolver: zodResolver(meetingReasonSchema),", "    resolver: zodResolver(buildMeetingReasonSchema(labels)),"],
  [
    '        <Typography variant="caption">AI Monitoring</Typography>',
    "        <Typography variant=\"caption\">{labels.aiMonitoring}</Typography>",
  ],
]);

apply("packages/earn/src/CancelMeetingDialog.tsx", [
  [
    "import { CANCEL_MY_MEETING } from './queries';\nimport { MeetingReasonForm } from './meeting-reason';",
    "import { CANCEL_MY_MEETING } from './queries';\nimport { useEarnSurface } from './EarnSurfaceProvider';\nimport { MeetingReasonForm } from './meeting-reason';",
  ],
  [
    "export default function CancelMeetingDialog({ open, kind, onClose, onDone }: Readonly<Props>) {\n  const [error, setError] = useState<string | null>(null);",
    "export default function CancelMeetingDialog({ open, kind, onClose, onDone }: Readonly<Props>) {\n  const { meetingLabels: labels } = useEarnSurface();\n  const [error, setError] = useState<string | null>(null);",
  ],
  [
    "      setError(e instanceof Error ? e.message : 'Could not cancel — please try again.');",
    "      setError(e instanceof Error ? e.message : labels.cancelFailed);",
  ],
  [
    "      <DialogTitle sx={{ fontWeight: 700 }}>Cancel this meeting?</DialogTitle>",
    "      <DialogTitle sx={{ fontWeight: 700 }}>{labels.cancelTitle}</DialogTitle>",
  ],
  [
    "          <DialogContentText>\n            Your onboarding meeting will be cancelled and the slot freed. You can book a new one anytime.\n          </DialogContentText>\n          <MeetingReasonForm\n            formId=\"cancel-reason-form\"\n            label=\"Reason for cancelling\"\n            helperText=\"Tell our onboarding team why you" + CURLY + "re cancelling.\"\n            onSubmit={submit}\n          />",
    "          <DialogContentText>{labels.cancelBody}</DialogContentText>\n          <MeetingReasonForm\n            formId=\"cancel-reason-form\"\n            label={labels.cancelReasonLabel}\n            helperText={labels.cancelReasonHint}\n            labels={labels}\n            onSubmit={submit}\n          />",
  ],
  [
    "        <Button onClick={onClose} disabled={cancelling}>Keep meeting</Button>",
    "        <Button onClick={onClose} disabled={cancelling}>\n          {labels.keepMeeting}\n        </Button>",
  ],
  [
    "          {cancelling ? 'Cancelling…' : 'Cancel meeting'}",
    "          {cancelling ? labels.cancelling : labels.cancelCta}",
  ],
]);
