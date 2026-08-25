import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { AutoPodRow, AutoPodLabels } from '@duncit/utils';
import { CLUB_CLAIM_AUTO_POD, MY_ADMIN_CLUBS_FOR_AUTO_POD } from '../queries';

interface ClubOption {
  id: string;
  club_name: string;
  category_id: string | null;
}

export interface ClubClaimDialogProps {
  row: AutoPodRow | null;
  /** The Auto Pod's sub-category — only clubs carrying it may claim, because a
   * pod inherits its category from its club. */
  subCategoryId: string | null;
  labels: AutoPodLabels;
  open: boolean;
  onClose: () => void;
  onClaimed: () => void;
  formatWhen: (iso: string) => string;
}

/**
 * "Claim for my club" — the club admin attaches the offer to one of their
 * clubs, which is what gives the resulting pod its club and its category. Only
 * clubs in the Auto Pod's own category are offered; the server asserts the same
 * rule, so a stale list cannot slip one through.
 */
export function ClubClaimDialog({
  row,
  subCategoryId,
  labels,
  open,
  onClose,
  onClaimed,
  formatWhen,
}: Readonly<ClubClaimDialogProps>) {
  const [clubId, setClubId] = useState('');
  const [failure, setFailure] = useState<string | null>(null);

  const clubsQuery = useQuery<{ myAdminClubs: ClubOption[] }>(MY_ADMIN_CLUBS_FOR_AUTO_POD, {
    skip: !open,
  });
  const clubs = (clubsQuery.data?.myAdminClubs ?? []).filter(
    (club) => !subCategoryId || String(club.category_id ?? '') === subCategoryId
  );

  const [claim, claimState] = useMutation(CLUB_CLAIM_AUTO_POD);

  // One eligible club is not a choice — preselect it.
  useEffect(() => {
    if (!clubId && clubs.length === 1) setClubId(clubs[0].id);
  }, [clubId, clubs]);

  const handleClose = () => {
    setFailure(null);
    onClose();
  };

  const handleClaim = async () => {
    if (!row || !clubId) return;
    setFailure(null);
    try {
      await claim({ variables: { auto_pod_doc_id: row.id, club_id: clubId } });
      onClaimed();
      handleClose();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : labels.claimedElsewhere);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{labels.confirmClaim}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {labels.confirmClaimBody}
          </Typography>
          {row ? (
            <>
              <Typography variant="subtitle2">{row.pod_title}</Typography>
              {row.venue_claim ? (
                <Typography variant="body2">
                  {row.venue_claim.venue_name} · {formatWhen(row.venue_claim.pod_date_time)}
                </Typography>
              ) : null}
            </>
          ) : null}

          <TextField
            select
            fullWidth
            label={labels.pickClub}
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
          >
            {clubs.map((club) => (
              <MenuItem key={club.id} value={club.id}>
                {club.club_name}
              </MenuItem>
            ))}
          </TextField>

          {failure ? <Alert severity="error">{failure}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{labels.dismiss}</Button>
        <Button variant="contained" onClick={handleClaim} disabled={!clubId || claimState.loading}>
          {labels.claimForClubCta}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
