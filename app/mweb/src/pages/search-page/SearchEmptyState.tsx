import type { JSX } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/LightbulbOutlined';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import ExploreIcon from '@mui/icons-material/ExploreOutlined';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { DuncitButton } from '@duncit/buttons';
import EmptyState from '../../components/EmptyState';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';

interface CtaBlockProps {
  icon: JSX.Element;
  title: string;
  cta: string;
  onClick: () => void;
}

/** A single call-to-action card: an accent icon on a soft disc, the title and
 * a green pill — the title and the CTA say it all. Hoisted (S6478). */
function CtaBlock({ icon, title, cta, onClick }: Readonly<CtaBlockProps>) {
  return (
    <Stack spacing={1.5} sx={{ ...SURFACE_SX, p: 2 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            flex: '0 0 auto',
            borderRadius: '50%',
            bgcolor: 'action.hover',
            color: 'secondary.main',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>{title}</Typography>
      </Stack>
      <DuncitButton variant="contained" onClick={onClick} sx={{ alignSelf: 'flex-start' }}>
        {cta}
      </DuncitButton>
    </Stack>
  );
}

interface Props {
  variant: 'no-results' | 'empty-category';
  /** Kept for the callers; the one-line empty state no longer echoes it. */
  keyword?: string;
  onShareIdea: () => void;
  onEarn: () => void;
  onExploreCategories: () => void;
}

export default function SearchEmptyState({
  variant,
  onShareIdea,
  onEarn,
  onExploreCategories,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const isCategory = variant === 'empty-category';
  const heading = isCategory ? 'Nothing Here Yet' : 'No Pods Match Your Search';

  return (
    <Stack spacing={1.5}>
      <EmptyState icon={<SearchOffIcon />} title={heading} />

      <CtaBlock
        icon={<LightbulbIcon />}
        title="Didn't Find What You Were Looking For?"
        cta="Share a Pod Idea"
        onClick={onShareIdea}
      />

      {isCategory ? (
        <CtaBlock
          icon={<ExploreIcon />}
          title={t('mweb.search.exploreOtherInterests')}
          cta="Explore More Categories"
          onClick={onExploreCategories}
        />
      ) : (
        <CtaBlock
          icon={<StorefrontIcon />}
          title={t('mweb.search.turnYourPassionIntoSomethingBigger')}
          cta="Earn With Duncit"
          onClick={onEarn}
        />
      )}
    </Stack>
  );
}
