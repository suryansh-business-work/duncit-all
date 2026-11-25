import { useCallback, useState } from 'react';

import {
  CrmAppDeleteServiceOfferedDocument,
  CrmAppServicesOfferedTableDocument,
} from '@/graphql/servicesOffered';
import { usePagedSearch } from '@/hooks/usePagedSearch';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import {
  DEFAULT_SERVICE_SORT,
  serviceSortQuery,
  type ServiceOfferedRow,
  type ServiceSort,
} from './serviceOffered';

interface Messages {
  loadFailed: string;
  saveFailed: string;
}

/**
 * The Services Offered list as the portal's table runs it: every service
 * (inactive ones too), searched by title or slug and sorted on the server,
 * read page by page — and deleting one after a confirm.
 */
export function useServicesOffered(messages: Messages) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<ServiceSort>(DEFAULT_SERVICE_SORT);
  const [removing, setRemoving] = useState<ServiceOfferedRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const { crmServicesOfferedTable } = await gqlRequest(CrmAppServicesOfferedTableDocument, {
        query: {
          search: search.trim() || null,
          page,
          page_size: pageSize,
          ...serviceSortQuery(sort),
        },
      });
      return { rows: crmServicesOfferedTable.rows, total: crmServicesOfferedTable.total };
    },
    [search, sort],
  );
  const list = usePagedSearch<ServiceOfferedRow>(fetchPage, {
    fallbackError: messages.loadFailed,
    scope: 'crm-app/ServicesOfferedScreen',
  });

  const askDelete = (row: ServiceOfferedRow | null) => {
    setDeleteError(null);
    setRemoving(row);
  };

  /** Delete the confirmed service and read the list again; a failure stays in the dialog. */
  const confirmDelete = async (row: ServiceOfferedRow) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await gqlRequest(CrmAppDeleteServiceOfferedDocument, { id: row.id });
      setRemoving(null);
      await list.refresh();
    } catch (err) {
      setDeleteError(errorMessage(err, messages.saveFailed));
    } finally {
      setDeleting(false);
    }
  };

  return {
    ...list,
    search,
    setSearch,
    sort,
    setSort,
    removing,
    askDelete,
    deleting,
    deleteError,
    confirmDelete,
  };
}
