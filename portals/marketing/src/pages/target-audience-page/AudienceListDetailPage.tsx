import { useMemo, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Chip, Stack, Typography } from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { BackHeader, QueryGuard } from '@duncit/ui';
import AudienceTable from './AudienceTable';
import { AddUsersDialog } from './add-users-dialog';
import { AUDIENCE_LIST, AUDIENCE_LIST_MEMBERS_TABLE } from './queries';
import type { AudienceListRow, AudienceRow } from './helpers';

const criterionLabel = (f: AudienceListRow['filters'][number]) => {
  const detail = f.values.length > 0 ? f.values.join(', ') : f.value;
  return detail ? `${f.field}: ${detail}` : f.field;
};

/** Who is in a saved list right now — the criteria re-run, plus anyone added by
 * hand. The server unions the two, so this page reads one query rather than
 * re-applying the stored filters itself. */
export default function AudienceListDetailPage() {
  const { t } = useTranslation();
  const { listId = '' } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat();
  const refetchRef = useRef<(() => void) | null>(null);
  const [adding, setAdding] = useState(false);

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
  const columnDeps = useMemo(() => ({ formatDate: formatDateTime }), [formatDateTime]);

  // Only the rows need asking for again: the mutation returns the list with its
  // two counts, which Apollo normalises straight into the chips above.
  const onAdded = () => refetchRef.current?.();

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
            {list!.filters.length === 0 && <Chip size="small" variant="outlined" label={t('marketing.targetAudience.noFiltersEveryone')} />}
            {list!.filters.map((f) => (
              <Chip key={`${f.field}-${f.op}`} size="small" variant="outlined" label={criterionLabel(f)} />
            ))}
          </Stack>

          <Stack direction="row" sx={{
            justifyContent: "flex-end"
          }}>
            <Button
              variant="contained"
              startIcon={<PersonAddAlt1Icon />}
              onClick={() => setAdding(true)}
            >
              {t('marketing.targetAudience.addUser')}
            </Button>
          </Stack>

          <AudienceTable fetchRows={fetchRows} columnDeps={columnDeps} refetchRef={refetchRef} />

          <AddUsersDialog
            open={adding}
            listId={listId}
            onClose={() => setAdding(false)}
            onAdded={onAdded}
          />
        </Stack>
      )}
    </QueryGuard>
  );
}
