import { Card, CardContent, Stack, Typography } from '@mui/material';

interface Counts {
  super_category_slug: string | null;
  super_category_name: string | null;
  count: number;
}

interface Props {
  title: string;
  counts: Counts[];
  total: number;
  color?: string;
}

export default function CountsBySuperCategoryGrid({ title, counts, total, color = '#FF4D4F' }: Props) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="overline" color="text.secondary">
            Total {total}
          </Typography>
        </Stack>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': { height: 6 },
          }}
        >
          {counts.length === 0 && (
            <Typography color="text.secondary">No super categories yet.</Typography>
          )}
          {counts.map((c) => (
            <Card
              key={c.super_category_slug || 'unknown'}
              variant="outlined"
              sx={{
                minWidth: 160,
                borderLeft: `4px solid ${color}`,
                flexShrink: 0,
              }}
            >
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {c.super_category_name || c.super_category_slug || 'Uncategorised'}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color }}>
                  {c.count}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
