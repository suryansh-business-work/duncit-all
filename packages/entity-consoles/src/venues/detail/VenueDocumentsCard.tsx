import { Divider, Link, Stack, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import SectionCard from './SectionCard';
import type { VenueDocument } from './queries';

/** The KYC/ownership papers the owner uploaded. Documents are append-only in
 * onboarding, so this list only ever grows — it is the audit trail. */
export default function VenueDocumentsCard({ documents }: Readonly<{ documents: VenueDocument[] }>) {
  const { t } = useTranslation();

  if (documents.length === 0) {
    return (
      <SectionCard icon={<DescriptionIcon color="primary" />} title={t('admin.venueDetails.tabDocuments')}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('admin.venueDetails.noDocuments')}
        </Typography>
      </SectionCard>
    );
  }

  return (
    <SectionCard icon={<DescriptionIcon color="primary" />} title={t('admin.venueDetails.tabDocuments')}>
      <Stack divider={<Divider flexItem />} spacing={1.25}>
        {documents.map((doc) => (
          <Stack
            key={`${doc.type}-${doc.url}`}
            direction="row"
            spacing={2}
            sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 1.25, ':first-of-type': { pt: 0 } }}
          >
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {doc.type}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('admin.venueDetails.uploadedOn', { vars: { date: formatDate(doc.uploaded_at) } })}
              </Typography>
            </Stack>
            <Link
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              variant="body2"
              sx={{ fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              {t('shell.common.view')}
              <OpenInNewIcon fontSize="inherit" />
            </Link>
          </Stack>
        ))}
      </Stack>
    </SectionCard>
  );
}
