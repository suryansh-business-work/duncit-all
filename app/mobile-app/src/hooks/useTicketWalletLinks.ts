import { useEffect, useState } from 'react';
import { logs } from '@duncit/logs';

import { TicketWalletLinksDocument } from '@/graphql/pod-history';
import { graphqlRequest } from '@/services/graphql.client';

export interface TicketWalletLinks {
  apple_pass_url: string | null;
  google_save_url: string | null;
}

const NONE: TicketWalletLinks = { apple_pass_url: null, google_save_url: null };

/**
 * The booked pod's add-to-wallet links, fetched once the confirmation shows.
 * While loading, on error, or when a wallet is not set up in the Tech portal,
 * that link is null and its button is not shown. An error is logged rather
 * than shown, since the ticket download beside it still works.
 * mWeb twin: checkout-page/CheckoutSuccess/useTicketWalletLinks.
 */
export function useTicketWalletLinks(podId: string | undefined): TicketWalletLinks {
  const [links, setLinks] = useState<TicketWalletLinks>(NONE);
  useEffect(() => {
    if (!podId) return undefined;
    let live = true;
    graphqlRequest(TicketWalletLinksDocument, { podId }, { auth: true })
      .then((data) => {
        if (!live) return;
        // The generated fields are optional; an absent link means no button.
        const { apple_pass_url, google_save_url } = data.myEventTicketWalletLinks;
        setLinks({
          apple_pass_url: apple_pass_url ?? null,
          google_save_url: google_save_url ?? null,
        });
      })
      .catch((error: unknown) => logs.mobileApp.error('checkout', 'ticketWalletLinks', { error }));
    return () => {
      live = false;
    };
  }, [podId]);
  return links;
}
