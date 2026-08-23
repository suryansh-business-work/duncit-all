import { apply } from "./e.mjs";

apply("packages/ai-prompts/src/mui/PromptDialog.tsx", [
  [
    "export function PromptDialog({ open, prompt, apiOrigin, onClose, onSaved }: Readonly<Props>) {\n  const [error, setError] = useState<string | null>(null);",
    "export function PromptDialog({ open, prompt, apiOrigin, onClose, onSaved }: Readonly<Props>) {\n  const copy = usePromptCopy();\n  const [error, setError] = useState<string | null>(null);",
  ],
]);

apply("packages/ai-prompts/src/mui/PromptForm.tsx", [
  [
    "  submitLabel = 'Save',\n  code = false,",
    "  submitLabel,\n  code = false,",
  ],
  [
    "}: Readonly<PromptFormProps>) {\n  const schema = useMemo(() => promptFormSchema(variables), [variables]);",
    "}: Readonly<PromptFormProps>) {\n  const copy = usePromptCopy();\n  const schema = useMemo(() => promptFormSchema(variables), [variables]);",
  ],
]);

apply("packages/ai-prompts/src/mui/PromptLibraryView.tsx", [
  [
    "const TABS = [\n  { value: 'CODE' as PromptKind, label: copy.kinds.CODE.label },\n  { value: 'AI' as PromptKind, label: copy.kinds.AI.label },\n];\n",
    "",
  ],
  [
    "export function PromptLibraryView({ apiOrigin }: Readonly<PromptLibraryViewProps>) {\n  const client = useApolloClient();\n  const refetchRef = useRef<(() => void) | null>(null);\n  const tabs = useTabParam({ items: TABS, fallback: 'CODE' as PromptKind });",
    "export function PromptLibraryView({ apiOrigin }: Readonly<PromptLibraryViewProps>) {\n  const copy = usePromptCopy();\n  const client = useApolloClient();\n  const refetchRef = useRef<(() => void) | null>(null);\n  // Rebuilt when the catalogue changes — a tab strip frozen at module load\n  // would keep the language the console first rendered in.\n  const tabStrip = useMemo(\n    () => [\n      { value: 'CODE' as PromptKind, label: copy.kinds.CODE.label },\n      { value: 'AI' as PromptKind, label: copy.kinds.AI.label },\n    ],\n    [copy],\n  );\n  const tabs = useTabParam({ items: tabStrip, fallback: 'CODE' as PromptKind });",
  ],
]);

apply("packages/ai-prompts/src/mui/PromptsTable.tsx", [
  [
    "const renderName = (p: AiPrompt) => (",
    "const renderName = (p: AiPrompt, copy: PromptCopy) => (",
  ],
  [
    "function ResetAction({\n  prompt,\n  onReset,\n}: Readonly<{ prompt: AiPrompt; onReset: (p: AiPrompt) => void }>) {\n  return (",
    "function ResetAction({\n  prompt,\n  onReset,\n}: Readonly<{ prompt: AiPrompt; onReset: (p: AiPrompt) => void }>) {\n  const copy = usePromptCopy();\n  return (",
  ],
  [
    "      <IconButton size=\"small\" aria-label={`Reset ${prompt.name}`} onClick={() => onReset(prompt)}>",
    "      <IconButton\n        size=\"small\"\n        aria-label={copy.resetAria.replace('{name}', prompt.name)}\n        onClick={() => onReset(prompt)}\n      >",
  ],
]);
