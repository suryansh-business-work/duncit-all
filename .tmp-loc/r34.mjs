import { apply } from "./e.mjs";
apply("packages/ui/src/ModerationBlockedDialog.tsx", [
  [
    "import ArrowForwardIcon from '@mui/icons-material/ArrowForward';",
    "import ArrowForwardIcon from '@mui/icons-material/ArrowForward';\nimport { useTranslation } from './i18n/useTranslation';",
  ],
]);
apply("packages/ui/src/PodParticipationTimeline.tsx", [
  [
    "} from '@duncit/utils';",
    "} from '@duncit/utils';\nimport { useTranslation } from './i18n/useTranslation';",
  ],
  [
    "function TimelineNode({ node, depth, formatDateTime, highlightBackoutNo }: Readonly<NodeProps>) {\n  const copy = timelineCopy(node);",
    "function TimelineNode({ node, depth, formatDateTime, highlightBackoutNo }: Readonly<NodeProps>) {\n  const { t } = useTranslation();\n  const copy = timelineCopy(node);",
  ],
]);
