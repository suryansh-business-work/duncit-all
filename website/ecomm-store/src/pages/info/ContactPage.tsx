import type { ReactNode } from 'react';
import { Box, Link, Stack, Typography } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { toDigits } from '@duncit/regex';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T, tintAt } from '../../theme/tokens';

interface ChannelProps {
  icon: ReactNode;
  title: string;
  value: string;
  href: string;
  position: number;
}

function Channel({ icon, title, value, href, position }: Readonly<ChannelProps>) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', bgcolor: tintAt(position), borderRadius: `${T.radius.card}px`, p: 2 }}>
      <Box sx={{ width: 48, height: 48, borderRadius: '16px', bgcolor: T.surface, display: 'grid', placeItems: 'center' }} aria-hidden>
        {icon}
      </Box>
      <Stack>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Link href={href} target={href.startsWith('https:') ? '_blank' : undefined} rel="noopener noreferrer" sx={{ fontWeight: 800 }}>
          {value}
        </Link>
      </Stack>
    </Stack>
  );
}

/** /contact — every way to reach support the operator has filled in. */
export function ContactPage() {
  const { t } = useStoreT();
  const s = useStoreSettings();
  usePageSeo(t('ecommStore.contact.title'));
  const whatsapp = toDigits(s.whatsapp_number);
  return (
    <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h1">{t('ecommStore.contact.title')}</Typography>
      <Typography color="text.secondary">{t('ecommStore.contact.body')}</Typography>
      {s.support_email ? (
        <Channel icon={<EmailOutlinedIcon />} title={t('ecommStore.contact.email')} value={s.support_email} href={`mailto:${s.support_email}`} position={0} />
      ) : null}
      {s.support_phone ? (
        <Channel icon={<PhoneOutlinedIcon />} title={t('ecommStore.contact.phone')} value={s.support_phone} href={`tel:${s.support_phone}`} position={1} />
      ) : null}
      {whatsapp ? (
        <Channel icon={<WhatsAppIcon />} title={t('ecommStore.contact.whatsapp')} value={s.whatsapp_number} href={`https://wa.me/${whatsapp}`} position={2} />
      ) : null}
    </Stack>
  );
}
