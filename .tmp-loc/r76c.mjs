import { apply } from "./e.mjs";
const CURLY = String.fromCharCode(8217);

apply("packages/earn/src/RescheduleMeetingDialog.tsx", [
  [
    "import EarnSlotPicker from './EarnSlotPicker';",
    "import EarnSlotPicker from './EarnSlotPicker';\nimport { useEarnSurface } from './EarnSurfaceProvider';",
  ],
  [
    "export default function RescheduleMeetingDialog({ open, kind, bookedAt, onClose, onDone }: Readonly<Props>) {\n  const [slot, setSlot] = useState('');",
    "export default function RescheduleMeetingDialog({ open, kind, bookedAt, onClose, onDone }: Readonly<Props>) {\n  const { meetingLabels: labels } = useEarnSurface();\n  const [slot, setSlot] = useState('');",
  ],
  [
    "    if (!slot) { setError('Please pick an available slot.'); return; }",
    "    if (!slot) { setError(labels.pickSlot); return; }",
  ],
  [
    "      setError(e instanceof Error ? e.message : 'Could not reschedule — please try again.');",
    "      setError(e instanceof Error ? e.message : labels.rescheduleFailed);",
  ],
  [
    "      <DialogTitle sx={{ fontWeight: 700 }}>Reschedule your onboarding meeting</DialogTitle>",
    "      <DialogTitle sx={{ fontWeight: 700 }}>{labels.rescheduleTitle}</DialogTitle>",
  ],
  [
    "              <Typography variant=\"body2\" color=\"text.secondary\">\n                Currently booked for <strong>{formatSlot(bookedAt)}</strong>. You can reschedule once.\n              </Typography>",
    "              <Typography variant=\"body2\" color=\"text.secondary\">\n                {labels.currentlyBooked(formatSlot(bookedAt))}\n              </Typography>",
  ],
  [
    "              <Alert severity=\"info\">No slots are open right now — please check back soon.</Alert>",
    "              <Alert severity=\"info\">{labels.noSlots}</Alert>",
  ],
  [
    "              <Typography variant=\"body2\">\n                Moving from <strong>{formatSlot(bookedAt)}</strong> to <strong>{formatSlot(slot)}</strong>.\n              </Typography>",
    "              <Typography variant=\"body2\">\n                {labels.movingFromTo(formatSlot(bookedAt), formatSlot(slot))}\n              </Typography>",
  ],
  [
    "            <MeetingReasonForm\n              formId=\"reschedule-reason-form\"\n              label=\"Reason for rescheduling\"\n              helperText=\"Tell our onboarding team why you" + CURLY + "re moving the meeting.\"\n              onSubmit={submit}\n            />",
    "            <MeetingReasonForm\n              formId=\"reschedule-reason-form\"\n              label={labels.rescheduleReasonLabel}\n              helperText={labels.rescheduleReasonHint}\n              labels={labels}\n              onSubmit={submit}\n            />",
  ],
  [
    "        <Button onClick={onClose} disabled={rescheduling}>Close</Button>",
    "        <Button onClick={onClose} disabled={rescheduling}>\n          {labels.close}\n        </Button>",
  ],
  [
    "          {rescheduling ? 'Moving…' : 'Move to this slot'}",
    "          {rescheduling ? labels.moving : labels.moveCta}",
  ],
]);
