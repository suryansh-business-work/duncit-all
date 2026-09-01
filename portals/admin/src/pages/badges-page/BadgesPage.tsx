import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import {
  BADGES,
  BADGE_CATEGORIES,
  BADGE_ROLES,
  CREATE_BADGE,
  DELETE_BADGE,
  UPDATE_BADGE,
  emptyBadge,
  type BadgeForm,
} from './queries';
import BadgeCard from './BadgeCard';
import BadgeFormDialog from './BadgeFormDialog';

/** Admin > Badges — the catalogue every member's Badges section renders from.
 * A badge states a goal and the condition that measures it; the seed ships the
 * platform's own badges and everything here is editable on top of them. */
export default function BadgesPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<any>(BADGES);
  const { data: categoryData } = useQuery<any>(BADGE_CATEGORIES);
  const { data: roleData } = useQuery<any>(BADGE_ROLES);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BadgeForm>(emptyBadge);
  const [createBadge, createState] = useMutation<any>(CREATE_BADGE);
  const [updateBadge, updateState] = useMutation<any>(UPDATE_BADGE);
  const [deleteBadge] = useMutation<any>(DELETE_BADGE);
  const confirm = useConfirm();
  const busy = createState.loading || updateState.loading;

  const startCreate = () => {
    setForm(emptyBadge);
    setOpen(true);
  };
  const startEdit = (b: any) => {
    setForm({
      id: b.id,
      title: b.title,
      description: b.description,
      image_url: b.image_url,
      condition_type: b.condition_type,
      threshold: b.threshold,
      category_id: b.category_id ?? '',
      role_key: b.role_key ?? '',
      sort_order: b.sort_order ?? 0,
      is_active: b.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    const { id, category_id, ...rest } = form;
    // An empty select means "no category", which the server stores as null —
    // sending '' would be cast to an ObjectId and blow up on the way in.
    const input = { ...rest, category_id: category_id || null };
    if (id) {
      await updateBadge({ variables: { id, input } });
    } else {
      await createBadge({ variables: { input } });
    }
    setOpen(false);
    await refetch();
  };

  const remove = async (b: any) => {
    const ok = await confirm({
      title: t('admin.badgesPage.deleteBadge'),
      message: t('admin.badgesPage.deleteConfirm', { vars: { title: b.title } }),
      destructive: true,
      confirmLabel: t('shell.common.delete'),
    });
    if (!ok) return;
    await deleteBadge({ variables: { id: b.id } });
    await refetch();
  };

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('admin.badgesPage.title')}
        </Typography>
        <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={startCreate}>
          {t('admin.badgesPage.newBadge')}
        </DuncitButton>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}
      {loading && !data && <CircularProgress />}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
        }}
      >
        {(data?.badges ?? []).map((b: any) => (
          <BadgeCard key={b.id} badge={b} onEdit={startEdit} onRemove={remove} />
        ))}
      </Box>

      <BadgeFormDialog
        open={open}
        form={form}
        setForm={setForm}
        busy={busy}
        categories={categoryData?.categories ?? []}
        roles={roleData?.roles ?? []}
        onClose={() => setOpen(false)}
        onSave={save}
      />
    </Box>
  );
}
