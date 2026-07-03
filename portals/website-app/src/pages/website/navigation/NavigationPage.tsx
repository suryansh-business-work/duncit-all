import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Stack, Tab, Table, TableBody, TableCell,
  TableHead, TableRow, Tabs, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { parseApiError } from '../../../utils/parseApiError';
import NavItemDialog, { type NavItemValues } from './NavItemDialog';
import {
  CREATE_NAV_ITEM, DELETE_NAV_ITEM, NAV_SITES, UPDATE_NAV_ITEM, WEBSITE_NAV,
  type WebsiteNavItem, type WebsiteNavSite,
} from './queries';

/** Marketing-website navigation manager — the sites bake these links in at
 * build time (a redeploy picks up changes). */
export default function NavigationPage() {
  const [site, setSite] = useState<WebsiteNavSite>('MAIN');
  const { data, loading, error, refetch } = useQuery<{ websiteNav: WebsiteNavItem[] }>(WEBSITE_NAV, {
    variables: { site },
    fetchPolicy: 'cache-and-network',
  });
  const [createItem] = useMutation(CREATE_NAV_ITEM, { onCompleted: () => refetch() });
  const [updateItem] = useMutation(UPDATE_NAV_ITEM, { onCompleted: () => refetch() });
  const [deleteItem] = useMutation(DELETE_NAV_ITEM, { onCompleted: () => refetch() });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteNavItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WebsiteNavItem | null>(null);

  const rows = data?.websiteNav ?? [];

  const save = async (values: NavItemValues) => {
    if (editing) await updateItem({ variables: { id: editing.id, input: values } });
    else await createItem({ variables: { input: values } });
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" fontWeight={700}>
          Website Navigation
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Add link
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Header + footer links for every marketing website. Changes go live on the next site deploy.
      </Typography>
      <Card>
        <CardContent>
          <Tabs value={site} onChange={(_e, next) => setSite(next)} sx={{ mb: 2 }} variant="scrollable">
            {NAV_SITES.map((s) => (
              <Tab key={s.value} value={s.value} label={s.label} />
            ))}
          </Tabs>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {error && <Typography color="error">{parseApiError(error)}</Typography>}
          {!loading && !error && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Area</TableCell>
                  <TableCell>Group</TableCell>
                  <TableCell>Label</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Order</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.area}</TableCell>
                    <TableCell>{r.group_label || '—'}</TableCell>
                    <TableCell>{r.label}</TableCell>
                    <TableCell sx={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.url}
                    </TableCell>
                    <TableCell>{r.sort_order}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.is_active ? 'Active' : 'Hidden'} color={r.is_active ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label="edit"
                        onClick={() => {
                          setEditing(r);
                          setDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" aria-label="delete" onClick={() => setConfirmDelete(r)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No links for this site yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NavItemDialog
        open={dialogOpen}
        item={editing}
        defaultSite={site}
        onClose={() => setDialogOpen(false)}
        onSave={save}
      />

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete this link?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            "{confirmDelete?.label}" will disappear from {confirmDelete?.site} on the next deploy.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (confirmDelete) void deleteItem({ variables: { id: confirmDelete.id } });
              setConfirmDelete(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
