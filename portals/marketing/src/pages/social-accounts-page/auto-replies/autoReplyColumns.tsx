import { Chip } from '@mui/material';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import type { Translate } from '@duncit/shell';
import { ClampedText } from '../SocialCells';
import { KIND_LABEL } from '../auto-reply-rule-form';
import type { SocialAutoReplyRule } from './autoReply.queries';

/** One row per rule: what it answers, what it listens for, where, and how it has been doing. */
export function getAutoReplyColumns(t: Translate): DuncitColumn<SocialAutoReplyRule>[] {
  const fixed = { sortable: false, filterable: false } as const;
  const accounts = (row: SocialAutoReplyRule) =>
    row.account_ids.length === 0 ? t('marketing.autoReplies.allAccounts') : t('marketing.autoReplies.accountCount', { vars: { count: row.account_ids.length } });
  const yesNo = (value: boolean) => (value ? t('shell.common.yes') : t('shell.common.no'));
  return [
    {
      field: 'name',
      headerName: t('marketing.autoReplies.colName'),
      type: 'text',
      flex: 1,
      minWidth: 240,
      filterable: false,
      cellRenderer: (row) => <ClampedText text={row.name} secondary={row.reply_text} />,
      valueGetter: (row) => row.name,
    },
    {
      field: 'kind',
      headerName: t('marketing.autoReplies.colKind'),
      type: 'text',
      width: 160,
      ...fixed,
      cellRenderer: (row) => <Chip size="small" variant="outlined" label={t(KIND_LABEL[row.kind])} />,
      valueGetter: (row) => t(KIND_LABEL[row.kind]),
    },
    { field: 'keywords', headerName: t('marketing.autoReplies.colKeywords'), type: 'text', minWidth: 180, ...fixed, valueGetter: (row) => row.keywords.join(', ') },
    { field: 'account_ids', headerName: t('marketing.autoReplies.colAccounts'), type: 'text', width: 140, ...fixed, valueGetter: accounts },
    { field: 'trusted', headerName: t('marketing.autoReplies.colTrusted'), type: 'text', width: 110, ...fixed, valueGetter: (row) => yesNo(row.trusted) },
    {
      field: 'enabled',
      headerName: t('marketing.autoReplies.colEnabled'),
      type: 'text',
      width: 100,
      ...fixed,
      cellRenderer: (row) => <Chip size="small" color={row.enabled ? 'success' : 'default'} label={yesNo(row.enabled)} />,
      valueGetter: (row) => yesNo(row.enabled),
    },
    { field: 'sent_7d', headerName: t('marketing.autoReplies.colSent'), type: 'number', width: 130, ...fixed, valueGetter: (row) => row.sent_7d },
    dateColumn<SocialAutoReplyRule>({ field: 'updated_at', headerName: t('marketing.autoReplies.colUpdated'), hide: false, width: 170, filterable: false }),
  ];
}
