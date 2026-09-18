import { Alert, Box, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { DatabaseConnection } from './queries';

type Props = Readonly<{ connection: DatabaseConnection }>;

/** A link that opens GitHub in a new tab; hidden when the repo is not configured. */
function ExternalLink({ href, label }: Readonly<{ href: string | null; label: string }>) {
  if (!href) return null;
  return (
    <DuncitButton
      size="small"
      variant="outlined"
      endIcon={<OpenInNewIcon fontSize="small" />}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </DuncitButton>
  );
}

/** The deployed path: the GitHub secret is the only place a change survives the next deploy. */
function DeploySteps({ secret, branch }: Readonly<{ secret: string; branch: string }>) {
  const { t } = useTranslation();
  const vars = { secret, branch };
  const steps = [
    { id: 'open', text: t('tech.dbInfo.changeStep1') },
    { id: 'edit', text: t('tech.dbInfo.changeStep2', { vars }) },
    { id: 'deploy', text: t('tech.dbInfo.changeStep3', { vars }) },
    { id: 'verify', text: t('tech.dbInfo.changeStep4') },
  ];
  return (
    <Box component="ol" sx={{ m: 0, pl: 3 }}>
      {steps.map((step) => (
        <Typography key={step.id} component="li" variant="body2" sx={{ mb: 0.75 }}>
          {step.text}
        </Typography>
      ))}
    </Box>
  );
}

/** How to point this environment at another database — by secret and deploy, never from here. */
export default function ChangeDatabaseGuide({ connection: c }: Props) {
  const { t } = useTranslation();

  return (
    <SectionCard
      title={t('tech.dbInfo.changeTitle')}
      action={
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <ExternalLink href={c.secretsUrl} label={t('tech.dbInfo.openSecrets')} />
          <ExternalLink href={c.deployRunsUrl} label={t('tech.dbInfo.openDeployRuns')} />
        </Stack>
      }
    >
      <Stack spacing={1.5}>
        <Typography variant="body2">{t('tech.dbInfo.changeIntro')}</Typography>
        {c.secretName && c.deployBranch ? (
          <DeploySteps secret={c.secretName} branch={c.deployBranch} />
        ) : (
          <Typography variant="body2">{t('tech.dbInfo.changeLocal')}</Typography>
        )}
        <Alert severity="warning">{t('tech.dbInfo.changeWarnData')}</Alert>
        <Alert severity="info">{t('tech.dbInfo.changeWarnServerEnv')}</Alert>
        <Alert severity="info">{t('tech.dbInfo.changeWarnPassword')}</Alert>
      </Stack>
    </SectionCard>
  );
}
