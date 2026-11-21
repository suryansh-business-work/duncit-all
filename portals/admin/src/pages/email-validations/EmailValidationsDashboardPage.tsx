// The Analytics console's Email Validations dashboard, mounted here as it is —
// one implementation, two doors (as Users Dashboard does). The Dockerfile copies
// that console's src for the build. Only the heading and route are Admin's: the
// layout id is shared, so a layout saved in one console is the layout in the other.
import EntityAnalyticsPage from '../../../../analytics/src/pages/entity-analytics/EntityAnalyticsPage';
import { EMAIL_VALIDATIONS_PAGE } from '../../../../analytics/src/pages/entity-analytics/pages';

const ADMIN_EMAIL_VALIDATIONS_PAGE = {
  ...EMAIL_VALIDATIONS_PAGE,
  path: '/email-validations/dashboard',
  title: 'admin.emailValidations.dashboardTitle',
  subtitle: 'admin.emailValidations.dashboardSubtitle',
};

/** Email Validations › Dashboard: result trends, valid/risky/invalid split, per-console figures, failing checks. */
export default function EmailValidationsDashboardPage() {
  return <EntityAnalyticsPage page={ADMIN_EMAIL_VALIDATIONS_PAGE} />;
}
