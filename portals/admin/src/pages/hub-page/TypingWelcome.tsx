import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, Typography } from '@mui/material';
import { ADMIN_ME, getAdminDisplayName, type AdminSessionUser } from '../../adminSession';

const VISUALLY_HIDDEN = {
  position: 'absolute',
  // Strings, not numbers: sx reads 1 as 100%.
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

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
    <Typography
      variant="h4" component="h1"
      gutterBottom
      sx={{
        fontWeight: 700,
        minHeight: 44
      }}>
      {/* A screen reader gets the whole greeting once; the typing effect is visual only. */}
      <Box component="span" sx={VISUALLY_HIDDEN}>{target}</Box>
      <span aria-hidden="true">{text}</span>
      <Typography component="span" color="primary" aria-hidden="true">|</Typography>
    </Typography>
  );
}