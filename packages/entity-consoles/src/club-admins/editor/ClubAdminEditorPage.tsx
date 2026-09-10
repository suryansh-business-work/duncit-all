import { Grid, Stack, Typography } from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import GroupsIcon from '@mui/icons-material/Groups';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useParams } from 'react-router';
import { RhfTextField } from '@duncit/forms';
import { RhfAdminCategory } from '@duncit/category';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import SectionCard from '../../venues/detail/SectionCard';
import AccountPicker from '../../shared/AccountPicker';
import EditorPageShell from '../../shared/EditorPageShell';
import StatusFields from '../../shared/StatusFields';
import useMediaPicker from '../../shared/useMediaPicker';
import { useClubAdminEditor } from './useClubAdminEditor';
import AssignClubsField from './AssignClubsField';
import { clubAdminStatusOptions } from './statusOptions';

/**
 * `/club-admins/new` and `/club-admins/:clubAdminId/edit`.
 *
 * Short enough to hold its three sections inline rather than in a folder: who
 * they are, the clubs they run, and the decision. The frame, the account picker
 * and the status block are the shared ones the venue and host editors use.
 *
 * The picker is still mounted for the media dialog the shell owns — no field here
 * uploads anything, but the shell takes one bridge and giving it a real one is
 * cheaper than making it optional for a single caller.
 */
export default function ClubAdminEditorPage() {
  const { t } = useTranslation();
  const { clubAdminId = '' } = useParams<{ clubAdminId: string }>();
  const picker = useMediaPicker('/club-admins');
  const editor = useClubAdminEditor(clubAdminId);
  const { form, admin, isEdit, canGovern, busy, saveError, submit } = editor;

  const backTo = isEdit && clubAdminId ? `/club-admins/${clubAdminId}` : '/club-admins';
  const title = isEdit
    ? admin?.full_name || t('directory.clubAdminEditor.editTitle')
    : t('directory.clubAdminEditor.newTitle');
  const eyebrow = isEdit
    ? t('directory.clubAdminEditor.eyebrowEdit')
    : t('directory.clubAdminEditor.eyebrowNew');

  return (
    <QueryGuard
      loading={editor.loading}
      error={editor.error}
      errorText={editor.error?.message}
      notFound={isEdit && !admin}
      notFoundText={t('directory.clubAdmins.notFound')}
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => (
        <EditorPageShell
          eyebrow={eyebrow}
          title={title}
          backTo={backTo}
          saveLabel={t('directory.clubAdminEditor.save')}
          busy={busy}
          error={saveError}
          onSubmit={form.handleSubmit(submit)}
          picker={picker}
        >
          <SectionCard
            icon={<BadgeIcon color="primary" />}
            title={t('directory.hostEditor.identity')}
          >
            <Stack spacing={1.5}>
              {isEdit ? (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('directory.clubAdminEditor.accountLocked')}
                </Typography>
              ) : (
                <AccountPicker
                  control={form.control}
                  name="user_id"
                  label={t('directory.hostEditor.account')}
                  hint={t('directory.clubAdminEditor.accountHint')}
                  onPicked={(account) => {
                    form.setValue('full_name', account.full_name ?? '', { shouldValidate: true });
                    form.setValue('email', account.email ?? '', { shouldValidate: true });
                    form.setValue('phone', account.phone_number ?? '', { shouldValidate: true });
                  }}
                />
              )}

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <RhfTextField
                    control={form.control}
                    name="full_name"
                    label={t('directory.hostEditor.fullName')}
                    size="small"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <RhfTextField
                    control={form.control}
                    name="email"
                    label={t('directory.clubAdmins.email')}
                    size="small"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <RhfTextField
                    control={form.control}
                    name="phone"
                    label={t('directory.clubAdmins.phone')}
                    size="small"
                  />
                </Grid>
              </Grid>

              <RhfAdminCategory
                control={form.control}
                name="category"
                legend={t('directory.clubAdmins.category')}
                hint={t('directory.clubAdminEditor.categoryHint')}
              />
            </Stack>
          </SectionCard>

          <SectionCard
            icon={<GroupsIcon color="primary" />}
            title={t('directory.clubAdmins.assignedClubs')}
          >
            <AssignClubsField control={form.control} clubAdminId={clubAdminId} />
          </SectionCard>

          <SectionCard
            icon={<VerifiedIcon color="primary" />}
            title={t('directory.hostEditor.statusAndMoney')}
          >
            <StatusFields
              control={form.control}
              statusName="status"
              activeName="is_active"
              statusLabel={t('directory.venueEditor.status')}
              options={clubAdminStatusOptions(t)}
              activeLabel={t('directory.clubAdminEditor.isActive')}
              deactivateWarning={t('directory.clubAdminEditor.deactivateWarning')}
              canGovern={canGovern}
              governedByNote={t('directory.venueEditor.governedBy')}
              extraFields={
                <Grid size={{ xs: 12, md: 4 }}>
                  <RhfTextField
                    control={form.control}
                    name="commission_pct"
                    label={t('directory.clubAdmins.commission')}
                    size="small"
                    type="number"
                    disabled={!canGovern}
                    hint={t('directory.clubAdminEditor.commissionHint')}
                  />
                </Grid>
              }
            />
          </SectionCard>
        </EditorPageShell>
      )}
    </QueryGuard>
  );
}
