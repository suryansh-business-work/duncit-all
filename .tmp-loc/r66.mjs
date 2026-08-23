import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/shell.ts", [
  ["      pasteTicketCode: 'Or paste the ticket code',", "      pasteTicketCode: 'Or paste the ticket code',\n      scanFrameHint: 'Hold the attendee’s ticket QR inside the frame.',\n      checkCode: 'Check',"],
]);
apply("packages/i18n/src/bundles/mweb.ts", [
  ["      pasteTicketCode: 'Or paste the ticket code',", "      pasteTicketCode: 'Or paste the ticket code',\n      scanFrameHint: 'Hold the attendee’s ticket QR inside the frame.',\n      checkCode: 'Check',"],
]);

apply("packages/host-pod-actions/src/ticket-scan/ScannerViewport.tsx", [
  [
    "import { useQrScanner } from './useQrScanner';",
    "import { useHostPodActionsConfig } from '../HostPodActionsProvider';\nimport { useQrScanner } from './useQrScanner';",
  ],
  [
    "export default function ScannerViewport({ active, onCode, onManualCode }: Readonly<Props>) {\n  const { videoRef, canvasRef, error } = useQrScanner(active, onCode);",
    "export default function ScannerViewport({ active, onCode, onManualCode }: Readonly<Props>) {\n  const { labels } = useHostPodActionsConfig();\n  const { videoRef, canvasRef, error } = useQrScanner(active, onCode);",
  ],
  [
    "        <Typography variant=\"caption\" color=\"text.secondary\" textAlign=\"center\">\n          Hold the attendee&apos;s ticket QR inside the frame.\n        </Typography>",
    "        <Typography variant=\"caption\" color=\"text.secondary\" textAlign=\"center\">\n          {labels.scanFrameHint}\n        </Typography>",
  ],
  [
    "        >\n          Check\n        </Button>",
    "        >\n          {labels.checkCode}\n        </Button>",
  ],
]);
