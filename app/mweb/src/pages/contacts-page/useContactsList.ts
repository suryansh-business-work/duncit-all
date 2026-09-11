import { useCallback } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import {
  followActionFor,
  followStatusFrom,
  readFollowStatus,
  withFollowStatus,
  type ContactsPage,
} from '@duncit/utils';
import { notifyError } from '../../components/notify';
import { parseApiError } from '../../utils/parseApiError';
import { CANCEL_FOLLOW_REQUEST, FOLLOW_USER, UNFOLLOW_USER } from '../hosts-venues-page/queries';
import { CONTACTS_ON_DUNCIT_PAGE, type ContactRow } from './queries';
import { useContactPages } from './useContactPages';

/** The viewer's own lists, as every follow mutation answers. */
interface FollowLists {
  following_user_ids?: readonly string[] | null;
  requested_user_ids?: readonly string[] | null;
}

/**
 * Every matched contact, streamed in page by page. The scope and the search
 * run in the browser over what has landed, so switching tabs or typing never
 * waits on a round trip — and a follow redraws its one row from the status the
 * server settled on, instead of re-reading the list. Twin of native
 * `useContactsOnDuncit` (rule 27).
 */
export function useContactsList() {
  const client = useApolloClient();
  const fetchPage = useCallback(
    async (offset: number, limit: number): Promise<ContactsPage<ContactRow>> => {
      const { data } = await client.query<any>({
        query: CONTACTS_ON_DUNCIT_PAGE,
        variables: { offset, limit },
        fetchPolicy: 'no-cache',
      });
      return data.contactsOnDuncitPage;
    },
    [client]
  );
  const pages = useContactPages(fetchPage);
  const { patch } = pages;

  const [followUser] = useMutation<any>(FOLLOW_USER);
  const [unfollowUser] = useMutation<any>(UNFOLLOW_USER);
  const [cancelRequest] = useMutation<any>(CANCEL_FOLLOW_REQUEST);

  const toggleFollow = useCallback(
    async (row: ContactRow) => {
      const userId = row.profile.user_id;
      const mutations = { FOLLOW: followUser, UNFOLLOW: unfollowUser, CANCEL_REQUEST: cancelRequest };
      try {
        const { data } = await mutations[followActionFor(readFollowStatus(row.profile))]({
          variables: { user_id: userId },
        });
        const lists: FollowLists =
          data?.followUser ?? data?.unfollowUser ?? data?.cancelFollowRequest ?? {};
        const settled = followStatusFrom(
          new Set(lists.following_user_ids ?? []),
          new Set(lists.requested_user_ids ?? []),
          userId
        );
        patch((rows) => withFollowStatus(rows, userId, settled));
      } catch (error) {
        notifyError(parseApiError(error));
      }
    },
    [followUser, unfollowUser, cancelRequest, patch]
  );

  return { ...pages, toggleFollow };
}
