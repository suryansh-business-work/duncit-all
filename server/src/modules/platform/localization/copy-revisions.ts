/**
 * English copy that was REWORDED in code for keys deployed databases already hold.
 *
 * `seedDefaults` only creates keys, so a reworded bundle string never reached an
 * environment that already had the key — its stored text kept winning over the
 * client fallback, and someone had to retype it in Admin > Localization.
 *
 * Each entry is a key and the English it USED to ship with. On boot a row still
 * carrying exactly one of those texts is moved to the key's current shipped
 * text. A row an operator edited no longer matches, so it is never overwritten.
 *
 * Append the OLD text whenever you reword a key (the `update-copy` skill does).
 * An applied entry matches nothing on the next boot, so entries never need pruning.
 */
export const COPY_REVISIONS: Readonly<Record<string, readonly string[]>> = {
  "admin.locations.launchTargetHint": [
    "Shown in the app as “We’ll launch once X people have added their names”. Default 2000.",
  ],
  "mweb.cityLaunch.shareText": [
    "Duncit is coming to {city}. Add your name so it launches sooner: {url}",
  ],
  // The waitlist page redesign (four full-height sections): the city moved out
  // of these two lines onto its own row, and the role cards were reworded.
  "mweb.cityLaunch.peopleInFor": ["people are in for {city}"],
  "mweb.cityLaunch.notifyCta": ["Notify me when {city} launches"],
  "mweb.cityLaunch.hostEyebrow": ["Club leader"],
  "mweb.cityLaunch.hostTitle": ["Want to host your own meet-ups?"],
  "mweb.cityLaunch.hostBody": [
    "Super passionate about your hobby? Love getting people together? Create your own club on Duncit.",
  ],
  "mweb.cityLaunch.venueTitle": ["Have a space people can hang out in?"],
  "mweb.cityLaunch.venueBody": [
    "Looking for more footfall at your cafe, studio, turf or ground? Make your space a community home.",
  ],
  "mweb.cityLaunch.volunteerEyebrow": ["Volunteer"],
  "mweb.cityLaunch.volunteerTitle": ["Want to help get this going?"],
  "mweb.cityLaunch.volunteerBody": [
    "Help kick-start Duncit in your city, from spreading the word to setting up meet-ups.",
  ],
  // MSG91 Settings became a page of its own beside the OTP logs, so the
  // "not configured" line stopped sending people to Environment Variables.
  "tech.msg91.notConfigured": [
    "MSG91 is not configured yet. Add the widget ID and auth key in Environment Variables → MSG91 (SMS OTP).",
  ],
  // MSG91 refused 31-day analytics windows, so the page now asks for at most 5.
  "tech.msg91.analyticsSubtitle": ["Daily OTP widget traffic from MSG91 — up to 31 days at a time."],
  // App Store Connect refuses a copyright line holding a URL; the hint now says so.
  "tech.storeListing.copyrightHint": ["e.g. 2026 Duncit. Apple requires it to submit."],
  // The finance-negative auto-cancel sweep sends this email too, and its refund
  // follows the venue's refund ladder — so the old line promised every cancelled
  // attendee a full refund the partial-refund path was never going to pay.
  "email.userPodCancelledDuncit.body": [
    "We have had to cancel the pod below. Your payment is being refunded in full, and you do not need to do anything to claim it.",
  ],
  // The line under the WhatsApp box when the account's own number is typed back.
  "mweb.contactChange.whatsappCurrent": [
    "This is your current WhatsApp number, enter a different number to make a change.",
  ],
  // The ecomm console now keeps its own pickup addresses, so an empty warehouse
  // picker no longer sends the operator to the Products console for them.
  "ecommPortal.productEditor.noWarehouses": [
    "No Duncit warehouses yet — add one under Pickup locations in the Products console.",
  ],
  // A pickup address now belongs to the ShipRocket account: the page takes in
  // whatever the account has, adding one creates it there first, and one the
  // account holds is changed or removed in ShipRocket. So the old copy offered
  // an "import" step that is gone, and promised a local save ShipRocket had
  // not accepted.
  "ecommPortal.shipping.pickupsIntro": [
    "Every order is booked under its warehouse nickname, which must match a pickup address on the ShipRocket account exactly. A warehouse you add here is sent to ShipRocket as it saves; one ShipRocket already has can be brought in below.",
  ],
  "ecommPortal.shipping.saveWarehouse": ["Save and send to ShipRocket"],
  "ecommPortal.shipping.warehouseInShiprocket": ["Warehouse saved and added to ShipRocket"],
  "ecommPortal.shipping.deleteWarehouseMessage": [
    "The warehouse is removed here. ShipRocket keeps its own copy of the pickup address.",
  ],
  // The composer also opens from Social Calendar now, which has no Accounts tab.
  "marketing.social.connectFirst": ["Connect an account on the Accounts tab first."],
  // A brand may now ship with the Duncit courier instead of its own ShipRocket
  // account, so "both must connect" stopped being true.
  // Integration moved to the LAST step and stopped gating review: a brand is
  // submitted and approved first, and goes live once it is connected.
  "partners.brandWizard.integration.intro": [
    "Connect the ShipRocket and Razorpay accounts this brand ships and gets paid through. Both must connect before the brand can be submitted.",
    "Choose who ships this brand’s parcels — your own ShipRocket account or the Duncit courier — and connect the Razorpay account it gets paid through.",
  ],
  "partners.brandWizard.integration.bothRequired": [
    "Both connections must succeed before the brand can be submitted for review.",
    "Razorpay must connect, and shipping must be settled — the Duncit courier chosen or your ShipRocket connected — before the brand can be submitted for review.",
  ],
  "partners.brandWizard.review.integrationsOk": ["ShipRocket and Razorpay are connected."],
  "partners.brandWizard.review.integrationsMissing": [
    "Connect both ShipRocket and Razorpay in the Integration step.",
    "Settle shipping and connect Razorpay in the Integration step.",
  ],
  "partners.brandWizard.intro": ["Ten short steps. Save a draft at any point and come back — your progress is kept."],
  "partners.brandWizard.payout.razorpayPending": ["Connect Razorpay in the Integration step to confirm payouts."],
  "partners.brandWizard.integration.disconnectBody": [
    "The saved credential is forgotten and the brand cannot be submitted until it is connected again.",
  ],
  "partners.brandWizard.integration.disconnected": ["Credential forgotten. Connect again before submitting."],
  // MSG91's widget analytics API answers at most 5 days per request.
  "tech.msg91.analyticsSubtitle": ["Daily OTP widget traffic from MSG91 — up to 31 days at a time."],
  "products.brandReview.integrationsIntro": [
    "The brand ships and gets paid through its own accounts. Both must connect before approval.",
  ],
};
