import { useEffect, useState } from 'react';

import { MobilePublicFinanceDocument } from '@/graphql/checkout';
import { graphqlRequest } from '@/services/graphql.client';

export interface PublicFinance {
  gstPct: number;
  currency: string;
}

/** Public finance settings (GST % + currency) for money display on public
 * surfaces like Pod Details. Defaults to 0% / ₹ until the settings load, and
 * silently keeps the defaults if the fetch fails (display-only, never blocks). */
export function usePublicFinance(): PublicFinance {
  const [finance, setFinance] = useState<PublicFinance>({ gstPct: 0, currency: '₹' });
  useEffect(() => {
    let active = true;
    graphqlRequest(MobilePublicFinanceDocument, undefined, { auth: true })
      .then((d) => {
        if (active) {
          setFinance({
            gstPct: d.publicFinanceSettings.gst_pct,
            currency: d.publicFinanceSettings.currency_symbol,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return finance;
}
