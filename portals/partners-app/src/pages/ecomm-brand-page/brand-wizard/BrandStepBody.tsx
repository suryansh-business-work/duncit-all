import type { BrandStepState, BrandWizardStepKey } from '@duncit/utils';
import type { EcommBrand } from '../queries';
import type { BrandWizardForm } from './useBrandWizard';
import DetailsStep from './steps/DetailsStep';
import BusinessStep from './steps/BusinessStep';
import AddressStep from './steps/AddressStep';
import PayoutStep from './steps/PayoutStep';
import CategoriesStep from './steps/CategoriesStep';
import MediaStep from './steps/MediaStep';
import DocumentsStep from './steps/DocumentsStep';
import IntegrationStep from './steps/IntegrationStep';
import ReviewStep from './steps/ReviewStep';
import ConsentStep from './steps/ConsentStep';

interface Props {
  stepKey: BrandWizardStepKey;
  form: BrandWizardForm;
  brand: EcommBrand | null;
  brandId: string | null;
  states: BrandStepState[];
  locked: boolean;
  onPickImage: () => Promise<string | null>;
  onJump: (key: BrandWizardStepKey) => void;
  ensureBrandId: () => Promise<string | null>;
  onChanged: () => void;
}

/** The body of whichever step is open — one component per step, chosen by key. */
export default function BrandStepBody({
  stepKey,
  form,
  brand,
  brandId,
  states,
  locked,
  onPickImage,
  onJump,
  ensureBrandId,
  onChanged,
}: Readonly<Props>) {
  const { control, watch, setValue } = form;
  const shared = { control, watch, setValue, locked };
  switch (stepKey) {
    case 'details':
      return <DetailsStep {...shared} />;
    case 'business':
      return <BusinessStep {...shared} />;
    case 'address':
      return <AddressStep {...shared} />;
    case 'payout':
      return <PayoutStep {...shared} razorpay={brand?.integrations?.razorpay} />;
    case 'categories':
      return <CategoriesStep {...shared} />;
    case 'media':
      return <MediaStep {...shared} onPickImage={onPickImage} />;
    case 'documents':
      return <DocumentsStep {...shared} onPickImage={onPickImage} />;
    case 'integration':
      return (
        <IntegrationStep
          brandId={brandId}
          integrations={brand?.integrations}
          locked={locked}
          ensureBrandId={ensureBrandId}
          onChanged={onChanged}
        />
      );
    case 'review':
      return <ReviewStep values={watch()} states={states} integrations={brand?.integrations} locked={locked} onJump={onJump} />;
    default:
      return (
        <ConsentStep brandId={brandId} consent={brand?.consent} locked={locked} ensureBrandId={ensureBrandId} onChanged={onChanged} />
      );
  }
}
