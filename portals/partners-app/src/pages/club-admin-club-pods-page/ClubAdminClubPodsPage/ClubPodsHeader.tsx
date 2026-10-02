import { Link as RouterLink } from 'react-router';
import { Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  clubId: string;
  clubName?: string;
}

/** Page heading with the club's name and its Edit Club button. */
export function ClubPodsHeader({ clubId, clubName }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{
        justifyContent: "space-between",
        alignItems: { xs: 'flex-start', sm: 'center' }
      }}>
      <Stack spacing={0.25}>
        <Typography
          variant="overline"
          sx={{
            color: "text.secondary",
            fontWeight: 800
          }}>{t('clubAdmin.pods.title')}</Typography>
        <Typography variant="h6" component="h1" sx={{
          fontWeight: 950
        }}>{clubName ?? t('clubAdmin.pods.clubPods')}</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>{t('clubAdmin.pods.createEditDelete')}</Typography>
      </Stack>
      <DuncitButton
        variant="outlined"
        startIcon={<EditIcon />}
        component={RouterLink}
        to={`/club-admin/clubs/${clubId}/edit`}
      >
        {t('clubAdmin.clubs.editClub')}
      </DuncitButton>
    </Stack>
  );
}
