import type { DuncitColumn } from '@duncit/table';
import type { AudienceRow } from '../helpers';
import { dash, yesNo } from './cells';
import { PROVIDER_OPTIONS, STATUS_OPTIONS } from '../helpers';
import { useTranslation } from '@duncit/app-settings';

/** Account state — hidden by default; the sidebar is where these are filtered. */
type Translate = ReturnType<typeof useTranslation>['t'];

export const accountColumns = (t: Translate): DuncitColumn<AudienceRow>[] => [
  { field: 'status', headerName: t('shell.common.status'), type: 'enum', options: STATUS_OPTIONS, width: 110, valueGetter: (row) => dash(row.status) },
  {
    field: 'email_verified',
    headerName: t('marketing.targetAudience.emailVerified'),
    type: 'boolean',
    width: 140,
    hide: true,
    valueGetter: (row) => yesNo(row.email_verified),
  },
  {
    field: 'phone_verified',
    headerName: t('marketing.targetAudience.phoneVerified'),
    type: 'boolean',
    width: 140,
    hide: true,
    valueGetter: (row) => yesNo(row.phone_verified),
  },
  {
    field: 'locale',
    headerName: t('marketing.common.language'),
    type: 'text',
    width: 120,
    hide: true,
    valueGetter: (row) => dash(row.locale),
  },
  {
    field: 'last_login_provider',
    headerName: t('marketing.targetAudience.signedInWith'),
    type: 'enum',
    options: PROVIDER_OPTIONS,
    minWidth: 140,
    hide: true,
    valueGetter: (row) => dash(row.last_login_provider),
  },
];
