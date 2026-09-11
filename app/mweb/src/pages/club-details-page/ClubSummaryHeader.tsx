import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import CheckIcon from '@mui/icons-material/CheckRounded';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import CategoryBreadcrumb from '../../components/CategoryBreadcrumb';
import TwoToneHeading from '../../components/TwoToneHeading';
import { SURFACE_SX } from '../../theme';

interface Props {
  club: any;
  /** Kept for callers; the hero above already shows the cover. */
  featureUrl?: string;
  /** Super › Category › Sub category names (root-first). */
  categoryCrumbs: readonly string[];
  following: boolean;
  chatUrl?: string | null;
  onToggleFollow: () => void;
}

/** A soft pill on the card: the "already done" state and the secondary action. */
const SOFT_SX = {
  bgcolor: 'action.hover',
  color: 'text.primary',
  '&:hover': { bgcolor: 'action.selected' },
} as const;

export default function ClubSummaryHeader({
  club,
  categoryCrumbs,
  following,
  chatUrl,
  onToggleFollow,
}: Readonly<Props>) {
  return (
    <Box sx={{ ...SURFACE_SX, p: 2 }}>
      {/* Identity and the two things you can do about it. The follower/pod/
          moment/venue counts that used to sit between them are gone: a brand
          new club read "0 total members" as its loudest line, which is the
          worst possible first impression of a page whose job is to recruit.
          Who is actually in the club is answered further down by Club Members
          — real people, from real pods. The cover avatar went too: it was the
          hero's first photo a second time. */}
      <Stack spacing={0.75} data-tour="club-header">
        <TwoToneHeading lead={club.club_name} component="h1" />
        {categoryCrumbs.length > 0 && <CategoryBreadcrumb crumbs={categoryCrumbs} />}
        {club.club_description && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              whiteSpace: 'pre-wrap',
              pt: 0.5
            }}>
            {club.club_description}
          </Typography>
        )}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <DuncitButton
          fullWidth
          data-tour="club-follow"
          variant={following ? 'text' : 'contained'}
          startIcon={following ? <CheckIcon /> : <PersonAddAltIcon />}
          onClick={onToggleFollow}
          sx={following ? SOFT_SX : undefined}
        >
          {following ? 'Following' : 'Follow Club'}
        </DuncitButton>
        <DuncitButton
          fullWidth
          startIcon={<ChatBubbleOutlineIcon />}
          component={chatUrl ? 'a' : 'button'}
          href={chatUrl || undefined}
          target={chatUrl ? '_blank' : undefined}
          rel={chatUrl ? 'noreferrer' : undefined}
          disabled={!chatUrl}
          sx={SOFT_SX}
        >
          Chat
        </DuncitButton>
      </Stack>
    </Box>
  );
}
