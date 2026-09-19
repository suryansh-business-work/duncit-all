import { InputAdornment, TextField } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitIconButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useWebT } from '../../shared/i18n';
import { copyText } from '../lib/clipboard';

interface CopyFieldProps {
  label: string;
  value: string;
  testId?: string;
}

/** A read-only value with a copy button beside it: a link, a UPI ID, a code. */
export function CopyField({ label, value, testId = 'copy-field' }: Readonly<CopyFieldProps>) {
  const { t } = useWebT();
  const copy = async () => {
    if (await copyText(value)) notifySuccess(t('lite.common.copied'));
    else notifyError(t('liteWeb.common.copyFailed'));
  };
  return (
    <TextField
      label={label}
      value={value}
      fullWidth
      size="small"
      slotProps={{
        input: {
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <DuncitIconButton aria-label={t('liteWeb.common.copyValue', { vars: { label } })} onClick={copy} edge="end" data-testid={`${testId}-copy`}>
                <ContentCopyIcon fontSize="small" />
              </DuncitIconButton>
            </InputAdornment>
          ),
        },
        htmlInput: { 'data-testid': testId },
      }}
    />
  );
}
