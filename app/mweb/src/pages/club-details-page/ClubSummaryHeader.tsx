import GroupsIcon from '@mui/icons-material/Groups';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import CheckIcon from '@mui/icons-material/Check';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import CategoryBreadcrumb from '../../components/CategoryBreadcrumb';

interface Props {
  club: any;
  featureUrl?: string;
  /** Super › Category › Sub category names (root-first). */
  categoryCrumbs: readonly string[];
  following: boolean;
  chatUrl?: string | null;
  onToggleFollow: () => void;
}

export default function ClubSummaryHeader({
  club,
  featureUrl,
  categoryCrumbs,
  following,
  chatUrl,
  onToggleFollow,
}: Readonly<Props>) {
  return (
    <Box
      sx={{
        mt: -8,
        mx: { xs: 1, sm: 2 },
        p: 2,
        position: 'relative',
        zIndex: 2,
        borderRadius: '16px',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        boxShadow: '0 24px 54px rgba(9,7,18,0.34)',
      }}
    >
      {/* Identity and the two things you can do about it. The follower/pod/
          moment/venue counts that used to sit between them are gone: a brand
          new club read "0 total members" as its loudest line, which is the
          worst possible first impression of a page whose job is to recruit.
          Who is actually in the club is answered further down by Club Members
          — real people, from real pods. */}
      <Stack direction="row" spacing={1.5} data-tour="club-header" sx={{
        alignItems: "center"
      }}>
        <Avatar
          src={featureUrl}
          variant="rounded"
          sx={{ width: 72, height: 72, borderRadius: '16px', bgcolor: 'primary.main' }}
        >
          <GroupsIcon />
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }} noWrap>
            {club.club_name}
          </Typography>
          {categoryCrumbs.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              <CategoryBreadcrumb crumbs={categoryCrumbs} />
            </Box>
          )}
          {club.club_description && (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                mt: 0.5
              }}>
              {club.club_description}
            </Typography>
          )}
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <DuncitButton
          fullWidth
          data-tour="club-follow"
          variant={following ? 'outlined' : 'contained'}
          startIcon={following ? <CheckIcon /> : <PersonAddAltIcon />}
          onClick={onToggleFollow}
          sx={{ borderRadius: '16px', fontWeight: 700 }}
        >
          {following ? 'Following' : 'Follow Club'}
        </DuncitButton>
        <DuncitButton
          fullWidth
          variant="outlined"
          startIcon={<ChatBubbleOutlineIcon />}
          component={chatUrl ? 'a' : 'button'}
          href={chatUrl || undefined}
          target={chatUrl ? '_blank' : undefined}
          rel={chatUrl ? 'noreferrer' : undefined}
          disabled={!chatUrl}
          sx={{ borderRadius: '16px', fontWeight: 700 }}
        >
          Chat
        </DuncitButton>
      </Stack>
    </Box>
  );
}
