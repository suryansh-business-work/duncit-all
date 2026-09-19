import { actionsColumn, dateColumn, type DuncitColumn } from '@duncit/table';
import type { useTranslation } from '@duncit/app-settings';
import { ClampedText, OpenOnNetwork, PlatformCell } from '../SocialCells';
import {
  PLATFORMS,
  PLATFORM_LABEL,
  REVIEW_LABEL,
  SENTIMENT_COLORS,
  SENTIMENT_LABEL,
  SEVERITY_COLORS,
  SEVERITY_LABEL,
  VERDICT_COLORS,
  VERDICT_LABEL,
  enumOptions,
} from '../copy';
import type {
  SocialAccount,
  SocialAiStatus,
  SocialCommentRow,
  SocialReviewStatus,
  SocialSentiment,
  SocialSeverity,
} from '../queries';
import { EnumChip, ReasonCell, ReviewToggle } from './CommentCells';

type Translate = ReturnType<typeof useTranslation>['t'];

const VERDICTS: readonly SocialAiStatus[] = ['FLAGGED', 'PENDING', 'CLEAN'];
const SEVERITIES: readonly SocialSeverity[] = ['HIGH', 'MEDIUM', 'LOW'];
const SENTIMENTS: readonly SocialSentiment[] = ['NEGATIVE', 'NEUTRAL', 'POSITIVE'];
const REVIEWS: readonly SocialReviewStatus[] = ['OPEN', 'REVIEWED'];

interface Args {
  accounts: SocialAccount[];
  onReview: (row: SocialCommentRow, status: SocialReviewStatus) => Promise<void>;
}

/** Every comment read, with the AI's verdict beside it and a way to mark it dealt with. */
export function getCommentColumns({ accounts, onReview }: Readonly<Args>, t: Translate): DuncitColumn<SocialCommentRow>[] {
  const onPost = (row: SocialCommentRow) => (row.post_text ? `${t('marketing.social.colOnPost')}: ${row.post_text}` : null);
  return [
    {
      field: 'text',
      headerName: t('marketing.social.colComment'),
      type: 'text',
      flex: 1,
      minWidth: 260,
      sortable: false,
      filterable: false,
      cellRenderer: (row) => <ClampedText text={row.text} secondary={onPost(row)} />,
      valueGetter: (row) => row.text,
    },
    {
      field: 'author_name',
      headerName: t('marketing.social.colAuthor'),
      type: 'text',
      minWidth: 150,
      sortable: false,
      filterable: false,
      valueGetter: (row) => row.author_name || row.author_handle || t('marketing.social.unknownAuthor'),
    },
    {
      field: 'ai_status',
      headerName: t('marketing.social.colVerdict'),
      type: 'enum',
      width: 150,
      sortable: false,
      options: enumOptions(VERDICTS, VERDICT_LABEL, t),
      cellRenderer: (row) => <EnumChip value={row.ai_status} colors={VERDICT_COLORS} labels={VERDICT_LABEL} t={t} />,
      valueGetter: (row) => t(VERDICT_LABEL[row.ai_status]),
    },
    {
      field: 'ai_severity',
      headerName: t('marketing.social.colSeverity'),
      type: 'enum',
      width: 130,
      sortable: false,
      options: enumOptions(SEVERITIES, SEVERITY_LABEL, t),
      cellRenderer: (row) => <EnumChip value={row.ai_severity} colors={SEVERITY_COLORS} labels={SEVERITY_LABEL} t={t} />,
    },
    {
      field: 'ai_reason',
      headerName: t('marketing.social.colReason'),
      type: 'text',
      minWidth: 240,
      sortable: false,
      filterable: false,
      cellRenderer: (row) => <ReasonCell row={row} t={t} />,
      valueGetter: (row) => row.ai_reason ?? '',
    },
    {
      field: 'ai_sentiment',
      headerName: t('marketing.social.colSentiment'),
      type: 'enum',
      width: 140,
      sortable: false,
      options: enumOptions(SENTIMENTS, SENTIMENT_LABEL, t),
      cellRenderer: (row) => <EnumChip value={row.ai_sentiment} colors={SENTIMENT_COLORS} labels={SENTIMENT_LABEL} t={t} />,
    },
    {
      field: 'account_id',
      headerName: t('marketing.social.colAccount'),
      type: 'enum',
      minWidth: 160,
      sortable: false,
      options: accounts.map((account) => ({ value: account.id, label: account.name })),
      valueGetter: (row) => row.account_name,
    },
    {
      field: 'platform',
      headerName: t('marketing.social.colNetwork'),
      type: 'enum',
      width: 150,
      sortable: false,
      options: enumOptions(PLATFORMS, PLATFORM_LABEL, t),
      cellRenderer: (row) => <PlatformCell platform={row.platform} label={t(PLATFORM_LABEL[row.platform])} />,
      valueGetter: (row) => t(PLATFORM_LABEL[row.platform]),
    },
    dateColumn<SocialCommentRow>({ field: 'published_at', headerName: t('marketing.social.colPublished'), hide: false, width: 170 }),
    {
      field: 'review_status',
      headerName: t('marketing.social.colReview'),
      type: 'enum',
      width: 130,
      sortable: false,
      options: enumOptions(REVIEWS, REVIEW_LABEL, t),
      valueGetter: (row) => t(REVIEW_LABEL[row.review_status]),
    },
    actionsColumn<SocialCommentRow>({
      width: 110,
      renderExtra: (row) => (
        <>
          <ReviewToggle row={row} onReview={onReview} t={t} />
          <OpenOnNetwork href={row.permalink || row.post_permalink} title={t('marketing.social.openComment')} />
        </>
      ),
    }),
  ];
}
