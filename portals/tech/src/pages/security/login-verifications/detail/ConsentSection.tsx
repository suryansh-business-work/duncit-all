import { List, ListItem, ListItemIcon, ListItemText, Stack } from '@mui/material';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import Facts from '../../Facts';
import type { LogDetail } from '../queries';

/** One acknowledgement, read-only. The icon carries a name so the answer is never colour alone (WCAG 1.4.1). */
function ConsentRow({ granted, label }: Readonly<{ granted: boolean; label: string }>) {
  const { t } = useTranslation();
  return (
    <ListItem disableGutters>
      <ListItemIcon>
        {granted ? (
          <CheckCircleOutlinedIcon color="success" titleAccess={t('tech.loginVerifications.consent.acknowledged')} />
        ) : (
          <CancelOutlinedIcon color="error" titleAccess={t('tech.loginVerifications.consent.notAcknowledged')} />
        )}
      </ListItemIcon>
      <ListItemText primary={label} />
    </ListItem>
  );
}

/** What the person ticked on the Security Verification screen, and the wording they ticked it against. */
export default function ConsentSection({ detail }: Readonly<{ detail: LogDetail }>) {
  const { t } = useTranslation();
  const { consent } = detail;
  return (
    <SectionCard title={t('tech.loginVerifications.consent.title')}>
      <Stack spacing={1}>
        <List disablePadding>
          <ConsentRow
            granted={consent.authorized_person}
            label={t('tech.loginVerifications.consent.authorizedPerson')}
          />
          <ConsentRow
            granted={consent.credentials_not_shared}
            label={t('tech.loginVerifications.consent.credentialsNotShared')}
          />
          <ConsentRow
            granted={consent.policies_acknowledged}
            label={t('tech.loginVerifications.consent.policiesAcknowledged')}
          />
          <ConsentRow
            granted={consent.location_consent}
            label={t('tech.loginVerifications.consent.locationConsent')}
          />
        </List>
        <Facts
          items={[
            { label: t('tech.loginVerifications.consent.policyVersion'), value: detail.policy_version, mono: true },
            { label: t('tech.loginVerifications.consent.noticeVersion'), value: detail.notice_version, mono: true },
          ]}
        />
      </Stack>
    </SectionCard>
  );
}
