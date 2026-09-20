import { Navigate, useParams } from 'react-router';
import BrandWizardPage from './BrandWizardPage';

export { default as BrandWizardPage } from './BrandWizardPage';
export { useBrandWizard } from './useBrandWizard';
export { useBrandWizardActions } from './useBrandWizardActions';

/**
 * `/ecomm-brand/new` and `/ecomm-brand/:brandId/edit`. Keyed by the id so the
 * move from `new` to the minted id remounts the page with a clean form.
 */
export function BrandWizardRoute() {
  const { brandId } = useParams<{ brandId: string }>();
  return <BrandWizardPage key={brandId ?? 'new'} brandId={brandId ?? null} />;
}

/** `/ecomm-brand/:brandId` — the bare id opens the wizard. */
export function BrandEditRedirect() {
  const { brandId = '' } = useParams<{ brandId: string }>();
  return <Navigate to={`/ecomm-brand/${brandId}/edit`} replace />;
}
