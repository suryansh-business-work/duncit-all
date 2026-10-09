import { Box, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { primaryHeroBackground } from '../../components/primaryHero';

/** The branded header the brand desk's tool pages (Orders, Returns, Warehouses) open with. */
export default function BrandToolHero({ title, intro }: Readonly<{ title: string; intro: string }>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 2.5, borderRadius: 2, color: 'common.white', background: primaryHeroBackground }}>
      <Typography variant="overline" sx={{ fontWeight: 800 }}>
        {t('partners.common.partnerTools')}
      </Typography>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
        {intro}
      </Typography>
    </Box>
  );
}
