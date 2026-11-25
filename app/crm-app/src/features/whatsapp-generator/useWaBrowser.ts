import { useCallback, useEffect, useRef, useState } from 'react';
import { fireAndForget, logs } from '@duncit/logs';

import {
  CrmAppWhatsappCommunitiesDocument,
  CrmAppWhatsappContactsDocument,
  CrmAppWhatsappGroupsDocument,
} from '@/graphql/whatsappGenerator';
import { usePagedSearch } from '@/hooks/usePagedSearch';
import { gqlRequest } from '@/services/graphql.client';
import { useWaExtraction } from './extractionStore';

export const WA_TABS = ['communities', 'groups', 'users'] as const;
export type WaTab = (typeof WA_TABS)[number];

export interface WaGroupRef {
  jid: string;
  name: string;
}

/** One row of the browser, whichever list it came from. */
export type WaBrowserRow =
  | { kind: 'community'; id: string; jid: string; name: string; groups: number }
  | { kind: 'group'; id: string; jid: string; name: string }
  | { kind: 'user'; id: string; name: string; phone: string; business: boolean };

interface PageInput {
  search: string | null;
  page: number;
  page_size: number;
  community_jid?: string;
}

/** Reads one page of the chosen list, as rows the screen draws the same way. */
async function readPage(tab: WaTab, input: PageInput) {
  if (tab === 'communities') {
    const { waCommunities } = await gqlRequest(CrmAppWhatsappCommunitiesDocument, { input });
    const rows = waCommunities.items.map((c): WaBrowserRow => ({
      kind: 'community',
      id: c.id,
      jid: c.community_jid,
      name: c.name,
      groups: c.groups_count,
    }));
    return { rows, total: waCommunities.total };
  }
  if (tab === 'groups') {
    const { waGroups } = await gqlRequest(CrmAppWhatsappGroupsDocument, { input });
    const rows = waGroups.items.map((g): WaBrowserRow => ({
      kind: 'group',
      id: g.id,
      jid: g.group_jid,
      name: g.name,
    }));
    return { rows, total: waGroups.total };
  }
  const { waContacts } = await gqlRequest(CrmAppWhatsappContactsDocument, { input });
  const rows = waContacts.items.map((u): WaBrowserRow => ({
    kind: 'user',
    id: u.id,
    name: u.name,
    phone: u.phone,
    business: u.is_business,
  }));
  return { rows, total: waContacts.total };
}

/**
 * The connected account's browser — Communities → Groups (of one community, or
 * all) and every User — each searched on the server and read page by page. A
 * finished extraction refreshes the list once.
 */
export function useWaBrowser(fallbackError: string) {
  const [tab, setTab] = useState<WaTab>('communities');
  const [community, setCommunity] = useState<WaGroupRef | null>(null);
  const [search, setSearch] = useState('');

  const fetchPage = useCallback(
    (page: number, pageSize: number) =>
      readPage(tab, {
        search: search.trim() || null,
        page,
        page_size: pageSize,
        ...(tab === 'groups' && community ? { community_jid: community.jid } : {}),
      }),
    [tab, community, search],
  );
  const list = usePagedSearch<WaBrowserRow>(fetchPage, {
    fallbackError,
    scope: 'crm-app/WhatsAppBrowser',
  });

  const finishedId = useWaExtraction((s) => s.finishedId);
  const seenFinish = useRef(finishedId);
  const { refresh } = list;
  useEffect(() => {
    if (!finishedId || finishedId === seenFinish.current) return;
    seenFinish.current = finishedId;
    fireAndForget(refresh(), logs.mobileApp, 'crm-app/WhatsAppBrowser', 'refreshAfterExtraction');
  }, [finishedId, refresh]);

  const openCommunity = useCallback((ref: WaGroupRef) => {
    setCommunity(ref);
    setTab('groups');
  }, []);

  return {
    tab,
    setTab,
    community,
    clearCommunity: () => setCommunity(null),
    openCommunity,
    search,
    setSearch,
    list,
  };
}

export type WaBrowser = ReturnType<typeof useWaBrowser>;
