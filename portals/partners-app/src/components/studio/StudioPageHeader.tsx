import { Stack, Typography } from '@mui/material';

interface Props {
  title: string;
  hint: string;
}

/** The heading of a studio option's page: its catalogue title and hint. */
export default function StudioPageHeader({ title, hint }: Readonly<Props>) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {hint}
      </Typography>
    </Stack>
  );
}
