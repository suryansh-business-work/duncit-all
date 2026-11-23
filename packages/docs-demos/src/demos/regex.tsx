import {
  isAppleTeamId,
  isBankAccountNumber,
  isEmail,
  isGstin,
  isHostname,
  isIfsc,
  isPaymentTransactionId,
  isPhoneNumber,
  isPhysicalGiftCardNumber,
  isPhysicalGiftCardPasscode,
  isPincode,
  isReferralCode,
  isSitePath,
  isSocialHandle,
  isUnderscoreHandle,
  isUpiId,
  isUrlSlug,
  isUsername,
  toDigits,
} from '@duncit/regex';
import { defineDemo, defineDemos } from '../types';

interface CandidateMock {
  phone: string;
  email: string;
  pincode: string;
  username: string;
  underscore_handle: string;
  social_handle: string;
  referral_code: string;
}

interface TypedPhoneMock {
  typed: string;
}

interface NameServerMock {
  first: string;
  second: string;
}

interface CmsAddressMock {
  page_path: string;
  post_slug: string;
  domain: string;
}

interface BankMock {
  ifsc: string;
  account_number: string;
  upi_id: string;
  gstin: string;
}

interface PaymentReferenceMock {
  razorpay_payment_id: string;
  bank_utr: string;
}

interface PrintedCardMock {
  card_number: string;
  passcode: string;
}

export default defineDemos('regex', [
  defineDemo<CandidateMock>({
    id: 'identity',
    title: 'The patterns every sign-up form is judged by',
    note:
      'One copy of each pattern, so the app, mWeb and the server agree on what a valid phone number is. Break one below and watch only that row turn false.',
    mock: {
      phone: '9845012345',
      email: 'meera@duncit.com',
      pincode: '560102',
      username: 'meera.n',
      underscore_handle: 'meera_n',
      social_handle: 'meera.events',
      referral_code: 'DUNMEERA24',
    },
    compute: (mock) => ({
      'isPhoneNumber(phone)': isPhoneNumber(mock.phone),
      'isEmail(email)': isEmail(mock.email),
      'isPincode(pincode)': isPincode(mock.pincode),
      'isUsername(username)': isUsername(mock.username),
      'isUnderscoreHandle(underscore_handle)': isUnderscoreHandle(mock.underscore_handle),
      'isSocialHandle(social_handle)': isSocialHandle(mock.social_handle),
      'isReferralCode(referral_code)': isReferralCode(mock.referral_code),
    }),
  }),

  defineDemo<TypedPhoneMock>({
    id: 'digits-only',
    title: 'What a number-only box actually stores',
    note:
      'toDigits runs on every change, so this is what the form holds after a paste. Type letters, spaces or a dial code into "typed" — the stored value keeps only the digits, and isPhoneNumber then judges that.',
    mock: {
      typed: '+91 98450-12345',
    },
    compute: (mock) => ({
      'toDigits(typed)': toDigits(mock.typed),
      'isPhoneNumber(toDigits(typed))': isPhoneNumber(toDigits(mock.typed)),
    }),
  }),

  defineDemo<BankMock>({
    id: 'payouts',
    title: 'What a payout account has to look like',
    note:
      'These four gate a host or venue getting paid, so they are the ones worth pasting a real-looking value into.',
    mock: {
      ifsc: 'HDFC0000123',
      account_number: '50100234567890',
      upi_id: 'meera@okhdfcbank',
      gstin: '29AABCU9603R1ZM',
    },
    compute: (mock) => ({
      'isIfsc(ifsc)': isIfsc(mock.ifsc),
      'isBankAccountNumber(account_number)': isBankAccountNumber(mock.account_number),
      'isUpiId(upi_id)': isUpiId(mock.upi_id),
      'isGstin(gstin)': isGstin(mock.gstin),
    }),
  }),

  defineDemo<PaymentReferenceMock>({
    id: 'payment-reference',
    title: 'What a deducted-payment claim accepts as a transaction ID',
    note:
      'A buyer whose money left their account but whose booking did not complete can quote the reference from their bank or UPI app. Add a space, a colon or trim it under six characters and that row turns false — the server refuses the same.',
    mock: {
      razorpay_payment_id: 'pay_29QQoUBi66xm2f',
      bank_utr: '432112345678',
    },
    compute: (mock) => ({
      'isPaymentTransactionId(razorpay_payment_id)': isPaymentTransactionId(mock.razorpay_payment_id),
      'isPaymentTransactionId(bank_utr)': isPaymentTransactionId(mock.bank_utr),
    }),
  }),

  defineDemo<{ team_id: string }>({
    id: 'apple-team-id',
    title: 'The Team ID mWeb writes into apple-app-site-association',
    note: 'Read from Tech → Environment → Sign in with Apple when mWeb is built. Lower-case it or drop a character and the row turns false — the build then leaves the file out rather than ship one iOS rejects.',
    mock: { team_id: 'A1B2C3D4E5' },
    compute: (mock) => ({ 'isAppleTeamId(team_id)': isAppleTeamId(mock.team_id) }),
  }),

  defineDemo<PrintedCardMock>({
    id: 'printed-gift-card',
    title: 'What a printed gift card carries',
    note:
      'The 9-digit number on the face and the 16-digit passcode under the scratch panel. Only the digits are judged, so spaces and dashes still pass — start the number with 0 or drop one passcode digit and that row turns false.',
    mock: {
      card_number: '123 456 789',
      passcode: '1234-5678-9012-3456',
    },
    compute: (mock) => ({
      'isPhysicalGiftCardNumber(card_number)': isPhysicalGiftCardNumber(mock.card_number),
      'isPhysicalGiftCardPasscode(passcode)': isPhysicalGiftCardPasscode(mock.passcode),
    }),
  }),

  defineDemo<NameServerMock>({
    id: 'name-servers',
    title: 'What Tech → Security → Cloudflare accepts as a nameserver',
    note:
      'Custom nameservers are checked label by label before GoDaddy is asked to point the domain at them. Drop a dot, add an underscore or start a label with "-" and the row turns false.',
    mock: {
      first: 'kate.ns.cloudflare.com',
      second: 'rob.ns.cloudflare.com',
    },
    compute: (mock) => ({
      'isHostname(first)': isHostname(mock.first),
      'isHostname(second)': isHostname(mock.second),
    }),
  }),

  defineDemo<CmsAddressMock>({
    id: 'cms-addresses',
    title: 'What the Website CMS accepts as an address',
    note:
      'A page path, a post slug and the domain a site answers on. Add a trailing slash, a capital or a doubled hyphen and the row turns false — the CMS keeps one spelling of every URL.',
    mock: {
      page_path: '/safety/tools',
      post_slug: 'summer-meetups-2026',
      domain: 'main.localhost',
    },
    compute: (mock) => ({
      'isSitePath(page_path)': isSitePath(mock.page_path),
      'isUrlSlug(post_slug)': isUrlSlug(mock.post_slug),
      'isHostname(domain)': isHostname(mock.domain),
    }),
  }),
]);
