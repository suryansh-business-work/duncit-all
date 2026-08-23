import { apply } from "./e.mjs";
const add = [
  ["  pasteTicketCode: string;", "  pasteTicketCode: string;\n  scanFrameHint: string;\n  checkCode: string;"],
];
apply("packages/host-pod-actions/src/labels.ts", [
  ...add,
  ["    pasteTicketCode: t('mweb.hostPodActions.pasteTicketCode'),", "    pasteTicketCode: t('mweb.hostPodActions.pasteTicketCode'),\n    scanFrameHint: t('mweb.hostPodActions.scanFrameHint'),\n    checkCode: t('mweb.hostPodActions.checkCode'),"],
  ["    pasteTicketCode: t('shell.hostPodActions.pasteTicketCode'),", "    pasteTicketCode: t('shell.hostPodActions.pasteTicketCode'),\n    scanFrameHint: t('shell.hostPodActions.scanFrameHint'),\n    checkCode: t('shell.hostPodActions.checkCode'),"],
]);
