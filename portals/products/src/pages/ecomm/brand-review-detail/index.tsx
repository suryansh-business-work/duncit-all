import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useParams } from 'react-router';
import { Alert, Card, CardContent, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { notifyError } from '@duncit/dialogs';
import { BackButton, SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import BrandPickupPanel from '../BrandPickupPanel';
import BrandProductsTable from '../BrandProductsTable';
import ReviewBrandDialog from '../ReviewBrandDialog';
import { ECOMM_BRAND, type EcommBrandRow } from '../queries';
import BrandConsentPanel from './BrandConsentPanel';
import BrandHeaderCard from './BrandHeaderCard';
import BrandIntegrationsPanel from './BrandIntegrationsPanel';
import BrandStatusPanel from './BrandStatusPanel';
import BrandSubmissionSection from './BrandSubmissionSection';

/** The verification page: every section a reviewer checks before Approve. */
export default function BrandReviewDetailPage() {
  const { t } = useTranslation();
  const { brandId = '' } = useParams<{ brandId: string }>();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // `ecommBrand` resolves a brand at ANY status; the marketplace queries are
  // approved-only, so a row opened from the review inbox showed "not found".
  const brandQuery = useQuery<any>(ECOMM_BRAND, {
    variables: { brand_doc_id: brandId },
    fetchPolicy: 'cache-and-network',
  });
  const brand: EcommBrandRow | null = brandQuery.data?.ecommBrand ?? null;

  const reload = async () => {
    try {
      await brandQuery.refetch();
    } catch (e) {
      notifyError(parseApiError(e));
    }
  };

  const handleReviewed = async (text: string) => {
    setReviewOpen(false);
    setMessage(text);
    await reload();
  };

  if (brandQuery.loading && !brandQuery.data) {
    return (
      <Stack sx={{ alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  const back = <BackButton to="/ecomm/brands">{t('products.brandReview.backToInbox')}</BackButton>;

  if (!brand) {
    return (
      <Stack spacing={3}>
        {back}
        <Alert severity="warning">{t('products.brands.notFound')}</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {back}
      {message && (
        <Alert severity="success" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      <BrandHeaderCard brand={brand} onReview={() => setReviewOpen(true)} />

      <SectionCard title={t('products.brandReview.sectionSubmission')}>
        <BrandSubmissionSection brand={brand} />
      </SectionCard>

      <SectionCard
        title={t('products.brandReview.sectionIntegrations')}
        subtitle={t('products.brandReview.integrationsIntro')}
      >
        <BrandIntegrationsPanel brandId={brand.id} integrations={brand.integrations} />
      </SectionCard>

      <SectionCard title={t('products.brandReview.sectionConsent')}>
        <BrandConsentPanel consent={brand.consent} />
      </SectionCard>

      <SectionCard title={t('products.brandReview.sectionProducts')}>
        <BrandProductsTable brandId={brand.id} />
      </SectionCard>

      {/* The pickup panel carries its own heading, so it keeps a plain card. */}
      <Card variant="outlined">
        <CardContent>
          <BrandPickupPanel brandId={brand.id} />
          <Divider sx={{ mt: 2 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
            {t('products.brandReview.pickupHint')}
          </Typography>
        </CardContent>
      </Card>

      <SectionCard title={t('products.brandReview.sectionStatus')}>
        <BrandStatusPanel brand={brand} onChanged={reload} />
      </SectionCard>

      <ReviewBrandDialog
        brand={reviewOpen ? brand : null}
        onClose={() => setReviewOpen(false)}
        onDone={handleReviewed}
      />
    </Stack>
  );
}
