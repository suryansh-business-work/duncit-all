import { Link, Stack, Typography } from '@mui/material';

export default function Footer({ appName }: Readonly<{ appName: string }>) {
  const year = new Date().getFullYear();
  return (
    <Stack
      component="footer"
      direction="row"
      justifyContent="space-between"
      flexWrap="wrap"
      gap={1}
      pt={2.5}
      mt={2}
      sx={{ borderTop: 1, borderColor: 'divider' }}
    >
      <Typography variant="body2" color="text.secondary">
        © {year} {appName} · Refreshes automatically every 60s.
      </Typography>
      <Stack direction="row" spacing={2}>
        <Link href="https://duncit.com/" target="_blank" rel="noopener" variant="body2">
          duncit.com
        </Link>
        <Link
          href="https://server.duncit.com/health"
          target="_blank"
          rel="noopener"
          variant="body2"
        >
          API health
        </Link>
      </Stack>
    </Stack>
  );
}
