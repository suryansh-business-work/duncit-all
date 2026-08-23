import { apply } from "./e.mjs";
apply("packages/host-pod-actions/src/index.ts", [
  ["  podCancelSchema,", "  buildPodCancelSchema,"],
]);

// ---- PodCompleteDialog
apply("packages/host-pod-actions/src/pod-complete/PodCompleteDialog.tsx", [
  [
    "export const buildPodCompleteSchema = (hasVenue: boolean) =>\n  z\n    .object({\n      venue_bill_amount: z.string().trim(),\n      media_text: z.string().refine(hasMediaLine, 'Add at least one party photo or video'),\n    })\n    .superRefine((values, ctx) => {\n      if (!hasVenue) return;\n      const amount = Number(values.venue_bill_amount);\n      if (!Number.isFinite(amount) || amount <= 0) {\n        ctx.addIssue({\n          code: z.ZodIssueCode.custom,\n          path: ['venue_bill_amount'],\n          message: 'Enter the venue bill amount',\n        });\n      }\n    });",
    "export const buildPodCompleteSchema = (hasVenue: boolean, labels: HostPodActionLabels) =>\n  z\n    .object({\n      venue_bill_amount: z.string().trim(),\n      media_text: z.string().refine(hasMediaLine, labels.partyMediaRequired),\n    })\n    .superRefine((values, ctx) => {\n      if (!hasVenue) return;\n      const amount = Number(values.venue_bill_amount);\n      if (!Number.isFinite(amount) || amount <= 0) {\n        ctx.addIssue({\n          code: z.ZodIssueCode.custom,\n          path: ['venue_bill_amount'],\n          message: labels.venueBillRequired,\n        });\n      }\n    });",
  ],
  [
    "  const { renderMediaField } = useHostPodActionsConfig();",
    "  const { labels, renderMediaField } = useHostPodActionsConfig();",
  ],
  [
    "    resolver: zodResolver(buildPodCompleteSchema(hasVenue)),",
    "    resolver: zodResolver(buildPodCompleteSchema(hasVenue, labels)),",
  ],
  [
    "      <DialogTitle sx={{ fontWeight: 700 }}>Complete pod</DialogTitle>",
    "      <DialogTitle sx={{ fontWeight: 700 }}>{labels.completePod}</DialogTitle>",
  ],
  [
    "          <Typography variant=\"body2\" color=\"text.secondary\">\n            Upload your party photos/videos (with the Duncit banner). Your payout is credited to\n            your wallet as soon as the pod is completed.\n          </Typography>",
    "          <Typography variant=\"body2\" color=\"text.secondary\">\n            {labels.completeHint}\n          </Typography>",
  ],
  [
    "              label=\"Venue Bill Amount\"",
    "              label={labels.venueBillAmount}",
  ],
  [
    "                label: 'Pod Media',",
    "                label: labels.podMedia,",
  ],
  [
    "        <Button onClick={onClose} disabled={completeState.loading}>\n          Cancel\n        </Button>",
    "        <Button onClick={onClose} disabled={completeState.loading}>\n          {labels.cancel}\n        </Button>",
  ],
  [
    "          {completeState.loading ? 'Completing…' : 'Complete pod'}",
    "          {completeState.loading ? labels.completing : labels.completePod}",
  ],
]);

// ---- pod-edit.form.ts schema factory
apply("packages/host-pod-actions/src/pod-edit.form.ts", [
  [
    "import { hasImageLine, mediaTextToInput, mediaToText } from './media-text';\nimport type { HostPodTarget } from './types';",
    "import { hasImageLine, mediaTextToInput, mediaToText } from './media-text';\nimport type { HostPodActionLabels } from './labels';\nimport type { HostPodTarget } from './types';",
  ],
  [
    "export const podEditSchema = z.object({\n  pod_title: z.string().trim().min(3, 'Title is too short').max(120, 'Title is too long'),\n  pod_description: z.string().trim().min(10, 'Add a longer description'),\n  media_text: z.string().refine(hasImageLine, 'Add at least one image URL'),\n});",
    "/** Built from the surface's labels: a validation message is copy the host\n *  reads, so it follows their language like the rest of the dialog (rule 38). */\nexport const buildPodEditSchema = (labels: HostPodActionLabels) =>\n  z.object({\n    pod_title: z.string().trim().min(3, labels.titleTooShort).max(120, labels.titleTooLong),\n    pod_description: z.string().trim().min(10, labels.descriptionTooShort),\n    media_text: z.string().refine(hasImageLine, labels.imageRequired),\n  });",
  ],
]);
