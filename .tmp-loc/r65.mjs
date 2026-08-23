import { apply } from "./e.mjs";

// ---- HostPodActionsMenu
apply("packages/host-pod-actions/src/HostPodActionsMenu.tsx", [
  [
    "      <Tooltip title=\"Pod actions\">",
    "      <Tooltip title={labels.menuTooltip}>",
  ],
  [
    "            aria-label={`Actions for ${podTitle}`}",
    "            aria-label={labels.menuAria(podTitle)}",
  ],
  [
    '            <ListItemText primary="Scan attendee event tickets" />',
    "            <ListItemText primary={labels.scanTickets} />",
  ],
  [
    '            <ListItemText primary="Complete pod" />',
    "            <ListItemText primary={labels.completePod} />",
  ],
  [
    '          <ListItemText primary="Edit pod" />',
    "          <ListItemText primary={labels.editPod} />",
  ],
  [
    '          <ListItemText primary="Cancel pod" />',
    "          <ListItemText primary={labels.cancelPod} />",
  ],
]);

// ---- PodEditDialog
apply("packages/host-pod-actions/src/PodEditDialog.tsx", [
  [
    "      <DialogTitle sx={{ fontWeight: 700 }}>Edit pod</DialogTitle>",
    "      <DialogTitle sx={{ fontWeight: 700 }}>{labels.editPod}</DialogTitle>",
  ],
  ['            label="Title"', "            label={labels.fieldTitle}"],
  ['            label="Description"', "            label={labels.fieldDescription}"],
  ["                label: 'Media',", "                label: labels.fieldMedia,"],
  [
    "        <Button onClick={onClose} disabled={busy}>\n          Cancel\n        </Button>",
    "        <Button onClick={onClose} disabled={busy}>\n          {labels.cancel}\n        </Button>",
  ],
  [
    "          {busy ? 'Saving…' : 'Save changes'}",
    "          {busy ? labels.saving : labels.saveChanges}",
  ],
]);

// ---- PodResubmitDialog
apply("packages/host-pod-actions/src/pod-resubmit/PodResubmitDialog.tsx", [
  [
    "      <DialogTitle sx={{ fontWeight: 700 }}>Edit &amp; resubmit pod</DialogTitle>",
    "      <DialogTitle sx={{ fontWeight: 700 }}>{labels.resubmitTitle}</DialogTitle>",
  ],
  [
    "          <Alert severity=\"info\">\n            Select a different venue or choose a different time slot — your booking request is sent\n            to the venue again when you resubmit. Your pod is kept, no new pod is created.\n          </Alert>",
    "          <Alert severity=\"info\">{labels.resubmitHint}</Alert>",
  ],
  ['            label="Title"', "            label={labels.fieldTitle}"],
  ['            label="Description"', "            label={labels.fieldDescription}"],
  ["                label: 'Media',", "                label: labels.fieldMedia,"],
  [
    "        <Button onClick={onClose} disabled={busy}>\n          Cancel\n        </Button>",
    "        <Button onClick={onClose} disabled={busy}>\n          {labels.cancel}\n        </Button>",
  ],
  [
    "          {busy ? 'Resubmitting…' : 'Resubmit request'}",
    "          {busy ? labels.resubmitting : labels.resubmitCta}",
  ],
]);

// ---- VenueSlotFields
apply("packages/host-pod-actions/src/pod-resubmit/VenueSlotFields.tsx", [
  [
    "export function VenueField({ venues, value, error, onChange }: Readonly<VenueFieldProps>) {\n  return (",
    "export function VenueField({ venues, value, error, onChange }: Readonly<VenueFieldProps>) {\n  const { labels } = useHostPodActionsConfig();\n  return (",
  ],
  [
    "      label=\"Venue\"\n      required",
    "      label={labels.venue}\n      required",
  ],
  [
    "      helperText={error ?? 'Pick the venue to request'}",
    "      helperText={error ?? labels.venueHint}",
  ],
]);

// ---- ScannerViewport
apply("packages/host-pod-actions/src/ticket-scan/ScannerViewport.tsx", [
  ['label="Or paste the ticket code"', "label={labels.pasteTicketCode}"],
]);

// ---- TicketScanDialog
apply("packages/host-pod-actions/src/ticket-scan/TicketScanDialog.tsx", [
  ["<Button onClick={close}>Close</Button>", "<Button onClick={close}>{labels.close}</Button>"],
]);
