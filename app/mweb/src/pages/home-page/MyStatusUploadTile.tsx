import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import HomeStatusTile from './HomeStatusTile';
import { useStatusUpload } from '../../components/status-upload/StatusUploadProvider';

interface Props {
  me?: any;
  onView?: () => void;
}

function initials(name?: string | null) {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function MyStatusUploadTile({ me, onView }: Readonly<Props>) {
  const { upload, openProfilePicker } = useStatusUpload();
  const stories = (me?.my_stories ?? []) as Array<{ image_url?: string; media_type?: string }>;
  const latestStory = stories[0] ?? null;
  const latestIsVideo = latestStory?.media_type === 'VIDEO';
  const statusUrl = latestStory?.image_url ?? upload.profileUrl ?? null;
  const hasStories = stories.length > 0;
  const uploading = upload.active && upload.kind === 'profile';
  const progress = uploading ? upload.progress : 0;

  const handlePick = () => {
    if (uploading) return;
    if (hasStories && onView) {
      onView();
      return;
    }
    openProfilePicker();
  };

  const openPicker = () => {
    if (uploading) return;
    openProfilePicker();
  };

  return (
    <Stack alignItems="center" sx={{ position: 'relative' }}>
      <HomeStatusTile
        label={uploading ? 'Uploading…' : 'My status'}
        imageUrl={latestIsVideo ? null : statusUrl ?? me?.profile_photo}
        videoUrl={latestIsVideo ? statusUrl : null}
        initials={initials(me?.full_name || me?.first_name)}
        add={!hasStories}
        active={hasStories}
        onClick={handlePick}
      />
      {hasStories && !uploading && (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
          sx={{
            position: 'absolute',
            right: 4,
            bottom: 18,
            width: 22,
            height: 22,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            border: 2,
            borderColor: 'background.paper',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 900,
            lineHeight: 1,
          }}
          aria-label="Add another"
        >
          +
        </Box>
      )}
      {uploading && (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            left: 4,
            width: 62,
            height: 62,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
            borderRadius: '50%',
            bgcolor: 'rgba(0,0,0,0.48)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
          }}
        >
          <CircularProgress
            variant={progress > 0 ? 'determinate' : 'indeterminate'}
            value={progress}
            size={62}
            thickness={3}
            sx={{ color: '#fff' }}
          />
          <Typography
            variant="caption"
            sx={{ position: 'absolute', fontWeight: 900, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
          >
            {progress}%
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
