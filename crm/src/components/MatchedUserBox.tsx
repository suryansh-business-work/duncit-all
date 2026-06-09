import { Avatar, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import type { CrmMatchedUser } from '../api/crm.types';

const matchLabel = (m: CrmMatchedUser) => `Also a Duncit user · ${m.matched_on === 'EMAIL' ? 'Email' : 'Phone'} match`;

/** Small chip for the lead hero row when the lead is also a Duncit user. */
export function MatchedUserChip({ matched }: Readonly<{ matched: CrmMatchedUser }>) {
  return (
    <Chip
      size="small"
      color="success"
      icon={<VerifiedUserIcon fontSize="small" />}
      label={matchLabel(matched)}
      variant="outlined"
    />
  );
}

/** Separate box surfacing the matched Duncit user's details on a lead. */
export default function MatchedUserBox({ matched }: Readonly<{ matched: CrmMatchedUser }>) {
  return (
    <Card variant="outlined" sx={{ borderColor: 'success.main' }} data-testid="matched-user-box">
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar src={matched.profile_photo || undefined} sx={{ bgcolor: 'success.main' }}>
            {(matched.full_name || 'U')[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="subtitle2" fontWeight={800}>{matched.full_name || 'Duncit user'}</Typography>
              <MatchedUserChip matched={matched} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {[matched.email, matched.phone].filter(Boolean).join(' · ') || '—'}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
