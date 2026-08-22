import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MATCHING_CLUBS, categoryPath, type ClubAdminRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface ClubOption {
  id: string;
  club_name: string;
  assigned: boolean;
  /** False for a club they run from outside their own category. */
  matches_category: boolean;
}

interface Props {
  row: ClubAdminRow;
  saving: boolean;
  onSave: (clubIds: string[]) => void;
}

/**
 * Assign Clubs — the clubs matching this admin's Super > Category > Sub.
 *
 * The list is deliberately narrowed rather than showing every club: a Club
 * Admin onboarded for one part of the taxonomy has no business running a club
 * from another, and a picker of every club in the country is not a picker.
 */
export default function AssignClubsSection({ row, saving, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, loading } = useQuery<{ clubAdminMatchingClubs: ClubOption[] }>(MATCHING_CLUBS, {
    variables: { id: row.id, search: search.trim() || null },
    fetchPolicy: 'cache-and-network',
  });

  const options = useMemo(() => data?.clubAdminMatchingClubs ?? [], [data]);

  // Seed from what the server says is assigned, and re-seed when the admin
  // being reviewed changes — a stale selection would unassign someone else's
  // clubs on save.
  useEffect(() => {
    setSelected(new Set(row.assigned_clubs.map((c) => c.id)));
  }, [row.id, row.assigned_clubs]);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasTaxonomy = Boolean(row.super_category_id ?? row.category_id ?? row.sub_category_id);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Assign Clubs
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Clubs matching {categoryPath(row)}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="contained"
          disabled={saving}
          onClick={() => onSave([...selected])}
        >
          {saving ? 'Saving…' : 'Save clubs'}
        </Button>
      </Stack>

      {!hasTaxonomy && (
        <Alert severity="info" sx={{ mb: 1 }}>
          This Club Admin has no category on record, so every club is listed. Set one in Edit to
          narrow it.
        </Alert>
      )}

      <TextField
        size="small"
        fullWidth
        placeholder={t('onboarding.clubAdmins.searchClubs')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 1 }}
      />

      {loading && options.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <CircularProgress size={22} />
        </Box>
      ) : (
        <List
          dense
          sx={{ maxHeight: 240, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}
        >
          {options.length === 0 && (
            <ListItemText
              sx={{ px: 2, py: 1 }}
              primary={
                <Typography variant="body2" color="text.secondary">
                  No clubs match this category yet.
                </Typography>
              }
            />
          )}
          {options.map((club) => (
            <ListItemButton key={club.id} onClick={() => toggle(club.id)} dense>
              <Checkbox edge="start" size="small" checked={selected.has(club.id)} tabIndex={-1} disableRipple />
              {/* A club they run from outside their category says so rather
                  than sitting in the list looking like a match. */}
              <ListItemText
                primary={club.club_name}
                secondary={club.matches_category ? undefined : 'Outside their category'}
                secondaryTypographyProps={{ color: 'warning.main', variant: 'caption' }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
