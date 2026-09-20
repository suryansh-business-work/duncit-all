import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  ANALYZE_SOCIAL_COMMENTS,
  REVIEW_SOCIAL_COMMENT,
  SOCIAL_COMMENTS_TABLE,
  type SocialAccount,
  type SocialAnalysisResult,
  type SocialCommentRow,
  type SocialReviewStatus,
} from '../queries';
import { getCommentColumns } from './commentColumns';

type View = 'attention' | 'all';

const getRowId = (row: SocialCommentRow) => row.id;

/** The queue a person works through: flagged and not yet reviewed. */
const ATTENTION_FILTERS = [
  { field: 'ai_status', op: 'eq' as const, value: 'FLAGGED' },
  { field: 'review_status', op: 'eq' as const, value: 'OPEN' },
];

interface Props {
  accounts: SocialAccount[];
  /** Re-reads the accounts, whose "to review" counts a review changes. */
  onChanged: () => void;
}

/**
 * Comments across every connected account, with the AI's read of each. Opens
 * on "Needs attention" — flagged and not yet reviewed — because that is the
 * part of the list somebody has to act on.
 */
export default function MonitoringTab({ accounts, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [view, setView] = useState<View>('attention');
  const [reviewMut] = useMutation(REVIEW_SOCIAL_COMMENT);
  const [analyzeMut] = useMutation<{ analyzeSocialComments: SocialAnalysisResult }>(ANALYZE_SOCIAL_COMMENTS);
  const needsAttention = accounts.reduce((total, account) => total + account.flagged_open, 0);

  const fetchRows = useApolloTableFetch<SocialCommentRow>(
    client,
    SOCIAL_COMMENTS_TABLE,
    'socialCommentsTable',
    { extraFilters: view === 'attention' ? ATTENTION_FILTERS : [] },
    [view]
  );

  const refresh = useCallback(() => {
    refetchRef.current?.();
    onChanged();
  }, [onChanged]);

  const review = useCallback(
    async (row: SocialCommentRow, status: SocialReviewStatus) => {
      try {
        await reviewMut({ variables: { id: row.id, status } });
        refresh();
      } catch (error) {
        notify(parseApiError(error), 'error');
      }
    },
    [reviewMut, refresh]
  );

  const analyze = async () => {
    try {
      const { data } = await analyzeMut();
      const result = data?.analyzeSocialComments;
      if (result?.error) {
        notify(t('marketing.social.analysisStopped', { vars: { reason: result.error } }), 'warning');
      } else {
        const vars = { analyzed: String(result?.analyzed ?? 0), flagged: String(result?.flagged ?? 0) };
        notify(t('marketing.social.analysedToast', { vars }), 'success');
      }
      refresh();
    } catch (error) {
      notify(parseApiError(error), 'error');
    }
  };

  const columns = useMemo(() => getCommentColumns({ accounts, onReview: review }, t), [accounts, review, t]);
  const emptyText = view === 'attention' ? t('marketing.social.nothingNeedsAttention') : t('marketing.social.noComments');

  return (
    <Stack spacing={2} data-testid="social-monitoring">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(_event, next: View | null) => {
            if (next) setView(next);
          }}
          aria-label={t('marketing.social.commentsShown')}
          data-testid="social-monitoring-view"
        >
          <ToggleButton value="attention">{`${t('marketing.social.needsAttention')} (${needsAttention})`}</ToggleButton>
          <ToggleButton value="all">{t('marketing.social.allComments')}</ToggleButton>
        </ToggleButtonGroup>
        <DuncitButton variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={analyze} data-testid="social-analyse">
          {t('marketing.social.analyse')}
        </DuncitButton>
      </Stack>

      <DuncitTable<SocialCommentRow>
        key={view}
        ariaLabel={t('marketing.social.tabMonitoring')}
        tableId="marketing-social-comments"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        refetchRef={refetchRef}
        emptyText={emptyText}
        searchPlaceholder={t('marketing.social.searchComments')}
        defaultSort={{ field: 'published_at', dir: 'desc' }}
      />
    </Stack>
  );
}
