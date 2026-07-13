import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Typography } from '@mui/material';
import { ADMIN_ME, getAdminDisplayName, type AdminSessionUser } from '../../adminSession';

export default function TypingWelcome() {
  const { data } = useQuery<{ me: AdminSessionUser | null }>(ADMIN_ME);
  const target = `Welcome ${getAdminDisplayName(data?.me)}`;
  const [text, setText] = useState('');

  useEffect(() => {
    let index = 0;
    setText('');
    const timer = globalThis.setInterval(() => {
      index += 1;
      setText(target.slice(0, index));
      if (index >= target.length) globalThis.clearInterval(timer);
    }, 65);
    return () => globalThis.clearInterval(timer);
  }, [target]);

  return (
    <Typography variant="h4" fontWeight={700} gutterBottom sx={{ minHeight: 44 }}>
      {text}
      <Typography component="span" color="primary" aria-hidden="true">|</Typography>
    </Typography>
  );
}