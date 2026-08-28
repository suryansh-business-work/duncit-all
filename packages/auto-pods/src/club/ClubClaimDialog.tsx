import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DuncitButton } from '@duncit/buttons';
import { autoPodCityLabel, type AutoPodRow, type AutoPodLabels } from '@duncit/utils';
import { CLUB_CLAIM_AUTO_POD, MY_ADMIN_CLUBS_FOR_AUTO_POD } from '../queries';
import { enrolmentFailure } from '../failure-message';

interface ClubOption {
  id: string;
  club_name: string;
  category_id: string | null;
  location_id: string | null;
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
  // Only a club in the offer's category AND (once pinned) its city may claim —
  // the server refuses any other, so the picker never offers one.
  const pinnedLocationId = row?.location?.location_id ?? null;
  const clubs = (clubsQuery.data?.myAdminClubs ?? []).filter(
    (club) =>
      (!subCategoryId || String(club.category_id ?? '') === subCategoryId) &&
      (!pinnedLocationId || club.location_id === pinnedLocationId)
  );
  const noClubInCity =
    !!pinnedLocationId && !clubsQuery.loading && clubs.length === 0 && !!row;

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
      setFailure(enrolmentFailure(err, labels.claimedElsewhere));
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
              {row.location ? (
                <Typography variant="body2">
                  {labels.pinnedTo(autoPodCityLabel(row.location))}
                </Typography>
              ) : null}
              {row.venue_claim ? (
                <Typography variant="body2">
                  {row.venue_claim.venue_name} · {formatWhen(row.venue_claim.pod_date_time)}
                </Typography>
              ) : null}
            </>
          ) : null}
          {noClubInCity ? (
            <Alert severity="warning">{labels.noClubInCity(autoPodCityLabel(row?.location))}</Alert>
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
        <DuncitButton onClick={handleClose}>{labels.dismiss}</DuncitButton>
        <DuncitButton variant="contained" onClick={handleClaim} disabled={!clubId || claimState.loading}>
          {labels.claimForClubCta}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
