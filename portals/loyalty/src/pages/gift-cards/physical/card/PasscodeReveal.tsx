import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { MaskedPasscode } from '../labels';
import { PHYSICAL_CARD_PASSCODE } from '../queries';

interface Props {
  cardId: string;
  last4: string;
  /** Called after a reveal, so the history on the page shows the read it just caused. */
  onRevealed: () => void;
}

/**
 * The card's passcode, masked until someone asks for it. Each reveal is a fresh
 * server read that the server writes into the card's history with who asked —
 * the passcode IS the card's value. Hiding it again drops it from the page.
 */
export default function PasscodeReveal({ cardId, last4, onRevealed }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [passcode, setPasscode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reveal = async () => {
    setBusy(true);
    try {
      const { data } = await client.query<{ physicalGiftCardPasscode: string }>({
        query: PHYSICAL_CARD_PASSCODE,
        variables: { id: cardId },
        fetchPolicy: 'network-only',
      });
      setPasscode(data?.physicalGiftCardPasscode ?? null);
      onRevealed();
    } catch {
      notifyError(t('loyalty.physical.revealError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        {passcode ? (
          <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 700 }} data-testid="physical-passcode">
            {passcode}
          </Typography>
        ) : (
          <MaskedPasscode last4={last4} t={t} />
        )}
        {passcode ? (
          <DuncitButton size="small" startIcon={<VisibilityOffIcon />} onClick={() => setPasscode(null)}>
            {t('loyalty.physical.hidePasscode')}
          </DuncitButton>
        ) : (
          <DuncitButton size="small" startIcon={<VisibilityIcon />} loading={busy} onClick={reveal}>
            {t('loyalty.physical.revealPasscode')}
          </DuncitButton>
        )}
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('loyalty.physical.revealHint')}
      </Typography>
    </Stack>
  );
}
