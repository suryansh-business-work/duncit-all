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
};
