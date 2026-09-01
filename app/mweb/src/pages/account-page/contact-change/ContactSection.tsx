import { useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import {
  buildContactChangeLabels,
  contactDetailsComplete,
  type ContactChannel,
  type ContactSnapshot,
} from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import ContactRows from './ContactRows';
import ChangeContactDialog from './ChangeContactDialog';

interface Props {
  /** What the account holds now. Updated by `onChanged` after a proved change. */
  snapshot: ContactSnapshot;
  /** Fired once a change is stored, so the caller can refresh what it renders. */
  onChanged: (channel: ContactChannel, snapshot: ContactSnapshot) => void;
}

/**
 * The contact block inside Edit profile: three rows, and the dialog they open.
 *
 * The rows and the dialog are separate components so the rows can be rendered
 * anywhere the account's contact details are listed without dragging a Dialog
 * along; this is the piece that puts them together.
 */
export default function ContactSection({ snapshot, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useMemo(() => buildContactChangeLabels(t), [t]);
  const [channel, setChannel] = useState<ContactChannel | null>(null);

  return (
    <Stack spacing={1}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {t('mweb.account.contactDetails')}
      </Typography>
      <ContactRows labels={labels} snapshot={snapshot} onChange={setChannel} />
      {!contactDetailsComplete(snapshot) && (
        <Typography variant="caption" sx={{ color: 'error.main' }} data-testid="contact-required">
          {labels.allRequired}
        </Typography>
      )}
      <ChangeContactDialog
        channel={channel}
        snapshot={snapshot}
        onClose={() => setChannel(null)}
        onSaved={(saved, draft) => {
          // The proved value is folded in locally as well as refetched: the
          // dialog closes onto these rows, and a row still showing the old
          // number while the query is in flight reads as a failed change.
          const next: ContactSnapshot = { ...snapshot };
          if (saved === 'EMAIL') next.email = draft.email.trim().toLowerCase();
          if (saved === 'PHONE') {
            next.phone_extension = draft.extension;
            next.phone_number = draft.number;
          }
          if (saved === 'WHATSAPP') {
            next.whatsapp_extension = draft.extension;
            next.whatsapp_number = draft.number;
          }
          onChanged(saved, next);
        }}
      />
    </Stack>
  );
}
