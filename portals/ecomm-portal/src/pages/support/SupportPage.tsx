import { Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { PageHeader, SectionCard } from '@duncit/ui';
import { STORE_URL, SUPPORT_URL } from '../../runtime';

interface ExternalLinkButtonProps {
  label: string;
  href: string;
  testId: string;
}

/** Opens another Duncit surface in a new tab, and says so to a screen reader. */
function ExternalLinkButton({ label, href, testId }: Readonly<ExternalLinkButtonProps>) {
  const { t } = useTranslation();
  return (
    <DuncitButton
      variant="outlined"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      endIcon={<OpenInNewIcon />}
      aria-label={t('ecommPortal.common.opensInNewTab', { vars: { label } })}
      sx={{ alignSelf: 'flex-start' }}
      data-testid={testId}
    >
      {label}
    </DuncitButton>
  );
}

/**
 * Where the store's shopper tickets go. They are raised on the store's Contact
 * page and land in the Support console tagged as Pet Store tickets, so this
 * page explains the tagging and links to both ends.
 */
export default function SupportPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={3} data-testid="support-page">
      <PageHeader title={t('ecommPortal.support.title')} subtitle={t('ecommPortal.support.subtitle')} />
      <SectionCard title={t('ecommPortal.support.howTagged')}>
        <Stack spacing={2}>
          <Typography variant="body2">{t('ecommPortal.support.tagExplain')}</Typography>
          <ExternalLinkButton
            label={t('ecommPortal.support.openConsole')}
            href={`${SUPPORT_URL}/tickets?source=STORE`}
            testId="support-open-console"
          />
        </Stack>
      </SectionCard>
      <SectionCard title={t('ecommPortal.support.contactPage')}>
        <Stack spacing={2}>
          <Typography variant="body2">{t('ecommPortal.support.contactExplain')}</Typography>
          <ExternalLinkButton label={t('ecommPortal.support.openContact')} href={`${STORE_URL}/contact`} testId="support-open-contact" />
        </Stack>
      </SectionCard>
    </Stack>
  );
}
