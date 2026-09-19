import type { NestedCatalogue } from '@duncit/i18n';

/**
 * Copy both pages share: the sign-in door, status names and the generic words.
 * Lite ships its bundle beside its code rather than in packages/i18n because it
 * has its own Localization (Console → Localization) and its own database;
 * the parser and the provider are still the one shared package (rule 38).
 */
export const LITE_COMMON_BUNDLE: NestedCatalogue = {
  lite: {
    common: {
      loading: 'Loading…',
      loadFailed: 'We could not load this right now. Please try again.',
      notFound: 'Not found.',
      save: 'Save',
      saving: 'Saving…',
      cancel: 'Cancel',
      close: 'Close',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Go back',
      copy: 'Copy',
      copied: 'Copied',
      search: 'Search',
      yes: 'Yes',
      no: 'No',
      free: 'Free',
      unlimited: 'Unlimited',
      online: 'Online',
      inPerson: 'In person',
      skipToContent: 'Skip to main content',
      signIn: 'Sign in',
      signOut: 'Sign out',
      required: 'Required',
      optional: 'Optional',
      retry: 'Try again',
    },
    auth: {
      title: 'Sign in',
      subtitle: 'Enter your email. Duncit members get their usual code; everyone else gets one from us.',
      email: 'Email',
      emailHint: 'A code is sent to this address',
      sendCode: 'Send me a code',
      sending: 'Sending…',
      codeSentLite: 'We emailed a 6-digit code to {email}. It works for {minutes} minutes.',
      codeSentDuncit: 'Your Duncit account emailed you a 6-digit code for {email}. It works for {minutes} minutes.',
      testCode: 'No mailbox is configured yet, so use this code: {code}',
      code: '6-digit code',
      codeHint: 'From the email you just received',
      name: 'Your name',
      nameHint: 'Shown to hosts and on your tickets',
      verify: 'Continue',
      verifying: 'Checking…',
      resend: 'Send a new code',
      resendIn: 'Send a new code in {seconds}s',
      changeEmail: 'Use a different email',
      or: 'or',
      google: 'Continue with Google',
      duncitNote: 'Already on Duncit? Use the same email and sign in with your Duncit account.',
      close: 'Close sign-in',
      welcome: 'Welcome, {name}',
    },
    status: {
      PENDING_APPROVAL: 'Pending approval',
      PAYMENT_PENDING: 'Payment pending',
      CONFIRMED: 'Going',
      WAITLISTED: 'Waitlisted',
      DECLINED: 'Declined',
      CANCELLED: 'Cancelled',
    },
    payment: {
      NOT_REQUIRED: 'Free',
      PENDING: 'Awaiting payment',
      PAID: 'Paid',
      REJECTED: 'Payment rejected',
    },
    eventStatus: {
      DRAFT: 'Draft',
      PUBLISHED: 'Published',
      CANCELLED: 'Cancelled',
    },
    visibility: {
      PUBLIC: 'Public',
      UNLISTED: 'Unlisted',
      PRIVATE: 'Private',
    },
  },
};
