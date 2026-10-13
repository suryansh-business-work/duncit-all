import type { ReactNode } from 'react';
import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';

/** The titled card every section of the venue record is drawn in — icon, title,
 * rule, body. Local to this page so the six sections cannot drift apart.
 *
 * `id` makes the card an anchor the editor's section strip can scroll to; the
 * scroll margin is what keeps its title clear of the console's sticky header. */
export default function SectionCard({
  id,
  icon,
  title,
  children,
}: Readonly<{ id?: string; icon: ReactNode; title: string; children: ReactNode }>) {
  return (
    <Card id={id} sx={{ scrollMarginTop: (theme) => theme.spacing(10) }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          {icon}
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            {title}
          </Typography>
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        {children}
      </CardContent>
    </Card>
  );
}
