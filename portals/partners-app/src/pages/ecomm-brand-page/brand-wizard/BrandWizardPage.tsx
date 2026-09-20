import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { notifyError } from '@duncit/dialogs';
import { BackHeader } from '@duncit/ui';
import { BRAND_WIZARD_STEPS, parseApiError, type BrandWizardStepKey } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import MediaPickerDialog from '../../../components/MediaPickerDialog';
import { MY_ACCOUNT, MY_BRAND, type EcommBrand } from '../queries';
import { useBrandWizard } from './useBrandWizard';
import { useBrandWizardActions } from './useBrandWizardActions';
import { STEP_FIELDS } from './wizard-steps';
import BrandWizardAlerts from './BrandWizardAlerts';
import BrandWizardStepper from './BrandWizardStepper';
import BrandStepBody from './BrandStepBody';
import BrandStepActions from './BrandStepActions';
import BrandDangerZone from './BrandDangerZone';

const BRANDS_PATH = '/ecomm-brand';
const LAST_STEP = BRAND_WIZARD_STEPS.length - 1;
const stepIndex = (key: BrandWizardStepKey) => BRAND_WIZARD_STEPS.findIndex((step) => step.key === key);

interface Props {
  /** null for `/ecomm-brand/new` — the first save mints the id and moves to the edit route. */
  brandId: string | null;
}

/** The brand onboarding wizard: ten steps on one page, a draft saved at any of them. */
export default function BrandWizardPage({ brandId }: Readonly<Props>) {
  const { t } = useTranslation();
  const account = useQuery<any>(MY_ACCOUNT, { fetchPolicy: 'cache-first' });
  const { data, loading, refetch } = useQuery<any>(MY_BRAND, {
    variables: { brand_doc_id: brandId },
    skip: !brandId,
    fetchPolicy: 'cache-and-network',
  });
  const brand: EcommBrand | null = data?.myEcommBrand ?? null;
  const reload = () => {
    refetch().catch((error) => notifyError(parseApiError(error)));
  };
  const wizard = useBrandWizard(brand, account.data?.me?.email ?? '');
  const actions = useBrandWizardActions({ brandId, form: wizard.form, onChanged: reload });
  const [activeStep, setActiveStep] = useState(0);
  const openedRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerResolve = useRef<((url: string | null) => void) | null>(null);

  // A saved draft opens on its first unfinished step, once, when it arrives.
  useEffect(() => {
    if (brand && !openedRef.current) {
      openedRef.current = true;
      setActiveStep(brand.completion?.next_step ?? 0);
    }
  }, [brand]);

  const pickImage = () =>
    new Promise<string | null>((resolve) => {
      pickerResolve.current = resolve;
      setPickerOpen(true);
    });
  const settlePicker = (url: string | null) => {
    pickerResolve.current?.(url);
    pickerResolve.current = null;
    setPickerOpen(false);
  };

  const locked = brand?.status === 'SUBMITTED' || brand?.status === 'APPROVED';
  const canSubmit = wizard.states.every((state) => !state.required || state.complete);
  const goNext = async (key: BrandWizardStepKey) => {
    const ok = locked || (await actions.next(STEP_FIELDS[key]));
    if (ok) setActiveStep((step) => Math.min(step + 1, LAST_STEP));
  };

  let title = t('partners.brandWizard.newTitle');
  if (brand) title = brand.brand_name || t('partners.brandWizard.editTitle');
  if (locked) title = brand?.brand_name || t('partners.brandWizard.viewTitle');

  if (brandId && loading && !data) {
    return (
      <Stack sx={{ alignItems: 'center', py: 5 }}>
        <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }
  if (brandId && !brand) {
    return (
      <Stack spacing={2}>
        <BackHeader backTo={BRANDS_PATH} title={t('partners.brandWizard.editTitle')} />
        <Alert severity="warning">{t('partners.brandWizard.notFound')}</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }} data-testid="brand-wizard-page">
      <BackHeader backTo={BRANDS_PATH} backAriaLabel={t('partners.brandWizard.backToBrands')} title={title} eyebrow={t('partners.common.partnerTools')} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.brandWizard.intro')}
      </Typography>
      <BrandWizardAlerts brand={brand} percent={wizard.percent} busy={actions.busy} onWithdraw={actions.withdraw} />
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <BrandWizardStepper
            activeStep={activeStep}
            states={wizard.states}
            locked={locked}
            onJump={setActiveStep}
            renderBody={(key, index) => (
              <Stack spacing={2.25}>
                <BrandStepBody
                  stepKey={key}
                  form={wizard.form}
                  brand={brand}
                  brandId={brandId}
                  states={wizard.states}
                  locked={locked}
                  onPickImage={pickImage}
                  onJump={(target) => setActiveStep(stepIndex(target))}
                  ensureBrandId={actions.ensureBrandId}
                  onChanged={reload}
                />
                <BrandStepActions
                  index={index}
                  total={BRAND_WIZARD_STEPS.length}
                  stepKey={key}
                  locked={locked}
                  busy={actions.busy}
                  canSubmit={canSubmit}
                  onBack={() => setActiveStep((step) => Math.max(step - 1, 0))}
                  onSaveDraft={actions.saveDraft}
                  onNext={() => goNext(key)}
                  onSubmit={actions.submit}
                />
              </Stack>
            )}
          />
        </CardContent>
      </Card>
      {brand && <BrandDangerZone brand={brand} onChanged={reload} />}
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => settlePicker(null)}
        onPicked={(url) => settlePicker(url)}
        folder="/brands/media"
        title={t('partners.ecommBrandPage.uploadBrandMedia')}
        accept="image/*,application/pdf"
      />
    </Stack>
  );
}
