import { Card, CardContent, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useTranslation } from '@duncit/shell';
import { ChallengeMappingEditor } from '@duncit/challenges';
import type { CatItem } from './queries';

/**
 * Admin > Categories > Challenge Tools: the challenge settings of the deepest
 * selected category. The same editor and server rows as Challenge Portal >
 * Category Mapping, so the two screens can never disagree.
 */
export default function CategoryChallengeTools({ category }: Readonly<{ category: CatItem | null }>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" component="section" aria-labelledby="category-challenge-tools-title">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <EmojiEventsIcon color="primary" />
            <Typography id="category-challenge-tools-title" component="h2" variant="h6" sx={{ fontWeight: 700 }}>
              {category
                ? t('admin.categories.challengeTools.titleFor', { vars: { name: category.name } })
                : t('admin.categories.challengeTools.title')}
            </Typography>
          </Stack>
          {category ? (
            <ChallengeMappingEditor key={category.id} categoryId={category.id} />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('admin.categories.challengeTools.pick')}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
