import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { SOCIAL_POSTS_TABLE, type SocialAccount, type SocialPostRow } from '../queries';
import { getPostColumns } from './postColumns';

const getRowId = (row: SocialPostRow) => row.id;

interface Props {
  accounts: SocialAccount[];
  onOpen: (post: SocialPostRow) => void;
}

/**
 * Every post read from the connected accounts, server-paged, newest first.
 * Filter by account or network from the column menus; open a row for its
 * numbers against the account's average and the AI's read of it.
 */
export default function PostsTable({ accounts, onOpen }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<SocialPostRow>(client, SOCIAL_POSTS_TABLE, 'socialPostsTable');
  const columns = useMemo(() => getPostColumns(accounts, t, locale), [accounts, t, locale]);

  return (
    <DuncitTable<SocialPostRow>
      ariaLabel={t('marketing.social.postsTitle')}
      tableId="marketing-social-posts"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText={t('marketing.social.noPosts')}
      searchPlaceholder={t('marketing.social.searchPosts')}
      defaultSort={{ field: 'published_at', dir: 'desc' }}
    />
  );
}
