import { useMutation } from '@apollo/client';
import { Stack, Switch, Tooltip, Typography } from '@mui/material';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { SET_LEGAL_DOCUMENT_ACTIVE } from '../../graphql/documents';

interface Props {
  documentId: string;
  isActive: boolean;
  /** Fires after a successful write so the list can show the new value. */
  onChanged?: () => void;
}

/**
 * Switch a document on or off, from wherever it is listed.
 *
 * A switch rather than a trip through the edit dialog, because taking a
 * document down is the thing somebody does in a hurry — and it is deliberately
 * NOT disabled on a signed document: the signature locks the WORDING, and
 * refusing to hide a signed document that turns out to be wrong would make the
 * lock the problem it was meant to prevent.
 */
export default function DocumentActiveSwitch({
  documentId,
  isActive,
  onChanged,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [setActive, { loading }] = useMutation(SET_LEGAL_DOCUMENT_ACTIVE);
  const label = isActive ? t('shell.common.active') : t('shell.common.inactive');

  const toggle = async (next: boolean) => {
    try {
      await setActive({ variables: { id: documentId, isActive: next } });
      notifySuccess(next ? t('legal.documents.activated') : t('legal.documents.deactivated'));
      onChanged?.();
    } catch (err) {
      notifyError(parseApiError(err));
    }
  };

  return (
    <Tooltip title={t('legal.documents.activeHint')}>
      <Stack direction="row" spacing={0.5} component="span" sx={{
        alignItems: "center"
      }}>
        <Switch
          size="small"
          checked={isActive}
          disabled={loading}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => toggle(event.target.checked)}
          slotProps={{
            input: { 'aria-label': t('legal.documents.colActive') }
          }}
        />
        <Typography variant="body2" component="span">
          {label}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
