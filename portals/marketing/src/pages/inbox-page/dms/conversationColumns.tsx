import { Avatar, Badge, Stack, Typography } from '@mui/material';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import type { Translate } from '@duncit/shell';
import { ClampedText } from '../../social-accounts-page/SocialCells';
import { WINDOW_COLORS, WINDOW_LABEL } from '../copy';
import type { SocialConversation } from '../dm.queries';
import { accountColumn, assigneeColumn, networkColumn, sentimentColumn, statusColumn } from '../inboxColumnKit';
import type { InboxAccount } from '../queries';

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
      cellRenderer: (row) => <ClampedText text={row.last_message_text} />,
      valueGetter: (row) => row.last_message_text,
    },
    networkColumn<SocialConversation>(t, DM_PLATFORMS),
    accountColumn<SocialConversation>(accounts, t),
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
    sentimentColumn<SocialConversation>(t),
    statusColumn<SocialConversation>(t),
    assigneeColumn<SocialConversation>(t),
    dateColumn<SocialConversation>({ field: 'last_message_at', headerName: t('marketing.inbox.colLastAt'), hide: false, width: 170 }),
  ];
}
