import { Divider, Stack, Typography } from '@mui/material';
import { ImagePreview } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  passportUrl?: string | null;
  policeVerificationUrl?: string | null;
}

/**
 * The two KYC documents, rendered as the photos they are. These used to be
 * "open in new tab" buttons, which meant a reviewer had to leave the dialog —
 * and lose the rest of the application — just to see whether a passport photo
 * was legible. The thumbnails enlarge in place instead.
 */
export default function HostReviewDocuments({ passportUrl, policeVerificationUrl }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <Divider textAlign="left">
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          Documents
        </Typography>
      </Divider>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {passportUrl && <ImagePreview src={passportUrl} label={t('onboarding.common.passportPhoto')} />}
        {policeVerificationUrl && (
          <ImagePreview src={policeVerificationUrl} label={t('onboarding.hosts.policeVerification')} />
        )}
        {!passportUrl && !policeVerificationUrl && (
          <Typography variant="body2" color="warning.main" data-testid="review-no-documents">
            No documents uploaded yet.
          </Typography>
        )}
      </Stack>
    </>
  );
}
