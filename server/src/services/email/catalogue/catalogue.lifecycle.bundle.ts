/**
 * English copy for `catalogue.lifecycle.ts` (CLAUDE.md rule 38), spread into
 * `EMAIL_FALLBACK` beside `CATALOGUE_FALLBACK`. Kept apart so the new rows'
 * wording is reviewed in one place; shape and sharing rules are the same as
 * `catalogue.bundle.ts` — a label used by more than one email is ONE key.
 */
export const LIFECYCLE_FALLBACK: Record<string, string> = {
  // --- Shared, new with these rows -----------------------------------------
  'email.field.cancelledBy': 'Cancelled by',
  'email.field.guests': 'Guests booked',
  'email.field.deleteOn': 'Deleted on',
  'email.field.details': 'Details',
  'email.label.alert': 'Alert',
  'email.cta.contactUs': 'Contact us',
  'email.cta.openBrandOrder': 'Open the order',
  'email.footer.staff': "You're receiving this because you manage this area at Duncit.",
  'email.help.podMoved':
    'Your spot moved with the pod, so there is nothing to rebook. If the new time does not work for you, open the pod to see your options.',
  'email.help.notYou':
    'If you did not make this change, contact us right away and we will secure the account while we look into it.',
  'email.help.deletionChangeMind':
    'You have been signed out everywhere. If you change your mind before that date, contact us and we can stop the deletion.',
  'email.help.payoutRejected':
    'Nothing has been credited for this payout. Reply to this email or contact support if you think the decision is wrong.',

  // --- Member --------------------------------------------------------------
  'email.userPodRescheduled.title': 'Your pod has moved',
  'email.userPodRescheduled.body':
    'The pod below now has a new date, time or venue. Please check the details before you head out.',
  'email.userPodReminderSameDay.title': 'Your pod is today',
  'email.userPodReminderSameDay.body':
    'A quick reminder for today. Here is where to go and when, so you can leave in good time.',
  'email.podShopOrderShipped.title': 'Your order is on its way',
  'email.podShopOrderShipped.body': 'Your order has been handed to the courier and is now on its way to you.',
  'email.podShopOrderOutForDelivery.title': 'Your order arrives today',
  'email.podShopOrderOutForDelivery.body':
    'Your order is out for delivery. Please keep your phone close in case the courier needs to reach you.',
  'email.podShopOrderDelivered.title': 'Your order was delivered',
  'email.podShopOrderDelivered.body':
    'Your order has been delivered. If anything is missing or not right, you can raise it from your orders.',
  'email.contactChanged.title': 'A contact detail on your account changed',
  'email.contactChanged.body':
    'The detail below on your Duncit account was just changed. If this was you, there is nothing more to do.',
  'email.accountDeletionRequested.title': 'We have your deletion request',
  'email.accountDeletionRequested.body':
    'Your request to delete your Duncit account has been received. Your account is now closed, and it will be permanently deleted on the date below.',
  'email.accountDeletionRejected.title': 'Your account is open again',
  'email.accountDeletionRejected.body':
    'Our team could not go ahead with your deletion request for the reason below, so your Duncit account has been reopened and you can sign in again.',
  'email.accountDeletionCompleted.title': 'Your account has been deleted',
  'email.accountDeletionCompleted.body':
    'Your Duncit account and its personal data have now been deleted, as you asked. This is the last email you will get about it. Thank you for being part of Duncit.',

  // --- Partners ------------------------------------------------------------
  'email.venuePodCancelled.title': 'A pod at your venue was cancelled',
  'email.venuePodCancelled.body':
    'The pod below will no longer take place at your venue, so the space you set aside for it is free again.',
  'email.clubAdminPodCancelled.title': 'A pod in your club was cancelled',
  'email.clubAdminPodCancelled.body':
    'The pod below has been cancelled. Its guests have been told and any refunds are already on their way.',
  'email.venuePodReminder.title': 'A pod is coming up at your venue',
  'email.venuePodReminder.body':
    'Here is a reminder of the pod booked at your venue, with the number of guests to plan the space for and the host to expect.',
  'email.ecommNewOrder.title': 'You have a new order to pack',
  'email.ecommNewOrder.body':
    'A buyer has paid for the items below. Please pack them and get the order ready for pickup.',
  'email.payoutRejected.title': 'Your payout was not approved',
  'email.payoutRejected.body':
    'Our Finance team has reviewed the payout below and could not approve it, for the reason given.',
  'email.bankDetailsChanged.title': 'Your payout details were changed',
  'email.bankDetailsChanged.body':
    'The account your Duncit payouts are sent to was just changed to the one below. If this was you, there is nothing more to do.',
  'email.meetingReminder.title': 'Your onboarding call is coming up',
  'email.meetingReminder.body':
    'This is a reminder of your onboarding call with the Duncit team. Please join a couple of minutes early.',

  // --- Staff ---------------------------------------------------------------
  'email.staffAlert.title': 'Something needs your attention',
  'email.staffAlert.body': 'The item below has just come in for your desk.',
};
