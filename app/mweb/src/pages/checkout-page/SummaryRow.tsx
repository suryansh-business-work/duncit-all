import { Stack, Typography } from '@mui/material';

interface Props {
  label: string;
  value: string;
  bold?: boolean;
  tone?: string;
  testId?: string;
}

/** One label / amount line of the checkout bill. */
export default function SummaryRow({ label, value, bold, tone, testId }: Readonly<Props>) {
  return (
    <Stack
      data-testid={testId}
      direction="row"
      spacing={2}
      sx={{
        justifyContent: "space-between",
        alignItems: "center"
      }}>
      <Typography
        variant={bold ? 'subtitle1' : 'body2'}
        sx={{
          fontWeight: bold ? 700 : 500,
          color: tone ?? (bold ? 'text.primary' : 'text.secondary')
        }}>{label}</Typography>
      <Typography
        variant={bold ? 'subtitle1' : 'body2'}
        sx={{
          fontWeight: bold ? 700 : 600,
          color: tone
        }}>{value}</Typography>
    </Stack>
  );
}
