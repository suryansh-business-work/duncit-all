import { Box, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import SuperCategoryFilter from '../../components/SuperCategoryFilter';
import { useTranslation } from '@duncit/shell';

interface Props {
  superCategoryId: string;
  onSuperCategoryChange: (superCategoryId: string) => void;
}

export default function ClubsToolbar({
  superCategoryId,
  onSuperCategoryChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
    >
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <GroupsIcon color="primary" />
          <Typography variant="h5">{t('admin.clubs.title')}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Manage clubs. Pods are organised inside a club.
        </Typography>
      </Box>
      <SuperCategoryFilter value={superCategoryId} onChange={onSuperCategoryChange} />
    </Stack>
  );
}
