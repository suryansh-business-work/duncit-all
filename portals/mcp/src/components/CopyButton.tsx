import { Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitIconButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { copyToClipboard } from '@duncit/utils';

interface CopyButtonProps {
  text: string;
  /** Names what is copied — the tooltip AND the accessible name, e.g. "Copy the gateway URL". */
  label: string;
  /** The toast once it landed; defaults to the generic "Copied". */
  doneMessage?: string;
  disabled?: boolean;
}

/** Copies one value, and says whether it landed — the clipboard can refuse. */
export default function CopyButton({ text, label, doneMessage, disabled }: Readonly<CopyButtonProps>) {
  const { t } = useTranslation();
  const copy = async () => {
    if (await copyToClipboard(text)) notifySuccess(doneMessage ?? t('mcp.common.copied'));
    else notifyError(t('mcp.common.copyFailed'));
  };
  return (
    <Tooltip title={label}>
      <span>
        <DuncitIconButton size="small" onClick={copy} disabled={disabled} aria-label={label}>
          <ContentCopyIcon fontSize="small" />
        </DuncitIconButton>
      </span>
    </Tooltip>
  );
}
