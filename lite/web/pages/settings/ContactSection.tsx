import { useState } from 'react';
import { Card, Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { LiteMe } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { useLiteSettings } from '../../app/providers/LiteSettingsProvider';
import type { LiteContactKind } from '../../graphql/profile';
import { ContactForm } from './contact-form';

function ContactRow({ label, value, primary, onChange, testId }: Readonly<{ label: string; value: string; primary: boolean; onChange: () => void; testId: string }>) {
  const { t } = useWebT();
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 2, '&:not(:last-child)': { borderBottom: 1, borderColor: 'divider' } }} data-testid={testId}>
      <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700, wordBreak: 'break-all' }}>{value || t('liteWeb.settings.notAdded')}</Typography>
          {primary && value ? <Chip size="small" label={t('liteWeb.settings.primary')} /> : null}
        </Stack>
      </Stack>
      <DuncitButton size="small" variant="outlined" onClick={onChange} aria-label={`${value ? t('liteWeb.settings.change') : t('liteWeb.settings.add')} ${label}`} data-testid={`${testId}-change`}>
        {value ? t('liteWeb.settings.change') : t('liteWeb.settings.add')}
      </DuncitButton>
    </Stack>
  );
}

/** The email and phone on the account; either can be added or changed with a code sent to it. */
export function ContactSection({ me }: Readonly<{ me: LiteMe }>) {
  const { t } = useWebT();
  const { phone_sign_in: phoneReady } = useLiteSettings();
  const [editing, setEditing] = useState<LiteContactKind | null>(null);
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {t('liteWeb.settings.contactsHint')}
      </Typography>
      <Card>
        <ContactRow label={t('lite.auth.email')} value={me.email} primary onChange={() => setEditing('EMAIL')} testId="contact-email" />
        {phoneReady || me.phone ? <ContactRow label={t('liteWeb.settings.phone')} value={me.phone ?? ''} primary={false} onChange={() => setEditing('PHONE')} testId="contact-phone" /> : null}
      </Card>
      {me.duncit_linked ? (
        <Typography variant="body2" color="text.secondary">
          {t('liteWeb.profile.duncitLinked')}
        </Typography>
      ) : null}
      {editing ? <ContactForm kind={editing} open onClose={() => setEditing(null)} /> : null}
    </Stack>
  );
}
