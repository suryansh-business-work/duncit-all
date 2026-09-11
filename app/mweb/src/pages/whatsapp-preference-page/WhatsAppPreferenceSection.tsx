import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import WhatsAppPreferenceRow from './WhatsAppPreferenceRow';
import type { WhatsAppPreferenceCategory } from './queries';

interface Props {
  heading: string;
  hint?: string;
  items: WhatsAppPreferenceCategory[];
  busyCategory: string | null;
  unreachable: boolean;
  onChange: (category: string, enabled: boolean) => void;
  /** Rendered under the rows — the "turn everything off" action. */
  footer?: React.ReactNode;
}

/**
 * One group of categories in a card: the ones you can switch off, or the ones
 * that always arrive. Hoisted to module scope and given its rows as a prop, so
 * the page stays a layout and this stays a list.
 */
export default function WhatsAppPreferenceSection({
  heading,
  hint,
  items,
  busyCategory,
  unreachable,
  onChange,
  footer,
}: Readonly<Props>) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={0.5} sx={{ mb: 0.5 }}>
          <Typography component="h2" sx={{ fontSize: '1.05rem', fontWeight: 600 }}>
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
            <WhatsAppPreferenceRow
              key={item.category}
              item={item}
              busy={busyCategory === item.category}
              unreachable={unreachable}
              onChange={onChange}
            />
          ))}
        </Stack>

        {footer}
      </CardContent>
    </Card>
  );
}
