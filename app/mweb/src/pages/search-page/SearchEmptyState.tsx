import type { JSX } from 'react';
import { Box, Button, Card, Stack, Typography } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/LightbulbOutlined';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ExploreIcon from '@mui/icons-material/ExploreOutlined';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { useTranslation } from '../../i18n/useTranslation';

interface CtaBlockProps {
  icon: JSX.Element;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}

/** A single call-to-action card — hoisted to module scope (S6478). */
function CtaBlock({ icon, title, description, cta, onClick }: Readonly<CtaBlockProps>) {
  return (
    <Card variant="outlined" sx={{ p: 2.5, borderRadius: '16px' }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          {icon}
          <Typography variant="subtitle1" sx={{
            fontWeight: 700
          }}>
            {title}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {description}
        </Typography>
        <Button variant="contained" onClick={onClick} sx={{ alignSelf: 'flex-start', fontWeight: 700, borderRadius: 999 }}>
          {cta}
        </Button>
      </Stack>
    </Card>
  );
}

interface Props {
  variant: 'no-results' | 'empty-category';
  keyword: string;
  onShareIdea: () => void;
  onEarn: () => void;
  onExploreCategories: () => void;
}

export default function SearchEmptyState({
  variant,
  keyword,
  onShareIdea,
  onEarn,
  onExploreCategories,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const isCategory = variant === 'empty-category';
  const heading = isCategory ? 'Nothing Here Yet' : 'No Pods Match Your Search';
  const description = isCategory
    ? 'Looks like this category is just getting started. Explore other interests or share your own Pod idea to help grow the community.'
    : `We couldn't find any Pods, Clubs or experiences matching “${keyword}”. But don't let your curiosity stop here — you can inspire the next experience with Duncit.`;

  return (
    <Stack spacing={2.5} sx={{ pt: 1 }}>
      <Box sx={{ textAlign: 'center' }}>
        <SearchOffIcon color="disabled" sx={{ fontSize: 52 }} />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            mt: 1
          }}>
          {heading}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mt: 0.5,
            maxWidth: 520,
            mx: 'auto'
          }}>
          {description}
        </Typography>
      </Box>

      <CtaBlock
        icon={<LightbulbIcon color="primary" />}
        title="Didn't Find What You Were Looking For?"
        description="Great communities are built around great ideas. Share the Pod you'd love to attend, and we'll explore bringing it to life with our growing community."
        cta="Share a Pod Idea"
        onClick={onShareIdea}
      />

      {isCategory ? (
        <CtaBlock
          icon={<ExploreIcon color="primary" />}
          title={t('mweb.search.exploreOtherInterests')}
          description={t('mweb.search.browseTheFullSetOfCategories')}
          cta="Explore More Categories"
          onClick={onExploreCategories}
        />
      ) : (
        <CtaBlock
          icon={<StorefrontIcon color="primary" />}
          title={t('mweb.search.turnYourPassionIntoSomethingBigger')}
          description="If the experience you're searching for doesn't exist yet, why not create it? Host experiences, register your venue or list your products and start earning with Duncit."
          cta="Earn With Duncit"
          onClick={onEarn}
        />
      )}
    </Stack>
  );
}
