/**
 * The English copy for every email the catalogue builds (CLAUDE.md rule 38).
 *
 * Spread into `EMAIL_FALLBACK` rather than typed into it: two hundred keys
 * inside the file that also holds the translation runtime would bury the
 * runtime, and this half is edited for a completely different reason — a
 * sentence changes, not a cache. Downstream nothing notices: the seeder and
 * `serverTranslationSeed` both read `EMAIL_FALLBACK`, which still contains
 * every one of these.
 *
 * Shape: `email.<template>.title` is the heading, `email.<template>.body` the
 * paragraph under the greeting. Field labels, buttons, footers and closing
 * sentences are SHARED (`email.field.*`, `email.cta.*`, `email.footer.*`,
 * `email.help.*`) — sixty templates naming "Date" is one key, not sixty
 * (rule 34), and it is the difference between one row to translate and sixty.
 */
export const CATALOGUE_FALLBACK: Record<string, string> = {
  // --- Shared field labels -------------------------------------------------
  'email.field.pod': 'Pod',
  'email.field.podTitle': 'Pod',
  'email.field.date': 'Date',
  'email.field.time': 'Time',
  'email.field.venue': 'Venue',
  'email.field.host': 'Host',
  'email.field.hostContact': 'Host contact',
  'email.field.venueContact': 'Venue contact',
  'email.field.clubAdmin': 'Club admin',
  'email.field.club': 'Club',
  'email.field.amount': 'Amount',
  'email.field.reason': 'Reason',
  'email.field.refund': 'Refund',
  'email.field.refundDays': 'Reaches you in',
  'email.field.brand': 'Brand',
  'email.field.product': 'Product',
  'email.field.quantity': 'Quantity added',
  'email.field.available': 'Units left',
  'email.field.paymentId': 'Reference',
  'email.field.category': 'Category',
  'email.field.subject': 'Subject',
  'email.field.ticketNo': 'Ticket',
  'email.field.meetingLink': 'Meeting link',
  'email.field.email': 'Account',
  'email.field.spots': 'Spots booked',
  'email.field.hours': 'Time left',
  'email.field.device': 'Device',
  'email.field.place': 'Location',
  'email.field.when': 'When',
  'email.field.orderNo': 'Order',
  'email.field.notes': 'Notes',
  'email.field.campaign': 'Placement',

  // --- Shared callout captions --------------------------------------------
  'email.label.pod': 'Pod',
  'email.label.venue': 'Venue',
  'email.label.brand': 'Brand',
  'email.label.product': 'Product',
  'email.label.account': 'Account',
  'email.label.payout': 'Payout',
  'email.label.meeting': 'Meeting',
  'email.label.ticket': 'Ticket',
  'email.label.application': 'Application',
  'email.label.category': 'Category',
  'email.label.ad': 'Ad',
  'email.label.refund': 'Refund',
  'email.label.order': 'Order',
  'email.label.signIn': 'Sign-in',

  // --- Shared buttons ------------------------------------------------------
  'email.cta.viewPod': 'View the pod',
  'email.cta.openApp': 'Open Duncit',
  'email.cta.openPartners': 'Open the Partners console',
  'email.cta.giveFeedback': 'Leave your feedback',
  'email.cta.reviewRequest': 'Review the request',
  'email.cta.openTicket': 'Open your ticket',
  'email.cta.joinMeeting': 'Join the meeting',
  'email.cta.viewPayout': 'View your payouts',
  'email.cta.manageStock': 'Manage your stock',
  'email.cta.viewOrder': 'View your order',
  'email.cta.retryPayment': 'Try booking again',
  'email.cta.viewAd': 'View your ad',
  'email.cta.completePod': 'Complete the pod',
  'email.cta.reviewSlot': 'Decide on the request',
  'email.cta.secureAccount': 'Review your account security',
  'email.cta.contactSupport': 'Contact support',

  // --- Shared footer sentences ---------------------------------------------
  'email.footer.account':
    "You're receiving this because it concerns your Duncit account.",
  'email.footer.podJoined': "You're receiving this because you joined this pod on Duncit.",
  'email.footer.podHosted': "You're receiving this because you host this pod on Duncit.",
  'email.footer.podVenue': "You're receiving this because this pod is booked at your venue.",
  'email.footer.podClub': "You're receiving this because you are the club admin for this pod.",
  'email.footer.onboarding':
    "You're receiving this because you applied to partner with Duncit.",
  'email.footer.payout': "You're receiving this because you are paid through Duncit.",
  'email.footer.support': 'This message is part of your support conversation with Duncit.',
  'email.footer.brand': "You're receiving this because you run a brand on Duncit.",
  'email.footer.venue': "You're receiving this because you list a venue on Duncit.",
  'email.footer.host': "You're receiving this because you host on Duncit.",
  'email.footer.clubAdmin': "You're receiving this because you are a Duncit club admin.",
  'email.footer.ads': "You're receiving this because you advertise on Duncit.",
  'email.footer.security':
    "You're receiving this because it affects the security of your Duncit account. Security notices cannot be switched off.",

  // --- Shared closing sentences --------------------------------------------
  'email.help.refundTiming':
    'Refunds go back to the method you paid with. Your bank decides exactly when it appears — if it has not by then, reply to this email and we will trace it.',
  'email.help.noAction': 'Nothing is needed from you — this is just so you know.',
  'email.help.onboardingNext':
    'We will confirm the call and send you the link. If the time no longer works, reply to this email and we will move it.',
  'email.help.accountPaused':
    'Nothing has been deleted. Reply to this email if you think this is a mistake, or if you want it switched back on.',
  'email.help.accountLive':
    'Nothing changed while it was paused — everything is exactly as you left it.',
  'email.help.feedbackWhy':
    'It takes under a minute, and it is what decides who gets to host, list and sell on Duncit next.',
  'email.help.payoutTiming':
    'Approved payouts settle into your Duncit wallet, and withdrawals reach your bank on the next cycle.',
  'email.help.supportReply':
    'Reply to this email and it lands straight on the ticket — no need to open anything.',
  'email.help.slotDecision':
    'A slot only holds while the request is open. If nobody decides, the host has to find another room.',
  'email.help.stockWhy':
    'A product with no stock stops being sellable and drops out of the pod product picker until you restock it.',

  // --- Member: pod cancelled, by whoever cancelled it ----------------------
  'email.userPodCancelledHost.title': 'This pod has been cancelled',
  'email.userPodCancelledHost.body':
    'The host has cancelled the pod below, so your spot is gone and your payment is being refunded. We are sorry — this is not the message we want to be sending you.',
  'email.userPodCancelledVenue.title': 'This pod has been cancelled',
  'email.userPodCancelledVenue.body':
    'The venue has withdrawn the room for the pod below, so it cannot go ahead and your payment is being refunded. Your host is looking for another slot.',
  'email.userPodCancelledDuncit.title': 'This pod has been cancelled',
  'email.userPodCancelledDuncit.body':
    'We have had to cancel the pod below. Your payment is being refunded in full, and you do not need to do anything to claim it.',

  // --- Member: the rest ----------------------------------------------------
  'email.userPodReminder.title': 'Your pod is coming up',
  'email.userPodReminder.body':
    'This is your reminder for the pod below. Bring what you need, get there a few minutes early, and your host will check you in on the door.',
  'email.userPaymentFailed.title': 'That payment did not go through',
  'email.userPaymentFailed.body':
    'Your bank did not complete the payment, so no spot is being held for you and nothing has been charged. The pod is still open — try again and the seat is yours.',
  'email.userReplacementNotFound.title': 'No replacement was found',
  'email.userReplacementNotFound.body':
    'Nobody took the spot you released before the pod started, so it stayed empty and no refund is due on it. Releasing a spot earlier gives it the best chance of being taken.',
  'email.userPodFeedback.title': 'How was it?',
  'email.userPodFeedback.body':
    'You were at the pod below. A rating from you tells the next person whether to book it — and tells the host what to keep doing.',
  'email.userAccountSuspended.title': 'Your account has been suspended',
  'email.userAccountSuspended.body':
    'Your Duncit account has been suspended, so you cannot book or join pods for now. Bookings you have already paid for are unaffected.',
  'email.userAccountReactivated.title': 'Your account is active again',
  'email.userAccountReactivated.body':
    'Your Duncit account has been restored. You can book and join pods again, and everything you had before is still there.',

  // --- Host onboarding ------------------------------------------------------
  'email.hostOnboardingBooked.title': 'Your host interview is booked',
  'email.hostOnboardingBooked.body':
    'Thanks for applying to host on Duncit. We have your interview slot below — it is a short call about what you want to run and where.',
  'email.hostOnboardingScheduled.title': 'Your host interview is confirmed',
  'email.hostOnboardingScheduled.body':
    'Your host interview is confirmed for the time below. The call link is in this email, so keep it handy.',
  'email.hostOnboardingApproved.title': 'You are a Duncit host',
  'email.hostOnboardingApproved.body':
    'Your host application is approved. Sign in to the Partners console with the account below and you can create your first pod straight away.',
  'email.hostOnboardingRejected.title': 'About your host application',
  'email.hostOnboardingRejected.body':
    'We reviewed your application to host on Duncit and are not able to approve it this time. The reason is below, and you are welcome to apply again.',

  // --- Venue onboarding -----------------------------------------------------
  'email.venueOnboardingBooked.title': 'Your venue interview is booked',
  'email.venueOnboardingBooked.body':
    'Thanks for offering your space to Duncit. We have your interview slot below — it is a short call about your rooms, your hours and your rates.',
  'email.venueOnboardingScheduled.title': 'Your venue interview is confirmed',
  'email.venueOnboardingScheduled.body':
    'Your venue interview is confirmed for the time below. The call link is in this email, so keep it handy.',
  'email.venueOnboardingApproved.title': 'Your venue is approved',
  'email.venueOnboardingApproved.body':
    'Your venue application is approved. Sign in to the Partners console with the account below to add your rooms and open your availability.',
  'email.venueOnboardingRejected.title': 'About your venue application',
  'email.venueOnboardingRejected.body':
    'We reviewed your application to list a venue on Duncit and are not able to approve it this time. The reason is below, and you are welcome to apply again.',

  // --- Brand onboarding -----------------------------------------------------
  'email.ecommOnboardingBooked.title': 'Your brand interview is booked',
  'email.ecommOnboardingBooked.body':
    'Thanks for wanting to sell through Duncit. We have your interview slot below — it is a short call about your products, your stock and your fulfilment.',
  'email.ecommOnboardingScheduled.title': 'Your brand interview is confirmed',
  'email.ecommOnboardingScheduled.body':
    'Your brand interview is confirmed for the time below. The call link is in this email, so keep it handy.',
  'email.ecommOnboardingApproved.title': 'Your brand is approved',
  'email.ecommOnboardingApproved.body':
    'Your brand application is approved. Sign in to the Partners console with the account below to list your first products and set your stock.',
  'email.ecommOnboardingRejected.title': 'About your brand application',
  'email.ecommOnboardingRejected.body':
    'We reviewed your application to sell on Duncit and are not able to approve it this time. The reason is below, and you are welcome to apply again.',

  // --- Club admin onboarding and account -----------------------------------
  'email.clubAdminOnboardingBooked.title': 'Your club admin interview is booked',
  'email.clubAdminOnboardingBooked.body':
    'Thanks for applying to run a club on Duncit. We have your interview slot below — it is a short call about the club you want to look after.',
  'email.clubAdminOnboardingScheduled.title': 'Your club admin interview is confirmed',
  'email.clubAdminOnboardingScheduled.body':
    'Your club admin interview is confirmed for the time below. The call link is in this email, so keep it handy.',
  'email.clubAdminOnboardingApproved.title': 'You are a Duncit club admin',
  'email.clubAdminOnboardingApproved.body':
    'Your club admin application is approved. Sign in to the Partners console with the account below to see the pods you now look after.',
  'email.clubAdminOnboardingRejected.title': 'About your club admin application',
  'email.clubAdminOnboardingRejected.body':
    'We reviewed your application to be a Duncit club admin and are not able to approve it this time. The reason is below, and you are welcome to apply again.',
  'email.clubAdminAccountSuspended.title': 'Your club admin access has been suspended',
  'email.clubAdminAccountSuspended.body':
    'Your club admin access has been suspended, so the pods you looked after have been handed to somebody else for now.',
  'email.clubAdminAccountReactivated.title': 'Your club admin access is active again',
  'email.clubAdminAccountReactivated.body':
    'Your club admin access has been restored. The pods assigned to you are back in your console.',

  // --- Host, running ---------------------------------------------------------
  'email.hostSlotApproved.title': 'Your slot was approved',
  'email.hostSlotApproved.body':
    'The venue has approved the slot you asked for, so the pod below can go ahead at that time. Nothing else is needed from you.',
  'email.hostSlotRejected.title': 'Your slot was not approved',
  'email.hostSlotRejected.body':
    'The venue could not give you the slot you asked for. Pick another time or another venue and the pod can still run.',
  'email.hostPodPublished.title': 'Your pod is live',
  'email.hostPodPublished.body':
    'The pod below is published and taking bookings. Your club admin is named here — they are who to reach on the day.',
  'email.hostPodFull.title': 'Your pod is full',
  'email.hostPodFull.body':
    'Every spot on the pod below is booked. Mark attendance on the day: your payout is worked out on exactly who is marked present.',
  'email.hostPodCancellationRequested.title': 'Your cancellation is in',
  'email.hostPodCancellationRequested.body':
    'We have your request to cancel the pod below. Everyone who had booked is being told and refunded, and the venue slot is released.',
  'email.hostCompletePodReminder.title': 'This pod still needs completing',
  'email.hostCompletePodReminder.body':
    'The pod below has finished but is not marked complete, and nobody is paid until it is. Completing it also locks the attendance, so check the roster first.',
  'email.hostPodFeedback.title': 'How did your pod go?',
  'email.hostPodFeedback.body':
    'You ran the pod below. Tell us how the venue, the turnout and the day itself went — it is what decides where we book you next.',

  // --- Venue, running --------------------------------------------------------
  'email.venueNewAdded.title': 'Your venue has been added',
  'email.venueNewAdded.body':
    'We have your new venue and it is with our team for review. Once it is approved, hosts can start asking for your slots.',
  'email.venueSlotPendingReminder.title': 'A slot request is still waiting',
  'email.venueSlotPendingReminder.body':
    'A host is waiting on your decision for the slot below, and the pod is close. Approving or declining takes one tap.',
  'email.venueSlotApproved.title': 'You approved a slot',
  'email.venueSlotApproved.body':
    'You approved the slot below, so it is now blocked in your calendar and the pod can go live.',
  'email.venueSlotRejected.title': 'You declined a slot',
  'email.venueSlotRejected.body':
    'You declined the slot below. It is back in your availability and the host has been told to find another time.',
  'email.venuePodPublished.title': 'A pod is live at your venue',
  'email.venuePodPublished.body':
    'The pod below is published and taking bookings at your venue. The club admin named here is who to reach on the day.',
  'email.venuePodFeedback.title': 'How did the pod go?',
  'email.venuePodFeedback.body':
    'The pod below ran at your venue. Tell us how the host and the group were — it is what decides who we send you next.',

  // --- Brand, running --------------------------------------------------------
  'email.ecommBrandAdded.title': 'Your brand has been added',
  'email.ecommBrandAdded.body':
    'We have your new brand and it is with our team for review. Once it is approved you can list products against it.',
  'email.ecommProductAdded.title': 'Your product is listed',
  'email.ecommProductAdded.body':
    'The product below is now listed with the stock you set. Hosts can add it to their pods and shoppers can find it in the Pod Shop.',
  'email.ecommStockLow.title': 'This product is running low',
  'email.ecommStockLow.body':
    'The product below has dropped to the low-stock mark you set. Restock it before it runs out and stops selling.',
  'email.ecommStockOut.title': 'This product is out of stock',
  'email.ecommStockOut.body':
    'The product below has run out. It is no longer sellable and has dropped out of the pod product picker until you restock it.',
  'email.ecommOrderFeedback.title': 'How did that order go?',
  'email.ecommOrderFeedback.body':
    'A pod carrying your product has finished. Tell us how the order went — fulfilment, packaging, anything that slowed it down.',

  // --- Club admin, running ---------------------------------------------------
  'email.clubAdminHostHelp.title': 'A host needs your help',
  'email.clubAdminHostHelp.body':
    'The host of the pod below has asked for help. Their contact is here so you can reach them directly.',
  'email.clubAdminVenueHelp.title': 'A venue needs your help',
  'email.clubAdminVenueHelp.body':
    'The venue for the pod below has asked for help. Their contact is here so you can reach them directly.',
  'email.clubAdminPodFeedback.title': 'How did the pod go?',
  'email.clubAdminPodFeedback.body':
    'You looked after the pod below. Tell us how the host, the venue and the group were — it is what we act on.',

  // --- Support ----------------------------------------------------------------
  'email.supportTicketCreated.title': 'We have your request',
  'email.supportTicketCreated.body':
    'Your support request is in and has the reference below. Quote it in anything you send us about this, and we will come back to you shortly.',
  'email.supportTicketInProgress.title': 'Someone is on it',
  'email.supportTicketInProgress.body':
    'One of our agents has picked up your ticket and is looking into it now.',
  'email.supportTicketUpdated.title': 'There is a new reply',
  'email.supportTicketUpdated.body':
    'An agent has replied on your ticket. Open it to read the whole thread, or just reply to this email.',
  'email.supportTicketResolved.title': 'This ticket is resolved',
  'email.supportTicketResolved.body':
    'We have marked your ticket resolved. If it is not sorted, reopen it from the link below and it goes straight back to the same agent.',
  'email.supportTicketReopened.title': 'This ticket is open again',
  'email.supportTicketReopened.body':
    'Your ticket has been reopened and is back with our team. Nothing from the original thread has been lost.',
  'email.supportFeedback.title': 'How did we do?',
  'email.supportFeedback.body':
    'Your ticket is closed. Tell us how the support itself went — it is the only way we find out where we are slow.',

  // --- Security ----------------------------------------------------------------
  'email.recentAccountLogin.title': 'A new sign-in to your account',
  'email.recentAccountLogin.body':
    'Your Duncit account was just signed in to from a device we have not seen before. If that was you, there is nothing to do. If it was not, change your password now.',
  'email.passwordChanged.title': 'Your password was changed',
  'email.passwordChanged.body':
    'The password on your Duncit account has been changed. If you did not do this, reset it immediately and write to us — somebody else has access.',

  // --- Ads ------------------------------------------------------------------------
  'email.adInReview.title': 'Your ad is in review',
  'email.adInReview.body':
    'We have your ad and it is with our team. We check the creative and the placement before anything goes live, and we will write again either way.',
  'email.adLive.title': 'Your ad is live',
  'email.adLive.body':
    'Your ad is approved and now showing in the placement below. Its performance is in the Ads console from the moment it starts.',
  'email.adRejected.title': 'About your ad',
  'email.adRejected.body':
    'We reviewed your ad and cannot run it as it stands. The reason is below — fix it and resubmit, and we will look again.',

  // --- Shop refunds ------------------------------------------------------------------
  'email.orderRefund.title': 'Your refund is on its way',
  'email.orderRefund.body':
    'We have refunded the order below. Nothing is needed from you — the money goes back to the method you paid with.',
};
