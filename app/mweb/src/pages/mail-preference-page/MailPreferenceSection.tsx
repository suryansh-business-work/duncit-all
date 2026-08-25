import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import MailPreferenceRow from './MailPreferenceRow';
import type { MailPreferenceCategory } from './queries';

interface Props {
  heading: string;
  hint?: string;
  items: MailPreferenceCategory[];
  busyCategory: string | null;
  onChange: (category: string, enabled: boolean) => void;
  /** Rendered under the rows — the "unsubscribe from everything" action. */
  footer?: React.ReactNode;
}

/**
 * One group of categories in a card: the ones you can switch off, or the ones
 * that always arrive. Hoisted to module scope and given its rows as a prop, so
 * the page stays a layout and this stays a list.
 */
export default function MailPreferenceSection({
  heading,
  hint,
  items,
  busyCategory,
  onChange,
  footer,
}: Readonly<Props>) {
  if (items.length === 0) return null;

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack spacing={0.5} sx={{ mb: 1 }}>
          <Typography variant="subtitle1" sx={{
            fontWeight: 700
          }}>
            {heading}
          </Typography>
          {hint && (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {hint}
            </Typography>
          )}
        </Stack>

        <Stack divider={<Divider flexItem />}>
          {items.map((item) => (
            <MailPreferenceRow
              key={item.category}
              item={item}
              busy={busyCategory === item.category}
              onChange={onChange}
            />
          ))}
        </Stack>

        {footer}
      </CardContent>
    </Card>
  );
}
