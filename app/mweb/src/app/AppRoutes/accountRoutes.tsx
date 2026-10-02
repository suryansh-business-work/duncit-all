import { Navigate, Route } from 'react-router';
import { AccountHealthPage, AllTicketsPage, BadgesPage, BookingPage, CallbackPage, CommPreferencePage, DuncitCoinPage, FaqsPage, FeedbackPage, GiftCardCheckoutPage, GiftCardClaimPage, GiftCardRedeemPage, GiftCardsPage, GrievancePage, LeaderboardPage, LiveTicketsPage, MailPreferencePage, MembershipPage, PodHistoryDetailsPage, PodHistoryPage, PodIdeasPage, PodPlansPage, PolicyPage, PrivacyPage, ReferralPage, SignupReferralPage, SignupSurveyPage, SmsPreferencePage, SosPage, SupportChatPage, SupportHubPage, SupportTicketsPage, TicketDetailPage, VenueHealthPage, WhatsAppPreferencePage } from './lazyPages';
import { withAuth } from './routeGuards';

/** Rewards, support and account-settings routes. */
export function accountRoutes() {
  return (
    <>
        <Route path="/faqs" element={withAuth(<FaqsPage />)} />
        <Route path="/badges" element={withAuth(<BadgesPage />)} />
        <Route path="/policies/:slug" element={withAuth(<PolicyPage />)} />
        <Route path="/pod-ideas" element={withAuth(<PodIdeasPage />)} />
        <Route path="/referral" element={withAuth(<ReferralPage />)} />
        <Route path="/duncit-coin" element={withAuth(<DuncitCoinPage />)} />
        <Route path="/leaderboard" element={withAuth(<LeaderboardPage />)} />
        <Route path="/membership" element={withAuth(<MembershipPage />)} />
        <Route path="/gift-cards" element={withAuth(<GiftCardsPage />)} />
        <Route path="/gift-cards/checkout" element={withAuth(<GiftCardCheckoutPage />)} />
        <Route path="/gift-cards/redeem" element={withAuth(<GiftCardRedeemPage />)} />
        {/* The shared claim link — singular, like /club/:clubSlug. Auth-gated,
            so an unread link parks in `?redirect` and opens after sign-in. */}
        <Route path="/gift-card/:code" element={withAuth(<GiftCardClaimPage />)} />
        <Route path="/pod-plans" element={withAuth(<PodPlansPage />)} />
        <Route path="/pod-history" element={withAuth(<PodHistoryPage />)} />
        <Route path="/pod-history/:membershipId" element={withAuth(<PodHistoryDetailsPage />)} />
        {/* Booking deep link from the payment-receipt email — resolves the
            booking server-side and forwards to its pod detail page. */}
        <Route path="/booking/:bookingId" element={withAuth(<BookingPage />)} />
        <Route path="/support" element={withAuth(<SupportHubPage />)} />
        <Route path="/support/sos" element={withAuth(<SosPage />)} />
        <Route path="/support/callback" element={withAuth(<CallbackPage />)} />
        <Route path="/support/tickets" element={withAuth(<SupportTicketsPage />)} />
        <Route path="/support/live" element={withAuth(<LiveTicketsPage />)} />
        <Route path="/support/all" element={withAuth(<AllTicketsPage />)} />
        <Route path="/support/feedback" element={withAuth(<FeedbackPage />)} />
        <Route path="/support/grievance" element={withAuth(<GrievancePage />)} />
        <Route path="/tickets/:id" element={withAuth(<TicketDetailPage />)} />
        <Route path="/live-chat" element={withAuth(<SupportChatPage />)} />
        <Route path="/tickets" element={<Navigate to="/support/live" replace />} />
        {/* Native uses /support/chat for the same feature; keep the path working
            on mWeb instead of 404ing (route parity, BUG-02). */}
        <Route path="/support/chat" element={<Navigate to="/support/live" replace />} />
        <Route path="/bouncers" element={<Navigate to="/support" replace />} />
        <Route path="/account/health" element={withAuth(<AccountHealthPage />)} />
        {/* The one door to the three channels — Profile Settings links here,
            and each channel screen is a door off this one. */}
        <Route path="/account/communication" element={withAuth(<CommPreferencePage />)} />
        <Route path="/account/mail-preference" element={withAuth(<MailPreferencePage />)} />
        {/* The one-click door out of an email. NOT auth-gated: the person
            clicking it is reading their inbox, and the signature in the link is
            what proves whose preferences these are. */}
        <Route path="/unsubscribe" element={<MailPreferencePage fromLink />} />
        <Route
          path="/account/whatsapp-preference"
          element={withAuth(<WhatsAppPreferencePage />)}
        />
        <Route path="/account/sms-preference" element={withAuth(<SmsPreferencePage />)} />
        <Route path="/account/privacy" element={withAuth(<PrivacyPage />)} />
        <Route path="/venues/:venueId/health" element={withAuth(<VenueHealthPage />)} />
        <Route path="/signup-survey" element={withAuth(<SignupSurveyPage />)} />
        <Route path="/signup-referral" element={withAuth(<SignupReferralPage />)} />
    </>
  );
}
