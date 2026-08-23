import { apply } from "./e.mjs";

// shell.common gains the generic confirm word
apply("packages/i18n/src/bundles/shell.ts", [
  [
    "      cancel: 'Cancel',\n      save: 'Save',",
    "      cancel: 'Cancel',\n      confirm: 'Confirm',\n      save: 'Save',",
  ],
]);

apply("packages/dialogs/src/ConfirmDialog.tsx", [
  [
    "import type { ReactNode } from 'react';",
    "import type { ReactNode } from 'react';\nimport { useTranslation } from './i18n';",
  ],
  [
    "  confirmLabel = 'Confirm',\n  cancelLabel = 'Cancel',\n  destructive,",
    "  confirmLabel,\n  cancelLabel,\n  destructive,",
  ],
  [
    "  const isBusy = Boolean(busy || loading);",
    "  const { t } = useTranslation();\n  const isBusy = Boolean(busy || loading);",
  ],
  [
    "  const showBusyLabel = isBusy && busyLabel != null;\n  const confirmContent = showBusyLabel ? busyLabel : confirmLabel;",
    "  const showBusyLabel = isBusy && busyLabel != null;\n  const confirmContent = showBusyLabel ? busyLabel : (confirmLabel ?? t('shell.common.confirm'));",
  ],
  [
    "        <Button onClick={close} disabled={isBusy}>\n          {cancelLabel}\n        </Button>",
    "        <Button onClick={close} disabled={isBusy}>\n          {cancelLabel ?? t('shell.common.cancel')}\n        </Button>",
  ],
  [
    "  confirmLabel?: string;\n  cancelLabel?: string;\n  /** Shorthand for confirmColor=\"error\". Ignored when `confirmColor` is set. */\n  destructive?: boolean;\n  /** Explicit confirm-button color; wins over `destructive`. */\n  confirmColor?: ConfirmColor;\n  /** Disables both actions and backdrop close; shows a spinner on the confirm button. */",
    "  /** Defaults to the shared `Confirm` copy in the reader's language. */\n  confirmLabel?: string;\n  /** Defaults to the shared `Cancel` copy in the reader's language. */\n  cancelLabel?: string;\n  /** Shorthand for confirmColor=\"error\". Ignored when `confirmColor` is set. */\n  destructive?: boolean;\n  /** Explicit confirm-button color; wins over `destructive`. */\n  confirmColor?: ConfirmColor;\n  /** Disables both actions and backdrop close; shows a spinner on the confirm button. */",
  ],
]);

apply("packages/dialogs/src/useConfirm.tsx", [
  [
    "        confirmLabel={options?.confirmLabel ?? 'Confirm'}\n        cancelLabel={options?.cancelLabel ?? 'Cancel'}",
    "        confirmLabel={options?.confirmLabel}\n        cancelLabel={options?.cancelLabel}",
  ],
]);
