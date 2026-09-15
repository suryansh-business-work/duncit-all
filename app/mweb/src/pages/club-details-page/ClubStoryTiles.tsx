import { Avatar, Box, ButtonBase, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useStatusUpload } from '../../components/status-upload/StatusUploadProvider';
import { STORY_RING_GRADIENT } from '../home-page/HomeStatusTile';
import { useTranslation } from '../../i18n/useTranslation';

export interface ClubStory {
  id: string;
  image_url: string;
  media_type: string;
  caption: string;
  expires_at?: string | null;
  seen_by_me?: boolean;
  /** Server-owned: the author, or an admin of the club it was posted to. */
  can_delete?: boolean;
  author?: { user_id: string; full_name?: string | null; profile_photo?: string | null } | null;
}

interface Props {
  clubId: string;
  canPost: boolean;
  stories: ClubStory[];
  onOpen: (index: number) => void;
}

/** One story tile: a ring over its caption, stacked, as one keyboard-reachable button. */
const TILE_SX = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
  alignItems: 'center',
  width: 66,
  flex: '0 0 auto',
  borderRadius: '12px',
} as const;

/** The rail's tiles — the admin-only "Add" tile and one ring per live story. */
export default function ClubStoryTiles({ clubId, canPost, stories, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { openClubPicker } = useStatusUpload();

  return (
    <>
      {canPost && (
        <ButtonBase
          data-testid="club-story-add"
          aria-label={t('mweb.clubDetails.addAStoryToThisClub')}
          onClick={() => openClubPicker(clubId)}
          sx={TILE_SX}>
          <Avatar
            sx={{
              width: 58,
              height: 58,
              bgcolor: 'action.hover',
              color: 'accent.main',
              border: '2px dashed',
              borderColor: 'accent.main',
            }}
          >
            <AddIcon />
          </Avatar>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Add
          </Typography>
        </ButtonBase>
      )}
      {stories.map((story, index) => (
        <ButtonBase
          key={story.id}
          data-testid={`club-story-${story.id}`}
          aria-label={`Story by ${story.author?.full_name ?? 'member'}`}
          onClick={() => onOpen(index)}
          sx={TILE_SX}>
          <Box
            sx={{
              p: 0.35,
              borderRadius: '50%',
              background: story.seen_by_me ? undefined : STORY_RING_GRADIENT,
              bgcolor: story.seen_by_me ? 'divider' : undefined,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Avatar alt=""
              src={story.image_url}
              sx={{ width: 58, height: 58, border: '2px solid', borderColor: 'background.paper' }}
            />
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>
            {story.author?.full_name?.split(' ')[0] ?? 'Member'}
          </Typography>
        </ButtonBase>
      ))}
    </>
  );
}
