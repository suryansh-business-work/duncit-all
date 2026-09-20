import { Box, Stack } from '@mui/material';
import { actionsColumn, dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { useTranslation } from '@duncit/app-settings';
import { ClampedText, OpenOnNetwork, PlatformCell } from '../SocialCells';
import { PLATFORMS, PLATFORM_LABEL, enumOptions } from '../copy';
import type { SocialAccount, SocialPostRow } from '../queries';

type Translate = ReturnType<typeof useTranslation>['t'];

const THUMB = 40;

/** The post's picture (or the dash) beside the start of its text. */
function PostCell({ row }: Readonly<{ row: SocialPostRow }>) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, height: '100%' }}>
      {row.media_url ? (
        <Box component="img" src={row.media_url} alt="" loading="lazy" sx={{ width: THUMB, height: THUMB, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }} />
      ) : null}
      <ClampedText text={row.text} />
    </Stack>
  );
}

/** Every post read from the connected accounts, with its latest numbers. */
export function getPostColumns(accounts: SocialAccount[], t: Translate, locale: string): DuncitColumn<SocialPostRow>[] {
  const count = (value: number | null) => (value === null ? EM_DASH : value.toLocaleString(locale));
  return [
    {
      field: 'text',
      headerName: t('marketing.social.colPost'),
      type: 'text',
      flex: 1,
      minWidth: 280,
      sortable: false,
      filterable: false,
      cellRenderer: (row) => <PostCell row={row} />,
      valueGetter: (row) => row.text ?? '',
    },
    {
      field: 'account_id',
      headerName: t('marketing.social.colAccount'),
      minWidth: 170,
      type: 'enum',
      options: accounts.map((account) => ({ value: account.id, label: account.name })),
      sortable: false,
      valueGetter: (row) => row.account_name,
    },
    {
      field: 'platform',
      headerName: t('marketing.social.colNetwork'),
      width: 150,
      type: 'enum',
      options: enumOptions(PLATFORMS, PLATFORM_LABEL, t),
      sortable: false,
      cellRenderer: (row) => <PlatformCell platform={row.platform} label={t(PLATFORM_LABEL[row.platform])} />,
      valueGetter: (row) => t(PLATFORM_LABEL[row.platform]),
    },
    dateColumn<SocialPostRow>({ field: 'published_at', headerName: t('marketing.social.colPublished'), hide: false, width: 170 }),
    { field: 'likes', headerName: t('marketing.social.colLikes'), type: 'number', width: 100, valueGetter: (row) => count(row.likes) },
    { field: 'comments', headerName: t('marketing.social.colComments'), type: 'number', width: 120, valueGetter: (row) => count(row.comments) },
    { field: 'shares', headerName: t('marketing.social.colShares'), type: 'number', width: 100, valueGetter: (row) => count(row.shares) },
    { field: 'views', headerName: t('marketing.social.colViews'), type: 'number', width: 100, filterable: false, valueGetter: (row) => count(row.views) },
    { field: 'engagement', headerName: t('marketing.social.colEngagement'), type: 'number', width: 130, valueGetter: (row) => count(row.engagement) },
    {
      field: 'engagement_rate',
      headerName: t('marketing.social.colEngagementRate'),
      type: 'number',
      width: 130,
      sortable: false,
      filterable: false,
      valueGetter: (row) => `${row.engagement_rate.toLocaleString(locale, { maximumFractionDigits: 2 })}%`,
    },
    {
      field: 'ai_score',
      headerName: t('marketing.social.colAiScore'),
      type: 'number',
      width: 110,
      filterable: false,
      valueGetter: (row) => row.ai_score ?? EM_DASH,
    },
    actionsColumn<SocialPostRow>({
      width: 80,
      renderExtra: (row) => <OpenOnNetwork href={row.permalink} title={t('marketing.social.openPost')} />,
    }),
  ];
}
