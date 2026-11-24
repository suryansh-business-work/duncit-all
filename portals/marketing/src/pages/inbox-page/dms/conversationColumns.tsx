import { Avatar, Badge, Stack, Typography } from '@mui/material';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import type { Translate } from '@duncit/shell';
import { ClampedText, PlatformCell } from '../../social-accounts-page/SocialCells';
import { EnumChip } from '../../social-accounts-page/monitoring/CommentCells';
import { PLATFORM_LABEL, SENTIMENT_COLORS, SENTIMENT_LABEL, enumOptions } from '../../social-accounts-page/copy';
import type { SocialSentiment } from '../../social-accounts-page/queries';
import { INBOX_STATUSES, INBOX_STATUS_COLORS, INBOX_STATUS_LABEL, WINDOW_COLORS, WINDOW_LABEL } from '../copy';
import type { SocialConversation } from '../dm.queries';
import type { InboxAccount } from '../queries';

const SENTIMENTS: readonly SocialSentiment[] = ['NEGATIVE', 'NEUTRAL', 'POSITIVE'];
const DM_PLATFORMS = ['INSTAGRAM', 'FACEBOOK'] as const;

/** The person: their picture, name and handle, with how many of their messages nobody has read. */
function PersonCell({ row, t }: Readonly<{ row: SocialConversation; t: Translate }>) {
  const name = row.participant.name || row.participant.username || t('marketing.inbox.unknownAuthor');
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Badge color="primary" badgeContent={row.unread_count} max={99} invisible={row.unread_count === 0}>
        <Avatar src={row.participant.avatar_url || undefined} alt="" sx={{ width: 32, height: 32 }} />
      </Badge>
      <Stack sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          {name}
        </Typography>
        {row.participant.username && (
          <Typography variant="caption" color="text.secondary" noWrap>
            @{row.participant.username}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

/** The DM queue's columns: who, where, what they last said, Meta's window, where it stands and who has it. */
export function getConversationColumns(accounts: readonly InboxAccount[], t: Translate): DuncitColumn<SocialConversation>[] {
  return [
    {
      field: 'participant',
      headerName: t('marketing.inbox.colPerson'),
      type: 'text',
      minWidth: 200,
      sortable: false,
      filterable: false,
      cellRenderer: (row) => <PersonCell row={row} t={t} />,
      valueGetter: (row) => row.participant.name || row.participant.username,
    },
    {
      field: 'last_message_text',
      headerName: t('marketing.inbox.colLastMessage'),
      type: 'text',
      flex: 1,
      minWidth: 240,
      sortable: false,
      filterable: false,
      cellRenderer: (row) => <ClampedText text={row.last_message_text} secondary={null} />,
      valueGetter: (row) => row.last_message_text,
    },
    {
      field: 'platform',
      headerName: t('marketing.inbox.colNetwork'),
      type: 'enum',
      width: 150,
      sortable: false,
      options: enumOptions(DM_PLATFORMS, PLATFORM_LABEL, t),
      cellRenderer: (row) => <PlatformCell platform={row.platform} label={t(PLATFORM_LABEL[row.platform])} />,
      valueGetter: (row) => t(PLATFORM_LABEL[row.platform]),
    },
    {
      field: 'account_id',
      headerName: t('marketing.inbox.colAccount'),
      type: 'enum',
      minWidth: 160,
      sortable: false,
      options: accounts.map((account) => ({ value: account.id, label: account.name })),
      valueGetter: (row) => row.account_name,
    },
    {
      field: 'window_state',
      headerName: t('marketing.inbox.colWindow'),
      type: 'text',
      width: 150,
      sortable: false,
      filterable: false,
      cellRenderer: (row) => <StatusChip status={row.window_state} colorMap={WINDOW_COLORS} label={t(WINDOW_LABEL[row.window_state])} />,
      valueGetter: (row) => t(WINDOW_LABEL[row.window_state]),
    },
    {
      field: 'ai_sentiment',
      headerName: t('marketing.inbox.colSentiment'),
      type: 'enum',
      width: 140,
      sortable: false,
      options: enumOptions(SENTIMENTS, SENTIMENT_LABEL, t),
      cellRenderer: (row) => <EnumChip value={row.ai_sentiment} colors={SENTIMENT_COLORS} labels={SENTIMENT_LABEL} t={t} />,
    },
    {
      field: 'status',
      headerName: t('marketing.inbox.colStatus'),
      type: 'enum',
      width: 130,
      sortable: false,
      options: enumOptions(INBOX_STATUSES, INBOX_STATUS_LABEL, t),
      cellRenderer: (row) => <StatusChip status={row.status} colorMap={INBOX_STATUS_COLORS} label={t(INBOX_STATUS_LABEL[row.status])} />,
      valueGetter: (row) => t(INBOX_STATUS_LABEL[row.status]),
    },
    {
      field: 'assigned_user_id',
      headerName: t('marketing.inbox.colAssignee'),
      type: 'text',
      minWidth: 140,
      sortable: false,
      filterable: false,
      valueGetter: (row) => row.assigned_name || t('marketing.inbox.nobody'),
    },
    dateColumn<SocialConversation>({ field: 'last_message_at', headerName: t('marketing.inbox.colLastAt'), hide: false, width: 170 }),
  ];
}
