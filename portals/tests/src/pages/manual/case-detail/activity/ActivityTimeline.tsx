import { useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { QueryGuard } from '@duncit/ui';
import { PersonAvatar } from '../../../../components/manual/PersonAvatar';
import { MANUAL_TEST_CASE_ACTIVITY, type ActivityData, type ActivityVariables } from '../../shared/case.queries';
import { manualErrorText } from '../../shared/errors';
import { activityText } from './activityText';

interface Props {
  caseId: string;
}

const WHERE = { page: '/manual/cases/:caseKey', component: 'ActivityTimeline' };

/** The case's history, newest first: who changed what, from what to what, and when. */
export default function ActivityTimeline({ caseId }: Readonly<Props>) {
  const { t } = useTranslation();
  const format = useDateFormat();
  const { data, loading, error, fetchMore } = useQuery<ActivityData, ActivityVariables>(MANUAL_TEST_CASE_ACTIVITY, {
    variables: { id: caseId, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  const rows = data?.manualTestCaseActivity.rows ?? [];
  const remaining = (data?.manualTestCaseActivity.total ?? 0) - rows.length;

  const loadMore = useCallback(async () => {
    try {
      await fetchMore({
        variables: { offset: rows.length },
        updateQuery: (previous, { fetchMoreResult }) => ({
          manualTestCaseActivity: {
            total: fetchMoreResult.manualTestCaseActivity.total,
            rows: [...previous.manualTestCaseActivity.rows, ...fetchMoreResult.manualTestCaseActivity.rows],
          },
        }),
      });
    } catch (err) {
      notifyError(manualErrorText(t, err, t('testsManual.activity.loadFailed'), WHERE));
    }
  }, [fetchMore, rows.length, t]);

  return (
    <QueryGuard loading={loading && !data} error={data ? undefined : error}>
      {rows.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('testsManual.activity.empty')}
        </Typography>
      ) : (
        <Stack component="ol" spacing={2} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {rows.map((entry) => {
            const name = entry.actor.name || t('testsManual.comments.formerStaff');
            const text = activityText(t, entry, name, format);
            return (
              <Stack key={entry.id} component="li" direction="row" spacing={1.5}>
                <PersonAvatar person={{ ...entry.actor, name }} size={4} />
                <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {text.headline}
                  </Typography>
                  {text.detail ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
                      {text.detail}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {format.formatDateTime(entry.created_at)}
                  </Typography>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      )}
      {remaining > 0 ? (
        <DuncitButton size="small" onClick={loadMore} sx={{ alignSelf: 'flex-start', mt: 2 }}>
          {t('testsManual.activity.loadMore', { vars: { count: remaining } })}
        </DuncitButton>
      ) : null}
    </QueryGuard>
  );
}
