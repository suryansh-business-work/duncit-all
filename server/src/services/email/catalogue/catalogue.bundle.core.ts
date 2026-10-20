/**
 * The English copy for the core emails — sign-in codes, access, bookings,
 * payouts, onboarding meetings and inbound replies (CLAUDE.md rule 38).
 *
 * These forty-odd templates used to ship as `.mjml` files with their words
 * typed straight into the markup, so no language but English could ever reach
 * them. Their bodies now live in the `catalogue.bodies.*` files, and every
 * sentence they render is a key here — the same English, word for word, that
 * the files carried.
 *
 * Spread into `EMAIL_FALLBACK` beside `CATALOGUE_FALLBACK`, and mapped in
 * `scripts/lib/bundle-catalogue.mjs` (EMAIL_SPREAD_FILES) so the translation
 * gate and the seeder read it. A `{{name}}` inside a value is filled by the
 * same substitution pass as the template's own variables, and the
 * auto-translator refuses any translation that drops one.
 */
export const CORE_EMAIL_FALLBACK: Record<string, string> = {
  // --- Shared pieces -------------------------------------------------------
  'email.common.linkFallback': 'Button not working? Paste this link into your browser:',
  'email.common.referenceLabel': 'Reference ID',
  'email.otp.codeLabel': 'Your code',
  'email.otp.expires': 'This code expires in {{expiresMinutes}} minutes.',
  'email.booking.view': 'View booking',

  // --- Welcome --------------------------------------------------------------
  'email.welcome.title': 'Welcome to Duncit',
  'email.welcome.body': "Thanks for signing up to Duncit. We're excited to have you on board.",
  'email.welcome.cta': 'Get started',
  'email.welcome.notYou': "If you didn't create this account, you can ignore this email.",

  // --- One-time codes -------------------------------------------------------
  'email.verifyEmailOtp.title': 'Verify your Duncit email',
  'email.verifyEmailOtp.body': 'Use this code to verify your account.',
  'email.verifyEmailOtp.ignore': 'If you did not request this, you can ignore this email.',
  'email.passwordResetOtp.title': 'Reset your Duncit password',
  'email.passwordResetOtp.body': 'Use this code to reset your password.',
  'email.passwordResetOtp.ignore':
    'If you did not request a password reset, you can safely ignore this email — your password will not change.',
  'email.passwordChangeOtp.title': 'Confirm your password change',
  'email.passwordChangeOtp.body': 'Use this code to confirm changing your Duncit password.',
  'email.passwordChangeOtp.ignore':
    'If you did not request a password change, your password is still safe — ignore this email and consider reviewing your account security.',
  'email.accountDeletionOtp.title': 'Confirm account deletion',
  'email.accountDeletionOtp.body':
    'Use this code to permanently close your Duncit account. This action cannot be undone.',
  'email.accountDeletionOtp.ignore':
    'If you did not request to delete your account, ignore this email — your account will stay active and no changes will be made.',
  'email.loginOtp.title': 'Your sign-in code',
  'email.loginOtp.body': 'Use this code to sign in to your Duncit account.',
  'email.loginOtp.expires': 'The code expires in {{expiresMinutes}} minutes and can be used once.',
  'email.loginOtp.ignore':
    'If you did not try to sign in, ignore this email — the code is useless on its own and nobody has been let in. If you keep receiving these, somebody knows your address; your password is untouched either way.',
  'email.portalLoginOtp.title': 'Your sign-in code',
  'email.portalLoginOtp.body': 'Use this code to sign in to {{portal}}.',
  'email.portalLoginOtp.expires':
    'This code expires in {{expiresMinutes}} minutes and works only for {{portal}}.',
  'email.portalLoginOtp.ignore':
    'If you did not try to sign in, ignore this email — the code is useless on its own and nobody has been let in. Tell your administrator if you keep receiving these.',
  'email.envAccessOtp.title': 'Environment Variables access code',
  'email.envAccessOtp.body':
    'Someone signed in to the Tech console asked to open Environment Variables. Share this code only if you know who asked and why.',
  'email.envAccessOtp.expires':
    'This code expires in {{expiresMinutes}} minutes and can be used once. Never forward it — it unlocks every key and secret on the platform.',
  'email.envAccessOtp.ignore':
    'If nobody on your team asked for this, do not share the code and review who has Tech console access.',

  // --- Admin and partner access ---------------------------------------------
  'email.adminCredentials.title': 'Duncit Super Admin Credentials',
  'email.adminCredentials.body': 'Please use the credentials below to access the Duncit admin dashboard.',
  'email.adminCredentials.emailLabel': 'Email',
  'email.adminCredentials.passwordLabel': 'Password',
  'email.adminCredentials.cta': 'Open Admin Dashboard',
  'email.adminCredentials.changeNowTitle': 'Change this password',
  'email.adminCredentials.changeNow':
    'This is a default credential. Change the password immediately after first login.',
  'email.adminAccessGranted.title': 'Welcome to Duncit as an Admin',
  'email.adminAccessGranted.body':
    "You've been granted Admin access. You now have full access to the Duncit admin console.",
  'email.adminAccessGranted.cta': 'Open Admin Console',
  'email.adminAccessGranted.safetyTitle': 'Keep your account safe',
  'email.adminAccessGranted.safetyBody':
    'Do not give your account access to anyone. Never share your password or login link. Admin access carries full control of the platform, so sharing it is risky and can compromise every Duncit user. If you ever suspect your account is compromised, contact the team immediately.',
  'email.adminAccessRevoked.title': 'Admin access removed',
  'email.adminAccessRevoked.body':
    'Your Admin access to Duncit has been revoked. You no longer have access to the admin console.',
  'email.adminAccessRevoked.unchanged':
    'Your Duncit account itself is unchanged — you can still use the Duncit app as usual. If you believe this was a mistake, please contact your administrator.',
  'email.partnerAccess.title': 'Welcome aboard',
  'email.partnerAccess.body':
    'Your partner access on Duncit is now active. Manage everything from your Partners account.',
  'email.partnerAccess.accessLabel': 'Access granted',
  'email.partnerAccess.cta': 'Open your Partners account',
  'email.partnerAccess.loginTitle': 'Your login credentials',
  'email.partnerAccess.loginBody':
    'Sign in with your existing Duncit account — email {{email}} and your Duncit password. Forgot it? Use “Forgot password” on the login page. Never share your password with anyone.',

  // --- Inbound: newsletter, contact, FAQ, contracts ---------------------------
  'email.newsletterWelcome.title': "You're in",
  'email.newsletterWelcome.body':
    "Hi {{email}}, thanks for joining the {{app_name}} newsletter. We'll send you the freshest pods, clubs, and community happenings. Never spam.",
  'email.newsletterWelcome.cta': 'Explore {{app_name}}',
  'email.newsletterWelcome.unsubscribe':
    'You can unsubscribe at any time from the link in our future emails.',
  'email.contactReceived.title': 'We received your message',
  'email.contactReceived.body':
    'Thanks for reaching out to {{app_name}}. Our team has received your message and will get back to you shortly at this email address.',
  'email.contactReceived.messageLabel': 'Your message',
  'email.contactReceived.followUp':
    'Need to follow up? Just reply to this email or write to {{support_email}}.',
  'email.faqReceived.title': 'Thanks for asking',
  'email.faqReceived.body':
    "Your question has been added to the {{app_name}} FAQ queue. If we publish an answer, you'll see it on our help center and we may also reply to this email.",
  'email.faqReceived.questionLabel': 'Your question',
  'email.faqReceived.faster': 'Need a faster answer? Email {{support_email}}.',
  'email.signedContract.title': 'Signed contract',
  'email.signedContract.body':
    '{{sender_name}} has shared a signed contract with you. The signed PDF is attached to this email.',
  'email.signedContract.contractLabel': 'Contract',
  'email.signedContract.records':
    'Keep this copy for your records. If you were not expecting it, reply to this email and let us know.',

  // --- Bookings and pods ----------------------------------------------------
  'email.eventTicket.title': "You're in!",
  'email.eventTicket.body':
    'Your ticket for {{event_title}} is attached as a PDF. Show the QR code at entry.',
  'email.eventTicket.keepSafe': 'Keep this ticket safe — the QR code is your entry pass.',
  'email.paymentReceipt.title': 'Payment received',
  'email.paymentReceipt.body':
    'Thanks for your booking. Your slot is confirmed and a tax invoice is attached to this email.',
  'email.paymentReceipt.amountLabel': 'Amount paid',
  'email.paymentReceipt.bookingLabel': 'Booking',
  'email.paymentReceipt.paymentIdLabel': 'Payment ID',
  'email.paymentReceipt.help': 'Need help? Reply to this email.',
  'email.podUpdated.title': 'Pod details updated',
  'email.podUpdated.body': 'The host updated the details of a pod you joined.',
  'email.podUpdated.scheduledLabel': 'Scheduled for',
  'email.podUpdated.review':
    'Open the pod in the Duncit app to review the latest title, photos and description.',
  'email.podCancelled.title': 'Pod cancelled',
  'email.podCancelled.body': 'The host cancelled a pod you joined.',
  'email.podCancelled.wasScheduledLabel': 'Was scheduled for',
  'email.podCancelled.explore': 'Explore other pods near you anytime in the Duncit app.',
  'email.backoutFilled.title': 'Your spot was filled',
  'email.backoutFilled.body': 'A replacement has booked the seat you released.',
  'email.backoutFilled.complete':
    'Your Backout is now complete. You can book this pod again anytime from the app.',

  // --- Money out --------------------------------------------------------------
  'email.payoutStatement.title': 'Your payout is approved',
  'email.payoutStatement.body':
    'Your {{statement_type}} for {{pod_title}} has been approved ({{approval_type}} release). The signed statement PDF is attached.',
  'email.payoutStatement.venueBillLabel': 'Venue bill',
  'email.payoutStatement.gstLabel': 'GST',
  'email.paymentReleaseApproved.title': 'Payment release approved',
  'email.paymentReleaseApproved.body': 'Your {{release_type}} for {{pod_title}} has been approved.',
  'email.paymentReleaseApproved.approvedLabel': 'Approved amount (Rs)',
  'email.paymentReleaseApproved.requestedLabel': 'Requested amount (Rs)',
  'email.paymentReleaseApproved.releaseTypeLabel': 'Release type',
  'email.podCalculator.calculationLabel': 'Calculation',
  'email.podCalculator.estimateTitle': 'An estimate, not an invoice',

  // --- Onboarding meetings and interviews -------------------------------------
  'email.meetingBooked.title': 'Your onboarding meeting is booked',
  'email.meetingBooked.body':
    'Thank you for your submission! Your {{kind}} onboarding meeting with the Duncit team is booked for the slot below.',
  'email.meetingBooked.joinEarly':
    'Our onboarding team will meet you at your selected slot — please join 5 minutes early. You can reschedule or cancel anytime from Earn with Duncit.',
  'email.meetingScheduled.title': 'Your onboarding meeting is scheduled',
  'email.meetingScheduled.body':
    'Your {{kind}} onboarding meeting with the Duncit team is confirmed for the slot below.',
  'email.meetingScheduledAdmin.title': '{{kind}} onboarding meeting scheduled',
  'email.meetingScheduledAdmin.body':
    'A {{kind}} onboarding meeting has been scheduled for {{name}} ({{email}}).',
  'email.meetingScheduledAdmin.openLink': 'Open meeting link',
  'email.meetingUpdated.title': 'Your Duncit onboarding meeting was updated',
  'email.meetingCancelled.title': 'Your onboarding meeting is cancelled',
  'email.meetingCancelled.body':
    'Your {{kind}} onboarding meeting that was booked for the slot below has been cancelled.',
  'email.meetingCancelled.rebook':
    'Changed your mind? You can book a new slot anytime from Earn with Duncit.',
  'email.meetingApproved.title': 'Congratulations!',
  'email.meetingApproved.body':
    "Your {{kind}} onboarding has been approved after your meeting with the Duncit team. You're all set — open the Duncit app to start.",
  'email.meetingRejected.title': 'Thank you for your interest',
  'email.meetingRejected.body':
    "After your {{kind}} onboarding meeting, we're unable to move forward at this time. You're always welcome to apply again in the future — thank you for considering Duncit.",
  'email.interviewApplicant.title': 'We got your {{type}} application!',
  'email.interviewApplicant.body':
    "We've received your request to join Duncit as a {{type}}. Our team will review your application and reach out to confirm one of your preferred meeting slots.",
  'email.interviewApplicant.slotsLabel': 'Your preferred slots',
  'email.interviewApplicant.aboutLabel': 'About',
  'email.interviewAdmin.title': 'New {{type}} Application',
  'email.interviewAdmin.body': 'A new {{type}} application has been submitted on Duncit.',
  'email.interviewAdmin.applicantLabel': 'Applicant',
  'email.interviewAdmin.emailLabel': 'Email',
  'email.interviewAdmin.phoneLabel': 'Phone',
  'email.interviewAdmin.businessLabel': 'Business',
  'email.interviewAdmin.slotsLabel': 'Preferred Slots',
  'email.interviewAdmin.aboutLabel': 'About',
  'email.interviewAdmin.openAdmin': 'Open in Admin',
  'email.interviewScheduled.title': 'Your meeting is scheduled',
  'email.interviewScheduled.body':
    'Your {{type}} interview with the Duncit team is confirmed for the slot below.',

  // --- Host category requests -------------------------------------------------
  'email.hostRequest.requestIdLabel': 'Request ID',
  'email.hostRequestSubmitted.title': 'Your request has been submitted',
  'email.hostRequestSubmitted.body':
    "Thank you for expanding your hosting journey with Duncit. Our onboarding team will review your request for the new category and get in touch with you shortly. You'll receive updates through Notifications and Email.",
  'email.hostRequestAcknowledged.title': 'Request received',
  'email.hostRequestAcknowledged.body':
    "We've received your request to host in a new category and our onboarding team is reviewing it. We'll reach out with the next steps soon.",
  'email.hostRequestApproved.title': 'Congratulations!',
  'email.hostRequestApproved.body':
    'Your request to host in a new category has been approved. You can now start hosting experiences in this category on Duncit.',
  'email.hostRequestRejected.title': 'Request update',
  'email.hostRequestRejected.body':
    "Thank you for your interest in hosting a new category. After review, we're unable to approve your request at this time.",

  // --- App release builds (internal) -------------------------------------------
  'email.appRelease.eyebrow': 'New Android build',
  'email.appRelease.title': '{{app_name}} v{{version}}',
  'email.appRelease.body': '{{build_name}} · {{apk_size}} is ready to install and test.',
  'email.appRelease.download': 'Download APK',
  'email.appRelease.installNote': 'Direct install link · works on any Android device',
  'email.appRelease.whatsNew': "What's new",
  'email.appRelease.commitsTitle': 'Commits in this build ({{commits_count}})',
  'email.appRelease.filesChanged': 'Files changed',
  'email.appRelease.insertions': 'Insertions',
  'email.appRelease.deletions': 'Deletions',
  'email.appRelease.range': 'Range',
  'email.appRelease.builtOn': 'Built on {{built_on}} · Internal test build.',
  'email.appRelease.footer': "You're receiving this because you're on the {{app_name}} release list.",
};
