import { apply } from "./e.mjs";

// FeedUrlBar — its local `copy` is the clipboard action; rename it so the
// library's copy object can keep the name every other file uses.
apply("packages/ai-prompts/src/mui/FeedUrlBar.tsx", [
  [
    "export function FeedUrlBar({ url, label }: Readonly<Props>) {\n  const [copied, setCopied] = useState(false);\n\n  const copy = () => {",
    "export function FeedUrlBar({ url, label }: Readonly<Props>) {\n  const copy = usePromptCopy();\n  const [copied, setCopied] = useState(false);\n\n  const copyUrl = () => {",
  ],
  ["onClick={copy}>", "onClick={copyUrl}>"],
  [
    "        <Tooltip title=\"Open in a new tab\">",
    "        <Tooltip title={copy.apiOpenInNewTab}>",
  ],
  [
    '            aria-label="Open feed in a new tab"',
    "            aria-label={copy.apiOpenFeed}",
  ],
]);

// PromptContext — four components read the library's copy.
apply("packages/ai-prompts/src/mui/PromptContext.tsx", [
  [
    "export function PromptVariables({ kind, variables }: Readonly<VariablesProps>) {\n  return (",
    "export function PromptVariables({ kind, variables }: Readonly<VariablesProps>) {\n  const copy = usePromptCopy();\n  return (",
  ],
  [
    "export function PromptUsage({ usage }: Readonly<{ usage: AiPrompt['usage'] }>) {\n  return (",
    "export function PromptUsage({ usage }: Readonly<{ usage: AiPrompt['usage'] }>) {\n  const copy = usePromptCopy();\n  return (",
  ],
  [
    "export function PromptPreview({ content, variables }: Readonly<PreviewProps>) {\n  return (",
    "export function PromptPreview({ content, variables }: Readonly<PreviewProps>) {\n  const copy = usePromptCopy();\n  return (",
  ],
  [
    "}: Readonly<{ prompt: AiPrompt; content: string }>) {\n  return (",
    "}: Readonly<{ prompt: AiPrompt; content: string }>) {\n  const copy = usePromptCopy();\n  return (",
  ],
]);
