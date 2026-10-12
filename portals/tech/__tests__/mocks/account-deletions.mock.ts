import type {
  AccountDeletionRow,
  DeletionDetail,
  PurgeLogEntry,
  TraceGroup,
} from '../../src/pages/account-deletions/queries';

export const deletionRow = (over: Partial<AccountDeletionRow> = {}): AccountDeletionRow => ({
  id: 'r1',
  request_id: 'DEL-0001',
  user_id: 'u1',
  name: 'Asha Rao',
  email: 'asha@example.test',
  phone: '+910000000001',
  reason: 'Moving away',
  surface: 'MWEB',
  status: 'PENDING',
  requested_at: '2026-01-01T10:00:00.000Z',
  scheduled_delete_at: '2026-01-31T10:00:00.000Z',
  days_remaining: 12,
  reviewed_at: null,
  note: '',
  ...over,
});

export const traceGroup = (over: Partial<TraceGroup> = {}): TraceGroup => ({
  model_name: 'ChatMessage',
  collection_name: 'chat_messages',
  field_path: 'sender',
  id_kind: 'OBJECT_ID',
  count: 7,
  purge_kind: 'DELETE_DOCUMENTS',
  retention_reason: '',
  ...over,
});

export const deletionDetail = (
  request: Partial<AccountDeletionRow> & { purge_log?: PurgeLogEntry[] } = {},
  over: Partial<Omit<DeletionDetail, 'request'>> = {}
): DeletionDetail => {
  const { purge_log = [], ...rest } = request;
  return {
    request: { ...deletionRow(rest), purge_log },
    account_exists: true,
    trace: [traceGroup()],
    ...over,
  };
};
