import { readFileSync, writeFileSync } from "node:fs";

/** The new label fields, as (name, type, expr-builder) triples. */
const SIMPLE = [
  "menuTooltip", "scanTickets", "completePod", "editPod", "cancelPod", "close", "cancel",
  "saving", "saveChanges", "fieldTitle", "fieldDescription", "fieldMedia", "titleTooShort",
  "titleTooLong", "descriptionTooShort", "imageRequired", "resubmitTitle", "resubmitHint",
  "resubmitting", "resubmitCta", "venue", "venueHint", "completeHint", "venueBillAmount",
  "venueBillRequired", "podMedia", "completing", "partyMediaRequired", "cancelNoOthers",
  "cancelEmailOnly", "reason", "reasonRequired", "note", "noteHint", "noteTooLong",
  "noteRequired", "keepPod", "cancelling", "initiateRefunds", "pasteTicketCode",
];

const iface = [
  "  /** The pod-row menu and the dialogs it opens. */",
  ...SIMPLE.map((k) => `  ${k}: string;`),
  "  /** aria-label naming the pod the menu belongs to. */",
  "  menuAria: (title: string) => string;",
  "  cancelIntro: (title: string) => string;",
  "  cancelOthers: (count: number) => string;",
  "  cancelRefund: (amount: string, count: number) => string;",
].join("\n");

const impl = (ns) =>
  [
    ...SIMPLE.map((k) => `    ${k}: t('${ns}.hostPodActions.${k}'),`),
    `    menuAria: (title) => t('${ns}.hostPodActions.menuAria', { vars: { title } }),`,
    `    cancelIntro: (title) => t('${ns}.hostPodActions.cancelIntro', { vars: { title } }),`,
    `    cancelOthers: (count) => t('${ns}.hostPodActions.cancelOthers', { count }),`,
    `    cancelRefund: (amount, count) =>`,
    `      t('${ns}.hostPodActions.cancelRefund', { count, vars: { amount, count } }),`,
  ].join("\n");

const p = "packages/host-pod-actions/src/labels.ts";
let s = readFileSync(p, "utf8").split("\r\n").join("\n");
s = s.replace(
  "  /** Heads the list of guideline rules an edit broke. */\n  contentCheck: string;\n}",
  "  /** Heads the list of guideline rules an edit broke. */\n  contentCheck: string;\n" + iface + "\n}",
);
s = s.replace(
  "    contentCheck: t('mweb.hostPodEdit.contentCheck'),\n  };",
  "    contentCheck: t('mweb.hostPodEdit.contentCheck'),\n" + impl("mweb") + "\n  };",
);
s = s.replace(
  "    contentCheck: t('shell.hostPodEdit.contentCheck'),\n  };",
  "    contentCheck: t('shell.hostPodEdit.contentCheck'),\n" + impl("shell") + "\n  };",
);
writeFileSync(p, s, "utf8");
console.log("ok labels.ts");
