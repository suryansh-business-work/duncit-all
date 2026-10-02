import { useEffect } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { consentAllows } from '@duncit/utils';
import { useWebConsent } from './useWebConsent';

const RECORD_PING = gql`
  mutation RecordActivePing($slug: String) {
    recordActivePing(super_category_slug: $slug)
  }
`;

/** A daily-active ping per route — usage analytics, so only with consent. */
export function useActivePing(pathname: string, superCategory: string) {
  const [recordPing] = useMutation<any>(RECORD_PING);
  const allowed = consentAllows(useWebConsent(), 'analytics');

  useEffect(() => {
    if (!allowed) return;
    recordPing({ variables: { slug: superCategory || null } }).catch(() => {});
  }, [allowed, pathname, superCategory, recordPing]);
}
