import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Chip, Stack, Typography } from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { BackHeader, QueryGuard } from '@duncit/ui';
import AudienceTable from './AudienceTable';
import RemoveMemberDialog from './RemoveMemberDialog';
import { AddUsersDialog } from './add-users-dialog';
import { AUDIENCE_LIST, AUDIENCE_LIST_MEMBERS_TABLE } from './queries';
import type { AudienceListRow, AudienceRow } from './helpers';

const criterionLabel = (f: AudienceListRow['filters'][number]) => {
  const detail = f.values.length > 0 ? f.values.join(', ') : f.value;
  return detail ? `${f.field}: ${detail}` : f.field;
};

/** Who is in a saved list right now — the criteria re-run, plus anyone added by
 * hand, minus anyone removed by hand. The server resolves all three, so this
 * page reads one query rather than re-applying the stored filters itself. */
export default function AudienceListDetailPage() {
  const { t } = useTranslation();
  const { listId = '' } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat();
  const refetchRef = useRef<(() => void) | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<AudienceRow | null>(null);

  const { data, loading, error } = useQuery<{ audienceList: AudienceListRow | null }>(AUDIENCE_LIST, {
    variables: { id: listId },
    fetchPolicy: 'cache-and-network',
    skip: !listId,
  });
  const list = data?.audienceList;

  const fetchRows = useApolloTableFetch<AudienceRow>(
    client,
    AUDIENCE_LIST_MEMBERS_TABLE,
    'audienceListMembersTable',
    { extraVariables: { list_id: listId } },
    [listId],
  );
  // Stable so the memo below — and the columns it builds — survive a repaint.
  const onRemove = useCallback((row: AudienceRow) => setRemoving(row), []);
  const columnDeps = useMemo(
    () => ({ formatDate: formatDateTime, onRemove }),
    [formatDateTime, onRemove],
  );

  // Only the rows need asking for again: both member mutations return the list
  // with its counts, which Apollo normalises straight into the chips above.
  const onMembersChanged = () => refetchRef.current?.();

  return (
    <QueryGuard
      loading={loading && !data}
      error={error}
      errorText={error?.message}
      notFound={!list}
      notFoundText="That audience list no longer exists."
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => (
        <Stack spacing={2}>
          <BackHeader
            onBack={() => navigate('/audience')}
            backAriaLabel="Back to audience lists"
            eyebrow={`Owned by ${list!.owner}`}
            title={list!.name}
          />

          {list!.description && (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {list!.description}
            </Typography>
          )}

          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            sx={{
              flexWrap: "wrap",
              alignItems: "center"
            }}>
            <Chip
              size="small"
              color="primary"
              label={`${list!.member_count.toLocaleString()} people right now`}
            />
            {list!.manual_member_count > 0 && (
              <Chip
                size="small"
                variant="outlined"
                label={t('marketing.targetAudience.nAddedByHand', {
                  vars: { count: list!.manual_member_count },
                })}
              />
            )}
            {/* A removal is otherwise invisible: the count simply drops, and
                nobody can tell the list is holding people out. */}
            {list!.excluded_member_count > 0 && (
              <Chip
                size="small"
                variant="outlined"
                label={t('marketing.targetAudience.nRemovedByHand', {
                  vars: { count: list!.excluded_member_count },
                })}
              />
            )}
            {list!.filters.length === 0 && <Chip size="small" variant="outlined" label={t('marketing.targetAudience.noFiltersEveryone')} />}
            {list!.filters.map((f) => (
              <Chip key={`${f.field}-${f.op}`} size="small" variant="outlined" label={criterionLabel(f)} />
            ))}
          </Stack>

          <Stack direction="row" sx={{
            justifyContent: "flex-end"
          }}>
            <DuncitButton
              variant="contained"
              startIcon={<PersonAddAlt1Icon />}
              onClick={() => setAdding(true)}
            >
              {t('marketing.targetAudience.addUser')}
            </DuncitButton>
          </Stack>

          <AudienceTable fetchRows={fetchRows} columnDeps={columnDeps} refetchRef={refetchRef} />

          <AddUsersDialog
            open={adding}
            listId={listId}
            onClose={() => setAdding(false)}
            onAdded={onMembersChanged}
          />

          {removing && (
            <RemoveMemberDialog
              listId={listId}
              member={removing}
              onClose={() => setRemoving(null)}
              onRemoved={onMembersChanged}
            />
          )}
        </Stack>
      )}
    </QueryGuard>
  );
}
