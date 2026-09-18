import { useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import AppleIcon from '@mui/icons-material/Apple';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { useConfirm, notifyError, notifySuccess } from '@duncit/dialogs';
import { formatDateTime } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import { GENERATE_IOS_SIGNING, type AppBuildSettings } from '../queries';

interface Props {
  settings: AppBuildSettings;
  /** Re-reads the settings so the card shows the identity just made. */
  onGenerated: () => Promise<unknown>;
}

/** Where iOS signing stands: no key, a key but no identity yet, or the identity builds sign with. */
function SigningStatus({ settings }: Readonly<{ settings: AppBuildSettings }>) {
  const { t } = useTranslation();
  const signing = settings.ios_signing;
  if (!settings.app_store_configured) {
    return <Alert severity="warning">{t('tech.appBuilds.appStoreNotConfigured')}</Alert>;
  }
  if (!signing) {
    return (
      <Alert severity="info">
        {t('tech.appBuilds.iosSigningNone', { vars: { bundle: settings.app_store_bundle_id } })}
      </Alert>
    );
  }
  return (
    <Alert severity="success">
      {t('tech.appBuilds.iosSigningCurrent', {
        vars: {
          serial: signing.certificate_serial,
          team: signing.team_id,
          profile: signing.profile_name,
          expires: signing.expires_at ? formatDateTime(signing.expires_at) : '—',
        },
      })}
    </Alert>
  );
}

/**
 * iOS signing with no Mac. The App Store Connect key lives on its env entry,
 * where it can be tested; this card turns it into signing files — an Apple
 * Distribution certificate and an App Store profile — that every iOS build
 * then fetches from the server.
 */
export default function AppStoreCard({ settings, onGenerated }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [generate, { loading }] = useMutation(GENERATE_IOS_SIGNING);
  const actionKey = settings.ios_signing ? 'tech.appBuilds.iosSigningRegenerate' : 'tech.appBuilds.iosSigningGenerate';

  const onGenerate = async () => {
    const ok = await confirm({
      title: t('tech.appBuilds.iosSigningConfirmTitle'),
      message: t('tech.appBuilds.iosSigningConfirmMessage', { vars: { bundle: settings.app_store_bundle_id } }),
      confirmLabel: t(actionKey),
    });
    if (!ok) return;
    try {
      await generate();
      notifySuccess(t('tech.appBuilds.iosSigningGenerated'));
      await onGenerated();
    } catch (err) {
      notifyError(parseApiError(err));
    }
  };

  return (
    <Card sx={{ maxWidth: 640, mt: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <AppleIcon fontSize="small" />
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              {t('tech.appBuilds.appStoreTitle')}
            </Typography>
          </Stack>
          <SigningStatus settings={settings} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tech.appBuilds.appStoreHint')}
          </Typography>
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
            <DuncitButton
              variant="contained"
              size="small"
              loading={loading}
              disabled={!settings.app_store_configured}
              onClick={onGenerate}
            >
              {t(actionKey)}
            </DuncitButton>
            <DuncitButton variant="outlined" size="small" onClick={() => navigate('/')}>
              {t('tech.appBuilds.playOpenEnvironment')}
            </DuncitButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
