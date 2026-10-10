import { Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useTranslation } from '@duncit/shell';
import { ChallengeMappingEditor } from '@duncit/challenges';

/**
 * Admin > Categories > edit a SUB-category > Challenge Tools: which scoring
 * tools pods in this sub-category may run. Shown only here — tools are chosen
 * per sub-category, with nothing inherited from the category above — and
 * behind its own switch. It saves on its own button, over the same server rows
 * as Challenge Portal > Tool Master and Category Mapping, so the screens can
 * never disagree.
 */
export default function CategoryChallengeTools({ categoryId }: Readonly<{ categoryId?: string | null }>) {
  const { t } = useTranslation();
  return (
    <Stack
      spacing={1.5}
      component="section"
      aria-labelledby="category-challenge-tools-title"
      sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <EmojiEventsIcon color="primary" />
        <Typography id="category-challenge-tools-title" component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('admin.categories.challengeTools.title')}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {/* A sub-category being created has no id to hang the settings on yet. */}
        {t(categoryId ? 'admin.categories.challengeTools.hint' : 'admin.categories.challengeTools.saveFirst')}
      </Typography>
      {categoryId && <ChallengeMappingEditor key={categoryId} categoryId={categoryId} />}
    </Stack>
  );
}
