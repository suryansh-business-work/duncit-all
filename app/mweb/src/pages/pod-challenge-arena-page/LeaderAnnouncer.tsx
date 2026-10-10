import { useEffect, useRef, useState } from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * "Asha now leads" — shown in the arena when the lead changes, and announced
 * politely to screen readers, only on a change so a busy scoreboard does not
 * talk over everything else.
 */
export default function LeaderAnnouncer({ leaders, large }: Readonly<{ leaders: string[]; large?: boolean }>) {
  const { t } = useTranslation();
  const key = leaders.join(', ');
  const previous = useRef(key);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (key && key !== previous.current) setMessage(t('mweb.challenge.nowLeading', { vars: { names: key } }));
    previous.current = key;
  }, [key, t]);

  return (
    <Typography role="status" aria-live="polite" variant={large ? 'h5' : 'body2'} sx={{ color: 'primary.main', fontWeight: 700, minHeight: '1.5em' }}>
      {message}
    </Typography>
  );
}
