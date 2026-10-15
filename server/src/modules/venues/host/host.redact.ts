/** The fields a host redaction touches, whatever else the row carries. */
interface HostIdentityFields {
  dob: string | null;
  aadhar_number: string;
  pan_number: string;
  police_verification_url: string;
  bank_account: object;
}

/**
 * A host's identity documents and payout details stripped, for a reader who
 * sees hosts from ANOTHER console — the clubs console's Hosts tab and host
 * record. Name, contact and status survive; the Aadhaar, PAN, DOB, police
 * document and bank account stay with the hosts console that reviews them.
 *
 * Its own module, free of the service's models, so a resolver and its tests
 * can use it without loading the database layer.
 */
export const redactHostIdentity = <H extends HostIdentityFields>(h: H): H => ({
  ...h,
  dob: null,
  aadhar_number: '',
  pan_number: '',
  police_verification_url: '',
  bank_account: {
    ...h.bank_account,
    account_number: '',
    ifsc: '',
    upi_id: '',
    account_holder_name: '',
  },
});
