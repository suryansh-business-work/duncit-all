import { apply } from "./e.mjs";

// ---- PodCancelDialog: schema factory + every sentence
apply("packages/host-pod-actions/src/PodCancelDialog.tsx", [
  [
    "export const podCancelSchema = z\n  .object({\n    reason_subject: z.string().min(1, 'Select a reason'),\n    reason_note: z.string().trim().max(500, 'Keep the note under 500 characters'),\n  })\n  .superRefine((values, ctx) => {\n    if (values.reason_subject === 'Other' && !values.reason_note.trim()) {\n      ctx.addIssue({ code: 'custom', path: ['reason_note'], message: 'Please describe the reason' });\n    }\n  });",
    "/** Built from the surface's labels: a validation message is copy the host\n *  reads, so it follows their language like the rest of the dialog (rule 38). */\nexport const buildPodCancelSchema = (labels: HostPodActionLabels) =>\n  z\n    .object({\n      reason_subject: z.string().min(1, labels.reasonRequired),\n      reason_note: z.string().trim().max(500, labels.noteTooLong),\n    })\n    .superRefine((values, ctx) => {\n      if (values.reason_subject === 'Other' && !values.reason_note.trim()) {\n        ctx.addIssue({ code: 'custom', path: ['reason_note'], message: labels.noteRequired });\n      }\n    });",
  ],
  [
    "/** Summarises who is affected — direct cancel vs. refund-initiating cancel. */\nfunction ImpactSummary({ impact }: Readonly<{ impact: PodDeleteImpact }>) {\n  if (impact.other_attendee_count === 0) {\n    return (\n      <Alert severity=\"info\">\n        No one else has joined this pod — it will be cancelled immediately.\n      </Alert>\n    );\n  }\n  const attendeePlural = impact.other_attendee_count === 1 ? '' : 's';\n  const paymentPlural = impact.refundable_payment_count === 1 ? '' : 's';\n  return (\n    <Alert severity=\"warning\">\n      {impact.other_attendee_count} other attendee{attendeePlural} joined this pod.\n      {impact.refundable_payment_count > 0 ? (\n        <>\n          {' '}\n          Cancelling initiates a refund of{' '}\n          <b>\n            {impact.currency_symbol}\n            {impact.refund_total}\n          </b>{' '}\n          across {impact.refundable_payment_count} payment{paymentPlural} (logged in the Finance\n          portal). All attendees will be emailed.\n        </>\n      ) : (\n        <> All attendees will be emailed about the cancellation.</>\n      )}\n    </Alert>\n  );\n}",
    "/** Summarises who is affected — direct cancel vs. refund-initiating cancel. */\nfunction ImpactSummary({ impact }: Readonly<{ impact: PodDeleteImpact }>) {\n  const { labels } = useHostPodActionsConfig();\n  if (impact.other_attendee_count === 0) {\n    return <Alert severity=\"info\">{labels.cancelNoOthers}</Alert>;\n  }\n  // One sentence per row rather than fragments joined in JSX: a language that\n  // orders the clause differently cannot be built by concatenation.\n  const refundLine =\n    impact.refundable_payment_count > 0\n      ? labels.cancelRefund(\n          `${impact.currency_symbol}${impact.refund_total}`,\n          impact.refundable_payment_count,\n        )\n      : labels.cancelEmailOnly;\n  return (\n    <Alert severity=\"warning\">\n      {labels.cancelOthers(impact.other_attendee_count)} {refundLine}\n    </Alert>\n  );\n}",
  ],
  [
    "  } = useForm<PodCancelValues>({\n    resolver: zodResolver(podCancelSchema),",
    "  } = useForm<PodCancelValues>({\n    resolver: zodResolver(buildPodCancelSchema(labels)),",
  ],
  [
    "  const confirmLabel = hasRefunds ? 'Initiate refunds & cancel' : 'Cancel pod';",
    "  const confirmLabel = hasRefunds ? labels.initiateRefunds : labels.cancelPod;",
  ],
  [
    "      <DialogTitle sx={{ fontWeight: 700 }}>Cancel pod</DialogTitle>",
    "      <DialogTitle sx={{ fontWeight: 700 }}>{labels.cancelPod}</DialogTitle>",
  ],
  [
    "          <Typography variant=\"body2\">\n            You&apos;re cancelling <b>{podTitle}</b>. This can&apos;t be undone.\n          </Typography>",
    "          <Typography variant=\"body2\">{labels.cancelIntro(podTitle)}</Typography>",
  ],
  [
    "            label=\"Reason\"\n            required",
    "            label={labels.reason}\n            required",
  ],
  [
    "            label=\"Note\"\n            required={subject === 'Other'}",
    "            label={labels.note}\n            required={subject === 'Other'}",
  ],
  [
    "              errors.reason_note?.message ?? 'Shared with attendees in the cancellation email.'",
    "              errors.reason_note?.message ?? labels.noteHint",
  ],
  [
    "        <Button onClick={onClose} disabled={removeState.loading}>\n          Keep pod\n        </Button>",
    "        <Button onClick={onClose} disabled={removeState.loading}>\n          {labels.keepPod}\n        </Button>",
  ],
  [
    "          {removeState.loading ? 'Cancelling…' : confirmLabel}",
    "          {removeState.loading ? labels.cancelling : confirmLabel}",
  ],
]);
