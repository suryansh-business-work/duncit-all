import { useQuery } from '@apollo/client/react';
import { Alert, AlertTitle, Link } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from '@duncit/shell';
import { CRM_CALL_SETUP, type CallSetup } from '../../api/call.gql';
import { urlConfigs } from '../../config/url-configs';

/** The Tech portal's Environment page, opened on the Twilio integration. */
export const TWILIO_CONFIG_URL = `${urlConfigs.techUrl}/?section=TWILIO`;

const FIELD_KEYS: Record<string, string> = {
  account_sid: 'crm.call.fieldAccountSid',
  auth_token: 'crm.call.fieldAuthToken',
  phone_number: 'crm.call.fieldPhoneNumber',
};

/**
 * "Twilio is not configured", with what is missing and — for someone allowed
 * to change it — a Configure Twilio link straight to the Twilio section of
 * the Tech portal, where the credentials are added, updated and tested.
 * Everyone else is told to ask an administrator.
 */
export default function TwilioSetupNotice() {
  const { t } = useTranslation();
  const { data } = useQuery<{ crmCallSetup: CallSetup }>(CRM_CALL_SETUP, { fetchPolicy: 'cache-first' });
  const setup = data?.crmCallSetup;
  const missing = (setup?.missing ?? []).map((field) => (FIELD_KEYS[field] ? t(FIELD_KEYS[field]) : field));

  return (
    <Alert severity="warning" data-testid="twilio-setup-notice">
      <AlertTitle>{t('crm.call.notConfiguredTitle')}</AlertTitle>
      {t('crm.call.notConfiguredBody')}
      {missing.length > 0 && <div>{t('crm.call.missingFields', { vars: { fields: missing.join(', ') } })}</div>}
      <div>
        {setup?.can_configure ? (
          <Link href={TWILIO_CONFIG_URL} target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
            {t('crm.call.configureTwilio')}
            <OpenInNewIcon fontSize="inherit" aria-hidden />
          </Link>
        ) : (
          t('crm.call.notConfiguredAskAdmin')
        )}
      </div>
    </Alert>
  );
}
