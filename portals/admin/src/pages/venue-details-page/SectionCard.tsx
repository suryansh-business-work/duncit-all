import type { ReactNode } from 'react';
import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';

/** The titled card every section of the venue record is drawn in — icon, title,
 * rule, body. Local to this page so the six sections cannot drift apart. */
export default function SectionCard({
  icon,
  title,
  children,
}: Readonly<{ icon: ReactNode; title: string; children: ReactNode }>) {
  return (
    <Card>
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
