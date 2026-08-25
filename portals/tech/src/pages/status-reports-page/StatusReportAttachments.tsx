import { Box, Link, Stack, Typography } from '@mui/material';
import { MediaListField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  /** Hosted URLs the reporter attached. Read-only — this is their evidence. */
  reporterImages: string[];
  /** Newline-separated URLs the operator is adding, as MediaListField holds them. */
  staffImages: string;
  onStaffImagesChange: (next: string) => void;
}

/** The upload folder every image on a status report lands in. */
const FOLDER = '/status-reports';

/**
 * The pictures on one report: what the reporter sent, and what the team added.
 *
 * Two lists rather than one, because they are two different kinds of evidence.
 * What arrived with the report is the reporter's account of what they saw and
 * must not be editable here; what the team attaches while triaging — an
 * annotated shot, a log, a trace — belongs to the investigation.
 */
export default function StatusReportAttachments({
  reporterImages,
  staffImages,
  onStaffImagesChange,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2">{t('tech.statusReports.reporterScreenshots')}</Typography>
        {reporterImages.length === 0 ? (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t('tech.statusReports.noScreenshots')}
          </Typography>
        ) : (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              flexWrap: "wrap",
              mt: 1
            }}>
            {reporterImages.map((url) => (
              <Link
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={t('tech.statusReports.openScreenshot')}
              >
                <Box
                  component="img"
                  src={url}
                  alt=""
                  sx={{
                    width: 120,
                    height: 120,
                    objectFit: 'cover',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    display: 'block',
                  }}
                />
              </Link>
            ))}
          </Stack>
        )}
      </Box>
      <MediaListField
        label={t('tech.statusReports.teamAttachments')}
        helperText={t('tech.statusReports.teamAttachmentsHelp')}
        buttonLabel={t('tech.statusReports.addAttachment')}
        folder={FOLDER}
        value={staffImages}
        onChange={onStaffImagesChange}
      />
    </Stack>
  );
}
