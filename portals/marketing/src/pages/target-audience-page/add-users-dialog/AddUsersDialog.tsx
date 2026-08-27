import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useDebouncedValue } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { ADD_AUDIENCE_LIST_MEMBERS, AUDIENCE_LIST_CANDIDATES } from '../queries';
import UserPickList from './UserPickList';
import type { PickableUser, PickerUsersData } from './types';

const PAGE_SIZE = 25;

interface Props {
  open: boolean;
  listId: string;
  onClose: () => void;
  /** Fired after the server has accepted the additions. */
  onAdded: () => void;
}

/**
 * Hand-pick people into a saved list.
 *
 * It offers CANDIDATES, not the whole audience: the server subtracts whoever
 * the list already holds, so nobody in it can be picked again. Doing that here
 * instead would only hide the members of the page currently loaded.
 *
 * A tick is kept by id, so somebody selected on page 1 stays selected after a
 * new search — the marketer is building one set, not one page of one search.
 */
export default function AddUsersDialog({ open, listId, onClose, onAdded }: Readonly<Props>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PickableUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, loading } = useQuery<PickerUsersData>(AUDIENCE_LIST_CANDIDATES, {
    variables: {
      list_id: listId,
      query: { search: debouncedSearch, page, page_size: PAGE_SIZE },
    },
    fetchPolicy: 'cache-and-network',
    skip: !open,
  });

  const [addMembers, { loading: saving }] = useMutation(ADD_AUDIENCE_LIST_MEMBERS);

  // A new search starts at the first page; staying on page 4 of the old result
  // would show an empty list for a search that does have matches.
  useEffect(() => setPage(1), [debouncedSearch]);

  const users = data?.audienceListCandidatesTable?.rows ?? [];
  const total = data?.audienceListCandidatesTable?.total ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const selectedIds = useMemo(() => new Set(selected.map((u) => u.id)), [selected]);

  // An empty picker means two different things, and the wrong one reads as a
  // broken search: with no search typed, everybody eligible is already in.
  const emptyText = debouncedSearch
    ? t('marketing.targetAudience.noOneMatchesThatSearch')
    : t('marketing.targetAudience.everyoneIsAlreadyInThisList');

  const toggle = (user: PickableUser) =>
    setSelected((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user],
    );

  const close = () => {
    setSelected([]);
    setSearch('');
    setPage(1);
    setError(null);
    onClose();
  };

  const submit = async () => {
    setError(null);
    try {
      await addMembers({ variables: { id: listId, user_ids: selected.map((u) => u.id) } });
    } catch (e) {
      setError(parseApiError(e, t('marketing.targetAudience.couldNotAddThosePeople')));
      return;
    }
    notifySuccess(t('marketing.targetAudience.peopleAddedToTheList'));
    close();
    onAdded();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        {t('marketing.targetAudience.addPeopleToThisList')}
        <DuncitIconButton
          aria-label={t('shell.common.close')}
          onClick={close}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </DuncitIconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('marketing.targetAudience.pickedPeopleStayInTheList')}
          </Typography>

          <TextField
            size="small"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            label={t('marketing.targetAudience.searchByNameEmailOrPhone')}
            slotProps={{
              input: { startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} /> }
            }}
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
            <UserPickList
              users={users}
              selected={selectedIds}
              onToggle={toggle}
              loading={loading}
              emptyText={emptyText}
            />
          </Box>

          {pageCount > 1 && (
            <Stack sx={{
              alignItems: "center"
            }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_e, next) => setPage(next)}
                size="small"
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('marketing.targetAudience.nSelected', { vars: { count: selected.length } })}
        </Typography>
        <Stack direction="row" spacing={1}>
          <DuncitButton onClick={close} disabled={saving}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton
            variant="contained"
            onClick={submit}
            disabled={selected.length === 0 || saving}
          >
            {t('marketing.targetAudience.add')}
          </DuncitButton>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
