import {
  isBankAccountNumber,
  isEmail,
  isGstin,
  isIfsc,
  isPhoneNumber,
  isPincode,
  isReferralCode,
  isUpiId,
  isUsername,
} from '@duncit/regex';
import { defineDemo, defineDemos } from '../types';

interface CandidateMock {
  phone: string;
  email: string;
  pincode: string;
  username: string;
  referral_code: string;
}

interface BankMock {
  ifsc: string;
  account_number: string;
  upi_id: string;
  gstin: string;
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
      referral_code: 'DUNMEERA24',
    },
    compute: (mock) => ({
      'isPhoneNumber(phone)': isPhoneNumber(mock.phone),
      'isEmail(email)': isEmail(mock.email),
      'isPincode(pincode)': isPincode(mock.pincode),
      'isUsername(username)': isUsername(mock.username),
      'isReferralCode(referral_code)': isReferralCode(mock.referral_code),
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
]);
