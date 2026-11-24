import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { TICKET_WALLET_LINKS } from './queries';

export interface TicketWalletLinks {
  apple_pass_url: string | null;
  google_save_url: string | null;
}

const NONE: TicketWalletLinks = { apple_pass_url: null, google_save_url: null };

/**
 * The booked pod's add-to-wallet links, fetched once the confirmation shows.
 * Ready before the tap on purpose: Safari blocks a navigation that waits on a
 * request, so the buttons are plain links. While loading, on error, or when a
 * wallet is not set up, that link is null and its button is not shown. An error
 * is logged rather than shown, since the ticket download beside it still works.
 * Native twin: hooks/useTicketWalletLinks.
 */
export function useTicketWalletLinks(podId: string | undefined): TicketWalletLinks {
  const { data, error } = useQuery<{ myEventTicketWalletLinks: TicketWalletLinks }>(TICKET_WALLET_LINKS, {
    variables: { podId },
    skip: !podId,
    fetchPolicy: 'network-only',
  });
  useEffect(() => {
    if (error) logs.mWeb.error('checkout', 'ticketWalletLinks', { error });
  }, [error]);
  return data?.myEventTicketWalletLinks ?? NONE;
}
