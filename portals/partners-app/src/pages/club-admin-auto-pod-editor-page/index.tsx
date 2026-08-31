import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { QueryGuard } from '@duncit/ui';
import { CLUB_ADMIN_POD_LOOKUPS } from '../club-admin-club-pods-page/queries';
import ClubAutoPodEditor, { type ClubAutoPodClub } from './ClubAutoPodEditor';

/**
 * The Club Admin's "New Auto Pod" page: `/club-admin/clubs/:clubId/auto-pods/new`.
 * Resolves the club first — its category is what the form is locked to — and
 * refuses to open the form at all for a club that has no category yet, since
 * such an Auto Pod could never materialize.
 */
export default function ClubAdminAutoPodEditorPage() {
  const { clubId = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const backTo = `/club-admin/clubs/${clubId}`;
  const lookups = useQuery<any>(CLUB_ADMIN_POD_LOOKUPS, { fetchPolicy: 'cache-and-network' });
  const club: ClubAutoPodClub | null =
    (lookups.data?.myAdminClubs ?? []).find((item: ClubAutoPodClub) => item.id === clubId) ??
    null;

  const renderEditor = () => {
    if (!club) return null;
    if (club.category_id) return <ClubAutoPodEditor club={club} backTo={backTo} />;
    return (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Alert severity="error" sx={{ width: '100%' }}>
          {t('admin.autoPods.clubCategoryMissing')}
        </Alert>
        <DuncitButton startIcon={<ArrowBackIcon />} onClick={() => navigate(backTo)}>
          {t('admin.autoPods.backToClubPods')}
        </DuncitButton>
      </Stack>
    );
  };

  return (
    <QueryGuard
      loading={lookups.loading && !lookups.data}
      error={lookups.error}
      errorText={lookups.error?.message}
      notFound={!!lookups.data && !club}
      notFoundSeverity="warning"
    >
      {renderEditor}
    </QueryGuard>
  );
}
