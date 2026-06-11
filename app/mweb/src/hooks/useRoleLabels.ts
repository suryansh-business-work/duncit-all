import { gql, useQuery } from '@apollo/client';
import { useMemo } from 'react';

export const PUBLIC_ROLES = gql`
  query PublicRoles {
    publicRoles {
      key
      name
    }
  }
`;

const FALLBACK = (key: string) =>
  key
    .toLowerCase()
    .split('_')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');

export function useRoleLabels() {
  const { data } = useQuery(PUBLIC_ROLES, { fetchPolicy: 'cache-first' });
  const map = useMemo(() => {
    const m = new Map<string, string>();
    (data?.publicRoles ?? []).forEach((r: any) => m.set(r.key, r.name));
    return m;
  }, [data]);
  const labelFor = (key: string) => map.get(key) || FALLBACK(key);
  return { labelFor };
}
