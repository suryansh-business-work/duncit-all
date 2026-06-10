import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import InterestsIcon from '@mui/icons-material/Interests';

const levelLabel: Record<string, string> = {
  SUPER: 'Super',
  CATEGORY: 'Category',
  SUB: 'Subcategory',
};

export default function UserInterestsSection({ user }: Readonly<{ user: any }>) {
  const interests = user.interest_categories ?? [];
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <InterestsIcon color="primary" />
          <Typography variant="subtitle1">Signup Survey Interests</Typography>
        </Stack>
        {interests.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No survey interests saved yet.
          </Typography>
        ) : (
          <Stack direction="row" sx={{ gap: 1 }} flexWrap="wrap">
            {interests.map((category: any) => (
              <Chip
                key={category.id}
                label={`${category.name} · ${levelLabel[category.level] ?? category.level}`}
                size="small"
                variant="outlined"
                color={category.level === 'SUPER' ? 'primary' : 'default'}
              />
            ))}
          </Stack>
        )}
        {(user.interest_category_ids ?? []).length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            Stored by category ID for dynamic category updates.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
