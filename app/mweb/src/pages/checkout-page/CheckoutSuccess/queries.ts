import { gql } from '@apollo/client';

export const INVOICE_PDF = gql`
  query CheckoutInvoicePdf($id: ID!) {
    paymentInvoicePdfBase64(payment_doc_id: $id)
  }
`;

export const MY_TICKET_FOR_POD = gql`
  query CheckoutTicketForPod($podId: ID!) {
    myEventTicketForPod(pod_doc_id: $podId) {
      id
      ticket_code
    }
  }
`;

export const TICKET_PDF = gql`
  query CheckoutTicketPdf($id: ID!) {
    eventTicketPdfBase64(ticket_doc_id: $id)
  }
`;

/** Add-to-wallet links for the booked pod's ticket; each is null until that wallet is set up. */
export const TICKET_WALLET_LINKS = gql`
  query CheckoutTicketWalletLinks($podId: ID!) {
    myEventTicketWalletLinks(pod_doc_id: $podId) {
      apple_pass_url
      google_save_url
    }
  }
`;
