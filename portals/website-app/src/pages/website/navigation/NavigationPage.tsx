import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Tab, Tabs, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useApolloTableFetch } from '@duncit/table';
import NavItemDialog, { type NavItemValues } from './NavItemDialog';
import NavigationTable from './NavigationTable';
import {
  CREATE_NAV_ITEM, DELETE_NAV_ITEM, NAV_SITES, UPDATE_NAV_ITEM, WEBSITE_NAV_TABLE,
  type WebsiteNavItem, type WebsiteNavSite,
} from './queries';

/** Marketing-website navigation manager — the sites bake these links in at
 * build time (a redeploy picks up changes). */
export default function NavigationPage() {
  const [site, setSite] = useState<WebsiteNavSite>('MAIN');
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const refetchTable = () => refetchRef.current?.();
  const [createItem] = useMutation(CREATE_NAV_ITEM, { onCompleted: refetchTable });
  const [updateItem] = useMutation(UPDATE_NAV_ITEM, { onCompleted: refetchTable });
  const [deleteItem] = useMutation(DELETE_NAV_ITEM, { onCompleted: refetchTable });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteNavItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WebsiteNavItem | null>(null);

  // Scope the shared websiteNavTable query to the active site tab.
  const fetchRows = useApolloTableFetch<WebsiteNavItem>(
    client,
    WEBSITE_NAV_TABLE,
    'websiteNavTable',
    { extraFilters: [{ field: 'site', op: 'eq', value: site }] },
    [site],
  );

  const openEdit = useCallback((item: WebsiteNavItem) => {
    setEditing(item);
    setDialogOpen(true);
  }, []);

  const askDelete = useCallback((item: WebsiteNavItem) => {
    setConfirmDelete(item);
  }, []);

  const save = async (values: NavItemValues) => {
    if (editing) await updateItem({ variables: { id: editing.id, input: values } });
    else await createItem({ variables: { input: values } });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Website Navigation
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Header + footer links for every marketing website. Changes go live on the next site deploy.
      </Typography>
      <Tabs value={site} onChange={(_e, next) => setSite(next)} variant="scrollable">
        {NAV_SITES.map((s) => (
          <Tab key={s.value} value={s.value} label={s.label} />
        ))}
      </Tabs>
      {/* key remounts the table so the tab switch resets paging onto the new site. */}
      <NavigationTable
        key={site}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            Add link
          </Button>
        }
        onEdit={openEdit}
        onDelete={askDelete}
      />

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
              if (confirmDelete) {
                deleteItem({ variables: { id: confirmDelete.id } }).catch(() => undefined);
              }
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
