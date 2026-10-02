import { Stack, Typography } from '@mui/material';

/** A labelled filter group. */
export default function FilterSection({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
        {title.toUpperCase()}
      </Typography>
      {children}
    </Stack>
  );
}
