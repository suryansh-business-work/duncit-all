import { useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CategoryIcon from '@mui/icons-material/Category';

const CATEGORIES = gql`
  query Categories($filter: CategoryFilterInput) {
    categories(filter: $filter) {
      id
      name
      slug
      icon
      description
      media {
        url
        type
      }
      level
      parent_id
      is_active
      is_system
      sort_order
      updated_at
    }
  }
`;
const CREATE_CATEGORY = gql`
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
    }
  }
`;
const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($category_id: ID!, $input: UpdateCategoryInput!) {
    updateCategory(category_id: $category_id, input: $input) {
      id
    }
  }
`;
const DELETE_CATEGORY = gql`
  mutation DeleteCategory($category_id: ID!) {
    deleteCategory(category_id: $category_id)
  }
`;

type Level = 'SUPER' | 'CATEGORY' | 'SUB';

interface CatItem {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  media: { url: string; type: 'IMAGE' | 'VIDEO' }[];
  level: Level;
  parent_id: string | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
}

interface FormState {
  id?: string;
  name: string;
  icon: string;
  description: string;
  mediaText: string; // newline separated URLs (image)
  sort_order: number;
  is_active: boolean;
}
const blankForm: FormState = {
  name: '',
  icon: '',
  description: '',
  mediaText: '',
  sort_order: 0,
  is_active: true,
};

function ColumnPanel({
  title,
  level,
  parentId,
  parentName,
  selectedId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: {
  title: string;
  level: Level;
  parentId: string | null | undefined; // undefined => disabled
  parentName?: string;
  selectedId: string | null;
  onSelect: (item: CatItem) => void;
  onCreate: () => void;
  onEdit: (item: CatItem) => void;
  onDelete: (item: CatItem) => void;
}) {
  const enabled = level === 'SUPER' || !!parentId;
  const { data, loading, error } = useQuery(CATEGORIES, {
    variables: { filter: { level, parent_id: parentId ?? null } },
    skip: !enabled,
    fetchPolicy: 'cache-and-network',
  });

  const items: CatItem[] = data?.categories ?? [];

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {title}
            </Typography>
            {parentName && (
              <Typography variant="caption" color="text.secondary">
                in <strong>{parentName}</strong>
              </Typography>
            )}
          </Box>
          <Tooltip title={enabled ? `New ${title}` : 'Select a parent first'}>
            <span>
              <IconButton color="primary" onClick={onCreate} disabled={!enabled}>
                <AddIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </CardContent>
      <Divider />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {!enabled ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Select a {level === 'CATEGORY' ? 'super category' : 'category'} on the left.
            </Typography>
          </Box>
        ) : loading && items.length === 0 ? (
          <Stack alignItems="center" sx={{ p: 4 }}>
            <CircularProgress size={24} />
          </Stack>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {error.message}
          </Alert>
        ) : items.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No items yet. Click + to create one.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {items.map((it) => (
              <ListItemButton
                key={it.id}
                selected={selectedId === it.id}
                onClick={() => onSelect(it)}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    mr: 1.5,
                    bgcolor: 'primary.main',
                    fontSize: 16,
                  }}
                  src={it.media[0]?.url}
                >
                  {it.icon || it.name[0]}
                </Avatar>
                <ListItemText
                  primary={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" fontWeight={500}>
                        {it.name}
                      </Typography>
                      {it.is_system && (
                        <Chip label="system" size="small" sx={{ height: 16, fontSize: 10 }} />
                      )}
                      {!it.is_active && (
                        <Chip
                          label="inactive"
                          size="small"
                          color="warning"
                          sx={{ height: 16, fontSize: 10 }}
                        />
                      )}
                    </Stack>
                  }
                  secondary={
                    it.description
                      ? it.description.slice(0, 50) + (it.description.length > 50 ? '…' : '')
                      : undefined
                  }
                />
                <Stack direction="row">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(it);
                    }}
                  >
                    <EditIcon fontSize="inherit" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={it.is_system}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(it);
                    }}
                  >
                    <DeleteIcon fontSize="inherit" />
                  </IconButton>
                  {level !== 'SUB' && <ChevronRightIcon fontSize="small" />}
                </Stack>
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Card>
  );
}

export default function CategoriesPage() {
  const [superSel, setSuperSel] = useState<CatItem | null>(null);
  const [catSel, setCatSel] = useState<CatItem | null>(null);

  const [dialog, setDialog] = useState<{
    open: boolean;
    level: Level;
    parentId: string | null;
    form: FormState;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [createMut] = useMutation(CREATE_CATEGORY);
  const [updateMut] = useMutation(UPDATE_CATEGORY);
  const [deleteMut] = useMutation(DELETE_CATEGORY);

  const refetchQueries = useMemo(
    () => [
      { query: CATEGORIES, variables: { filter: { level: 'SUPER', parent_id: null } } },
      ...(superSel
        ? [
            {
              query: CATEGORIES,
              variables: { filter: { level: 'CATEGORY', parent_id: superSel.id } },
            },
          ]
        : []),
      ...(catSel
        ? [{ query: CATEGORIES, variables: { filter: { level: 'SUB', parent_id: catSel.id } } }]
        : []),
    ],
    [superSel, catSel]
  );

  const openCreate = (level: Level, parentId: string | null) => {
    setOpError(null);
    setDialog({ open: true, level, parentId, form: { ...blankForm } });
  };
  const openEdit = (level: Level, parentId: string | null, item: CatItem) => {
    setOpError(null);
    setDialog({
      open: true,
      level,
      parentId,
      form: {
        id: item.id,
        name: item.name,
        icon: item.icon ?? '',
        description: item.description ?? '',
        mediaText: item.media.map((m) => m.url).join('\n'),
        sort_order: item.sort_order,
        is_active: item.is_active,
      },
    });
  };

  const submit = async () => {
    if (!dialog) return;
    setBusy(true);
    setOpError(null);
    try {
      const media = dialog.form.mediaText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((url) => ({ url, type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE' }));

      if (dialog.form.id) {
        await updateMut({
          variables: {
            category_id: dialog.form.id,
            input: {
              name: dialog.form.name,
              icon: dialog.form.icon,
              description: dialog.form.description,
              media,
              sort_order: dialog.form.sort_order,
              is_active: dialog.form.is_active,
            },
          },
          refetchQueries,
        });
      } else {
        await createMut({
          variables: {
            input: {
              name: dialog.form.name,
              level: dialog.level,
              parent_id: dialog.parentId,
              icon: dialog.form.icon,
              description: dialog.form.description,
              media,
              sort_order: dialog.form.sort_order,
            },
          },
          refetchQueries,
        });
      }
      setToast('Saved');
      setDialog(null);
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (level: Level, item: CatItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteMut({ variables: { category_id: item.id }, refetchQueries });
      if (level === 'SUPER' && superSel?.id === item.id) {
        setSuperSel(null);
        setCatSel(null);
      }
      if (level === 'CATEGORY' && catSel?.id === item.id) setCatSel(null);
      setToast('Deleted');
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <Stack spacing={3} sx={{ height: 'calc(100vh - 140px)' }}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CategoryIcon color="primary" />
          <Typography variant="h5">Category Management</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Manage Super Categories (Human / Pet), their categories and sub-categories. Click an
          item to drill down.
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 2,
          minHeight: 0,
        }}
      >
        <ColumnPanel
          title="Super Categories"
          level="SUPER"
          parentId={null}
          selectedId={superSel?.id ?? null}
          onSelect={(it) => {
            setSuperSel(it);
            setCatSel(null);
          }}
          onCreate={() => openCreate('SUPER', null)}
          onEdit={(it) => openEdit('SUPER', null, it)}
          onDelete={(it) => remove('SUPER', it)}
        />
        <ColumnPanel
          title="Categories"
          level="CATEGORY"
          parentId={superSel?.id}
          parentName={superSel?.name}
          selectedId={catSel?.id ?? null}
          onSelect={(it) => setCatSel(it)}
          onCreate={() => superSel && openCreate('CATEGORY', superSel.id)}
          onEdit={(it) => superSel && openEdit('CATEGORY', superSel.id, it)}
          onDelete={(it) => remove('CATEGORY', it)}
        />
        <ColumnPanel
          title="Sub-Categories"
          level="SUB"
          parentId={catSel?.id}
          parentName={catSel?.name}
          selectedId={null}
          onSelect={() => undefined}
          onCreate={() => catSel && openCreate('SUB', catSel.id)}
          onEdit={(it) => catSel && openEdit('SUB', catSel.id, it)}
          onDelete={(it) => remove('SUB', it)}
        />
      </Box>

      {/* Edit / create dialog */}
      <Dialog
        open={!!dialog?.open}
        onClose={() => setDialog(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dialog?.form.id ? 'Edit' : 'New'}{' '}
          {dialog?.level === 'SUPER'
            ? 'Super Category'
            : dialog?.level === 'CATEGORY'
            ? 'Category'
            : 'Sub-Category'}
        </DialogTitle>
        <DialogContent>
          {dialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Name"
                value={dialog.form.name}
                onChange={(e) =>
                  setDialog({ ...dialog, form: { ...dialog.form, name: e.target.value } })
                }
                fullWidth
                required
              />
              <TextField
                label="Icon (emoji or short code)"
                value={dialog.form.icon}
                onChange={(e) =>
                  setDialog({ ...dialog, form: { ...dialog.form, icon: e.target.value } })
                }
                helperText="Example: 🏏 or 'cricket'"
                fullWidth
              />
              <TextField
                label="Description"
                value={dialog.form.description}
                onChange={(e) =>
                  setDialog({
                    ...dialog,
                    form: { ...dialog.form, description: e.target.value },
                  })
                }
                multiline
                minRows={2}
                fullWidth
              />
              <TextField
                label="Images & Videos (one URL per line)"
                value={dialog.form.mediaText}
                onChange={(e) =>
                  setDialog({
                    ...dialog,
                    form: { ...dialog.form, mediaText: e.target.value },
                  })
                }
                multiline
                minRows={3}
                helperText="URLs ending in .mp4/.mov/.webm are stored as VIDEO, others as IMAGE."
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Sort order"
                  type="number"
                  value={dialog.form.sort_order}
                  onChange={(e) =>
                    setDialog({
                      ...dialog,
                      form: { ...dialog.form, sort_order: Number(e.target.value) || 0 },
                    })
                  }
                  sx={{ maxWidth: 160 }}
                />
                {dialog.form.id && (
                  <TextField
                    label="Status"
                    select
                    value={dialog.form.is_active ? 'active' : 'inactive'}
                    onChange={(e) =>
                      setDialog({
                        ...dialog,
                        form: { ...dialog.form, is_active: e.target.value === 'active' },
                      })
                    }
                    sx={{ minWidth: 160 }}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </TextField>
                )}
              </Stack>
              {opError && <Alert severity="error">{opError}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={busy || !dialog?.form.name?.trim()}
          >
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}

