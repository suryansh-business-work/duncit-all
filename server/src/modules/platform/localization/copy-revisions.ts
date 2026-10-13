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
    "No warehouses yet — add one under Shipping › Pickup addresses.",
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
    "The last step. Choose who ships this brand’s parcels — your own ShipRocket account or the Duncit courier — and connect the Razorpay account it gets paid through. You can do this while your brand is in review.",
    // The Duncit courier is no longer offered: every brand ships on its own ShipRocket.
    "The last step. Choose who ships this brand’s parcels — your own ShipRocket account or the Duncit courier — and pick the Razorpay account it gets paid through. Both are picked from the accounts you saved under Integrations. You can do this while your brand is in review.",
  ],
  "partners.brandWizard.integration.bothRequired": [
    "Both connections must succeed before the brand can be submitted for review.",
    "Razorpay must connect, and shipping must be settled — the Duncit courier chosen or your ShipRocket connected — before the brand can be submitted for review.",
    "Your brand goes live in the Pod Shop only once Razorpay is connected and shipping is settled — the Duncit courier chosen or your ShipRocket connected.",
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
    "The saved credential is forgotten. A live brand leaves the Pod Shop until it is connected again.",
  ],
  "partners.brandWizard.integration.disconnected": [
    "Credential forgotten. Connect again before submitting.",
    "Credential forgotten. Connect again to keep your brand live.",
  ],
  // Credentials moved to the Partners Integrations page: the wizard now PICKS a
  // saved account for the brand instead of taking keys typed in on it.
  "partners.brandWizard.integration.shippingModeOwnHint": [
    "Parcels are booked and billed on your ShipRocket account. Connect it below.",
  ],
  "partners.brandWizard.integration.disconnect": ["Disconnect"],
  "partners.brandWizard.integration.disconnectTitle": ["Disconnect {provider}?"],
  "partners.brandWizard.integration.statusPending": [
    "Not live yet. Connect the integrations below and your approved brand goes live automatically.",
  ],
  "partners.brandWizard.integration.statusWaived": [
    "Your brand was selling before integrations were required, so it stays live. Connect them below anyway.",
  ],
  "products.brandReview.integrationsIntro": [
    "The brand ships and gets paid through its own accounts. Both must connect before approval.",
  ],
  // Website CMS: fragments are called components everywhere in the Website portal.
  "websiteApp.cms.tabs.fragments": ["Fragments"],
  "websiteApp.cms.revisions.intro": ["Every save of this website’s settings, design system and site code is kept. Restoring one saves it again as a new revision, so a restore can be undone too. Pages and fragments keep their own versions."],
  "websiteApp.cms.site.header": ["Header fragment"],
  "websiteApp.cms.site.footer": ["Footer fragment"],
  "websiteApp.cms.site.deleteText": ["\"{name}\" and its settings will be deleted. A website with pages, fragments or posts cannot be deleted — remove them first."],
  "websiteApp.cms.fragments.new": ["New fragment"],
  "websiteApp.cms.fragments.empty": ["No fragments yet. Headers, footers and reusable sections live here."],
  "websiteApp.cms.fragments.colName": ["Fragment"],
  "websiteApp.cms.fragments.colKind": ["Kind"],
  "websiteApp.cms.fragments.deleteTitle": ["Delete this fragment?"],
  "websiteApp.cms.fragments.deleteText": ["\"{name}\" will be deleted. A fragment in use as a header, footer or on a page cannot be deleted."],
  "websiteApp.cms.fragments.deleteFailed": ["Could not delete the fragment."],
  "websiteApp.cms.fragmentForm.dialogNew": ["New fragment"],
  "websiteApp.cms.fragmentForm.dialogEdit": ["Fragment"],
  "websiteApp.cms.fragmentForm.errName": ["Name the fragment."],
  "websiteApp.cms.fragmentForm.saveFailed": ["Could not save the fragment. Try again."],
  "websiteApp.cms.editor.blocks.fragments": ["Fragments"],
  "websiteApp.cms.editor.live.fragment": ["Fragment: {name}"],
  "websiteApp.cms.editor.live.missingFragment": ["Fragment \"{key}\" is not published yet"],
  // Pod Requests: placeholders were written {{x}}, which the translator never
  // fills (it reads {x}), so screens showed the braces.
  "podRequests.searchingHint": ["Looking within {{km}} km of {{place}}"],
  "podRequests.radiusValue": ["{{km}} km"],
  "podRequests.noHostsFound": ["No hosts found within {{km}} km."],
  "podRequests.noVenuesFound": ["No venues found within {{km}} km."],
  "podRequests.expandSearch": ["Search within {{km}} km"],
  "podRequests.distanceAway": ["{{km}} km away"],
  "podRequests.noteTooLong": ["Keep the note under {{max}} characters."],
  "podRequests.quotaLeft": ["{{remaining}} of {{limit}} requests left this month"],
  "podRequests.quotaReached": ["You have used all {{limit}} Pod Requests for this month."],
  "podRequests.capacity": ["Capacity {{count}}"],
  "podRequests.limitOverridden": ["Set by Duncit: {{limit}} per month."],
  "podRequests.requestedOn": ["Requested on {{date}}"],
  // The monthly Pod Request limit became admin-only (no partner setting to fall
  // back to): an empty admin field now means the default of 10.
  "podRequests.overrideHint": ["Leave empty to use the partner's own setting."],
  // Challenges became Challenge Templates (the universal tool engine), and the
  // create button now reads "New template".
  "challenge.table.empty": ["No challenges yet. Create one with “New challenge”."],
  // Every catalogue tool now runs in the engine, so "on the roadmap" no longer
  // describes any of them.
  // Challenge tools are chosen per sub-category now, with no inheritance.
  "challenge.tools.categoriesHint": ["Categories whose own mapping allows this tool. Newly mapped categories start with challenges off."],
  "challenge.tools.fields.categories": ["Mapped categories"],
  "challenge.tools.colMapped": ["Mapped categories"],
  "challenge.mapping.subtitle": ["Choose which tools each category allows. A subcategory without its own settings inherits from its category, and a category from its super category."],
  "challenge.mapping.configure": ["Configure a category"],
  "challenge.mapping.pickHint": ["Pick a super category, category or subcategory — the deepest level you choose is configured."],
  "challenge.mapping.pickFirst": ["Pick a category to see its challenge settings."],
  "challenge.mapping.empty": ["No category has challenge settings yet."],
  "challenge.mapping.colCategory": ["Category"],
  "challenge.mapping.save": ["Save mapping"],
  "challenge.tools.notReady": ["This tool is on the roadmap. It can be renamed now, and activated once the engine supports it."],
  // Warehouses sync with ShipRocket when the page opens now; there is no button to point at.
  // A brand's phone is held to ShipRocket's ten digits now, and the message says so.
  "partners.brandWizard.validation.phone": ["Enter a valid phone number (digits only)."],
  "partners.warehouses.intro": [
    "The addresses your products ship from. Sync with ShipRocket to check each one is ready for pickups.",
    "The addresses your products ship from. Each one is checked with ShipRocket when this page opens, and an approved warehouse is added there for you.",
  ],
  // "Warehouse" became ShipRocket's own term everywhere: a Pickup Address, with
  // an Address Nickname, one of them the Primary.
  "ecommPortal.products.published": [
    "{changed} of {total} products published. A product still missing a price, photo, category, warehouse or weight is skipped.",
  ],
  "ecommPortal.listing.noWarehouse": [
    "No Duncit warehouse is set for this product, so it ships from the default pickup location.",
  ],
  "ecommPortal.productEditor.warehouse": ["Warehouse"],
  "ecommPortal.productEditor.noWarehouse": ["Choose a warehouse"],
  "ecommPortal.productEditor.warehouseNotReady": [
    "This warehouse is not registered with ShipRocket yet, so parcels cannot be booked from it.",
  ],
  "ecommPortal.shipping.shiprocketSubtitle": [
    "The ShipRocket account behind every parcel: its health, and its pickup addresses against our warehouses.",
  ],
  "ecommPortal.shipping.noWarehouses": ["No warehouses yet."],
  "ecommPortal.shipping.warehouseInUse": ["Products ship from this warehouse — move them first"],
  "ecommPortal.shipping.addWarehouse": ["Add warehouse"],
  "ecommPortal.shipping.editWarehouse": ["Edit warehouse"],
  "ecommPortal.shipping.defaultWarehouse": ["Default warehouse"],
  "ecommPortal.shipping.defaultWarehouseHint": [
    "New products ship from this warehouse unless they choose another.",
  ],
  "ecommPortal.shipping.ndrReturn": ["Return it to the warehouse"],
  "fulfilment.statusRtoDelivered": ["Back at the warehouse"],
  "mweb.studioOptions.brandWarehouses": ["ShipRocket Warehouses"],
  "mweb.brandWarehouses.empty": ["This brand has no warehouses yet."],
  "mweb.brandWarehouses.loadFailed": ["Could not load the warehouses. Try again."],
  "mweb.brandWarehouses.manageHint": ["Warehouses are added and edited in the Partner app."],
  "partners.brandDetails.tabWarehouses": ["Warehouses"],
  "partners.ecommBrandPage.deleteWarehouse": ["Delete warehouse"],
  "partners.ecommBrandPage.useAsTheDefaultWarehouseFor": ["Use as the default warehouse for this brand"],
  "partners.ecommBrandPage.warehouseDeleted": ["Warehouse deleted."],
  "partners.ecommBrandPage.warehouseName": ["Warehouse name"],
  "partners.ecommBrandPage.warehouseSaved": ["Warehouse saved."],
  "partners.ecommBrandPage.warehouses": ["Warehouses"],
  "partners.ecommDashboardPage.totalWarehouses": ["Total Warehouses"],
  "partners.listProductsPage.shipFromWarehouse": ["Ship-from warehouse"],
  "partners.brandWizard.address.intro": [
    "The registered business address. Warehouses are added later under Brand settings.",
  ],
  "partners.brandWizard.integration.shiprocketStep3": [
    "Add your warehouse under Settings → Pickup Addresses and note its nickname.",
  ],
  "partners.brandWizard.danger.deleteBody": [
    "Permanently removes this brand, its warehouses and its review history. An approved brand with products cannot be deleted — deactivate it instead.",
  ],
  "partners.warehouses.title": ["Warehouses"],
  "partners.warehouses.syncing": ["Checking your warehouses with ShipRocket…"],
  "products.pickup.panelTitle": ["Pickup / warehouse locations"],
  "products.pickup.noReadyWarehouses": [
    "No warehouse is on the ShipRocket account yet — add one under Settings › Duncit Warehouse Locations. A product can only ship from an address ShipRocket can collect from.",
  ],
  "products.brandReview.pickupHint": [
    "Registering a location with ShipRocket lets SHIP orders pick up from this brand’s warehouse.",
  ],
  "products.delivery.targetHint": [
    "ShipRocket rates and books the courier live from the warehouse below. Host and Venue delivery are hand-carried and never quoted.",
  ],
  "products.delivery.chargeFallbackHint": [
    "Fallback only — charged when ShipRocket cannot rate the warehouse to the buyer.",
  ],
  "products.media.warehouse": ["Warehouse"],
  "products.settings.duncitWarehouses": ["Duncit warehouses"],
  "products.settings.warehouseRequestsEmpty": ["No warehouse requests."],
  "shell.nav.duncitWarehouseLocations": ["Duncit Warehouse Locations"],
  "shell.nav.warehouseApproval": ["Warehouse Approval"],
  "email.ecommBrandDeleted.body": [
    "The brand below has been removed from Duncit, along with its warehouses. Orders already placed are not affected. You can register a new brand from the Partners console at any time.",
  ],
  // Deletion requests: the running-order line names the buyer and the amount going back,
  // and the cancel option points at the Deletion Refunds page.
  "partners.deletionRequest.orderLine": ["Placed {date} · {units} unit(s) of this item"],
  "partners.deletionRequest.modeCancelBody": [
    "Once the Products team approves, each running order is cancelled and the buyer gets a full refund with an apology. An order that also contains other items keeps running for those items.",
  ],
  // Staging builds have their own channels now, beside the production ones.
  "tech.appBuilds.settingsSubtitle": [
    "Which Slack channels a finished build announces itself in — one for Android, one for iOS. The bot must be a member of each channel.",
  ],
  // The sandbox API user has its own fields now, apart from the production email and password.
  "partners.brandWizard.integration.sandboxHint": [
    "On: orders for brands using this connection are booked on ShipRocket’s sandbox, so no courier collects them and nothing is charged. Enter your sandbox API user (ShipRocket → Settings → Additional Settings → Sandbox) as the email and password above. Off: real shipments.",
  ],  // Completing a pod no longer pays anyone by itself: the payouts wait for
  // Finance to approve the request, so every line that promised an instant
  // wallet credit was reworded.
  "mweb.hostShare.title": ["Your share (credited to your wallet on completion)"],
  "shell.hostShare.title": ["Your share (credited to your wallet on completion)"],
  "mweb.hostPodActions.completeHint": [
    "This pod’s photos and videos are the ones added on the Upload Pod Media page — yours and your guests’. Your payout is credited to your wallet as soon as the pod is completed.",
  ],
  "shell.hostPodActions.completeHint": [
    "This pod’s photos and videos are the ones added on the Upload Pod Media page — yours and your guests’. Your payout is credited to your wallet as soon as the pod is completed.",
  ],
  "admin.completePod.released": ["Pod completed — payouts released"],
  "admin.completePod.payoutNote": [
    "Payouts are credited to the beneficiary wallets when the pod is completed.",
  ],
  "admin.completePod.releasedBody": [
    "Each payout below has been credited to its beneficiary's wallet.",
  ],
  "finance.paymentRelease.venueAmountBookedSlotPrice": ["Venue amount (booked slot price)"],
  "finance.paymentRelease.approveVenueBillingAndHostPayment": [
    "Approve venue billing and host payment release requests.",
  ],
  // Food left Type & Capacity for a section of its own in the venue form.
  "partners.foodOrders.noFood": [
    "This venue does not offer food. Turn food on in its Type & Capacity section to take orders.",
  ],
};
