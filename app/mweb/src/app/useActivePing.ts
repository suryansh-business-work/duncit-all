import { useEffect } from 'react';
import { gql, useMutation } from '@apollo/client';

const RECORD_PING = gql`
  mutation RecordActivePing($slug: String) {
    recordActivePing(super_category_slug: $slug)
  }
`;

export function useActivePing(pathname: string, superCategory: string) {
  const [recordPing] = useMutation(RECORD_PING);

  useEffect(() => {
    recordPing({ variables: { slug: superCategory || null } }).catch(() => {});
  }, [pathname, superCategory, recordPing]);
}
