import { apply } from "./e.mjs";

// Reason wording is display copy; the VALUE stays the English the server stores.
const REASONS = [
  ["eventCancelled", "Event cancelled"],
  ["venueUnavailable", "Venue unavailable"],
  ["lowAttendance", "Low attendance"],
  ["rescheduling", "Rescheduling"],
  ["other", "Other"],
];
const rows = REASONS.map(([k, v]) => `        ${k}: '${v}',`).join("\n");
for (const b of ["shell", "mweb"]) {
  apply(`packages/i18n/src/bundles/${b}.ts`, [
    [
      "      reasonRequired: 'Select a reason',",
      `      reasonRequired: 'Select a reason',\n      // The reason dropdown. The VALUE stored on the pod stays the English\n      // the server's own list uses; only the wording shown is translated.\n      cancelReasons: {\n${rows}\n      },`,
    ],
  ]);
}

apply("packages/host-pod-actions/src/labels.ts", [
  ["  reasonRequired: string;", "  reasonRequired: string;\n  /** Display wording for one stored reason value. */\n  cancelReason: (value: string) => string;"],
  [
    "    reasonRequired: t('mweb.hostPodActions.reasonRequired'),",
    "    reasonRequired: t('mweb.hostPodActions.reasonRequired'),\n    cancelReason: (value) => t(MWEB_CANCEL_REASON_KEYS[value] ?? 'mweb.hostPodActions.cancelReasons.other'),",
  ],
  [
    "    reasonRequired: t('shell.hostPodActions.reasonRequired'),",
    "    reasonRequired: t('shell.hostPodActions.reasonRequired'),\n    cancelReason: (value) => t(SHELL_CANCEL_REASON_KEYS[value] ?? 'shell.hostPodActions.cancelReasons.other'),",
  ],
  [
    "/** `mweb.*` — mWeb and the native app (rule 27: one namespace for both). */",
    "/**\n * The stored reason value -> its catalogue key.\n *\n * Written out per namespace rather than composed, because the key-verification\n * gate greps source for the literal key and a computed one reads as shipped but\n * never rendered.\n */\nconst MWEB_CANCEL_REASON_KEYS: Record<string, string> = {\n  'Event cancelled': 'mweb.hostPodActions.cancelReasons.eventCancelled',\n  'Venue unavailable': 'mweb.hostPodActions.cancelReasons.venueUnavailable',\n  'Low attendance': 'mweb.hostPodActions.cancelReasons.lowAttendance',\n  Rescheduling: 'mweb.hostPodActions.cancelReasons.rescheduling',\n  Other: 'mweb.hostPodActions.cancelReasons.other',\n};\n\nconst SHELL_CANCEL_REASON_KEYS: Record<string, string> = {\n  'Event cancelled': 'shell.hostPodActions.cancelReasons.eventCancelled',\n  'Venue unavailable': 'shell.hostPodActions.cancelReasons.venueUnavailable',\n  'Low attendance': 'shell.hostPodActions.cancelReasons.lowAttendance',\n  Rescheduling: 'shell.hostPodActions.cancelReasons.rescheduling',\n  Other: 'shell.hostPodActions.cancelReasons.other',\n};\n\n/** `mweb.*` — mWeb and the native app (rule 27: one namespace for both). */",
  ],
]);

apply("packages/host-pod-actions/src/PodCancelDialog.tsx", [
  [
    "import { HOST_DELETE_POD, HOST_POD_DELETE_IMPACT } from './queries';",
    "import { useHostPodActionsConfig } from './HostPodActionsProvider';\nimport type { HostPodActionLabels } from './labels';\nimport { HOST_DELETE_POD, HOST_POD_DELETE_IMPACT } from './queries';",
  ],
  [
    "}: Readonly<Props>) {\n  const {\n    register,",
    "}: Readonly<Props>) {\n  const { labels } = useHostPodActionsConfig();\n  const {\n    register,",
  ],
  [
    "              <MenuItem key={item} value={item}>\n                {item}\n              </MenuItem>",
    "              <MenuItem key={item} value={item}>\n                {labels.cancelReason(item)}\n              </MenuItem>",
  ],
]);
