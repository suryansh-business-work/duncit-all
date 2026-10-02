import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  SUPPORT_CHAT_SESSIONS,
  type SupportChatSessionPage,
  type SupportChatStatus,
} from '../../../graphql/supportChat';
import { useTabParam } from '@duncit/tabs';
import type { useTranslation } from '@duncit/shell';
import { sessionFilters } from './SessionFilter';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Inbox state: the status tab, debounced search, paging and the sessions page itself. */
export function useSessionList(t: Translate) {
  const sessionTabs = useTabParam<SupportChatStatus>({
    items: sessionFilters(t),
    fallback: 'OPEN',
  });
  const statusFilter = sessionTabs.value;
  const setStatusFilter = sessionTabs.onChange;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const sessionsQuery = useQuery<{ supportChatSessions: SupportChatSessionPage }>(SUPPORT_CHAT_SESSIONS, {
    variables: {
      status: statusFilter,
      search: search || null,
      page: page + 1,
      page_size: pageSize,
    },
    fetchPolicy: 'cache-and-network',
  });
  const sessions = sessionsQuery.data?.supportChatSessions.items ?? [];
  const totalSessions = sessionsQuery.data?.supportChatSessions.total ?? 0;

  return {
    statusFilter,
    setStatusFilter,
    searchInput,
    setSearchInput,
    page,
    setPage,
    pageSize,
    setPageSize,
    sessionsQuery,
    sessions,
    totalSessions,
  };
}
