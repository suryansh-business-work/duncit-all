import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { ApplyReferralCodeDocument, MyReferralDocument } from '@/graphql/referral';
import { graphqlRequest } from '@/services/graphql.client';

export type MyReferral = ResultOf<typeof MyReferralDocument>['myReferral'];

/** Refer & Earn data layer — my code/gift/redemptions + code redemption (B4-11). */
export function useReferral() {
  const [referral, setReferral] = useState<MyReferral | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const data = await graphqlRequest(MyReferralDocument, undefined, { auth: true });
    setReferral(data.myReferral);
  }, []);

  useEffect(() => {
    let active = true;
    refetch()
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [refetch]);

  const applyCode = async (code: string) => {
    setApplyBusy(true);
    setApplyError(null);
    try {
      await graphqlRequest(ApplyReferralCodeDocument, { code }, { auth: true });
      await refetch();
      return true;
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Could not apply the code');
      return false;
    } finally {
      setApplyBusy(false);
    }
  };

  return { referral, isLoading, applyBusy, applyError, applyCode, refetch };
}
