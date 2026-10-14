import type { CatalogueFlow } from './catalogue.types';

/**
 * Permission and data-isolation gap scenarios for the partner side (second half):
 * partners-app studios, the Club Admins / Regional / Pods / Onboarding / Products /
 * Clubs / Venues consoles, the Duncit Pet Store (ecomm.duncit.com) and its
 * E-commerce console. Flows sharing a name with another catalogue file are merged
 * into it. The pet store and the Partner Brand area (partners-app /ecomm-brand)
 * are separate products and are kept in separate flows.
 */
export const PARTNER_GAP_FLOWS_B: readonly CatalogueFlow[] = [
  {
    name: 'Partners: Club Admin Dashboard',
    description: 'partners-app /club-admin/dashboard. SectionGate needs CLUB_ADMIN; the server reads clubAdminDashboard / clubAdminDashboardTable for clubs whose admin_user_ids hold the caller.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Club admin dashboard (/club-admin/dashboard)',
        description:
          'A guest is sent to /login, a signed-in user without CLUB_ADMIN is bounced to / (then /earn or their own studio), and the server never returns another admin\'s clubs: a non-admin token gets an empty dashboard, not an error.',
        steps: [
          ['Signed out, open https://partners-app.duncit.com/club-admin/dashboard', 'Redirected to /login?redirect=%2Fclub-admin%2Fdashboard'],
          ['Sign in as a USER with no partner role and type /club-admin/dashboard', 'Nothing renders; the user is redirected to / and lands on /earn'],
          ['Sign in as a HOST only and type /club-admin/dashboard', 'Redirected to / which opens the Host studio (/host/options)'],
          ['Call clubAdminDashboard with a HOST token', 'No error; the totals are empty because the caller administers no club'],
          ['Call clubAdminDashboard with no token', 'UNAUTHENTICATED "Not authenticated"'],
          ['Sign in as CLUB_ADMIN of club A only and open the dashboard', 'Only club A is counted; club B (another admin) never appears'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Club Admin Mark Attendance',
    description: 'partners-app /club-admin/clubs/:clubId/pods/:id/attendance: podAttendanceBoard resolves the viewer (pod host or club admin of the pod\'s real club) and clubAdminForceAttendance checks assertClubAdminForPod.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Attendance (/club-admin/clubs/:clubId/pods/:id/attendance)',
        description:
          'Guests go to /login, non-CLUB_ADMIN users are bounced by SectionGate, and the server checks the pod\'s actual club (not the :clubId in the URL): another club\'s pod is refused "You do not administer this club".',
        steps: [
          ['Signed out, open /club-admin/clubs/<clubId>/pods/<podId>/attendance', 'Redirected to /login with that path as the redirect'],
          ['Sign in as VENUE_OWNER only and type the same URL', 'Redirected to / and on to the Venue studio; the attendance board never renders'],
          ['As CLUB_ADMIN of club A open /club-admin/clubs/<club A id>/pods/<pod of club B>/attendance', 'The board does not load and shows "You do not administer this club"'],
          ['Call clubAdminForceAttendance for a pod of club B with the club A admin token', 'FORBIDDEN "You do not administer this club"; no ticket changes'],
          ['Call podAttendanceBoard with a malformed pod id', 'BAD_USER_INPUT "Invalid pod id"'],
          ['As the club A admin call requestPodAttendanceOtp on a club A pod they do not host', 'Refused with "Only the pod host verifies an attendee here"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Club Admin Pod Monitoring',
    description: 'partners-app /club-admin/monitoring (Clubs hub tab): clubAdminPodAuditLogsTable requires CLUB_ADMIN or SUPER_ADMIN on the token and scopes to the caller\'s clubs.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Pod monitoring (AI) (/club-admin/monitoring)',
        description: 'Guests go to /login, users without CLUB_ADMIN are bounced by SectionGate, and the server refuses a token without CLUB_ADMIN with "Access Denied".',
        steps: [
          ['Signed out, open /club-admin/monitoring', 'Redirected to /login?redirect=%2Fclub-admin%2Fmonitoring'],
          ['Sign in as USER only and type /club-admin/monitoring', 'Redirected to / and on to /earn'],
          ['Call clubAdminPodAuditLogsTable with a HOST token', 'FORBIDDEN "Access Denied"'],
          ['As CLUB_ADMIN of club A open the monitoring tab', 'Only activity for club A\'s pods is listed, or "No pod activity recorded yet."'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Change Requests',
    description: 'Per-studio change requests (/host/change-requests, /venues/change-requests, /club-admin/change-requests). myPodChangeBoard is requireAuth and scoped to the caller; requestPodChange checks the caller\'s role on THAT pod.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Change requests (/host/change-requests)',
        description:
          'Guests go to /login, users without HOST are bounced (the sidebar offers "Be a Host"), and the server refuses filing, withdrawing or answering for a pod or request that is not the caller\'s.',
        steps: [
          ['Signed out, open /host/change-requests', 'Redirected to /login?redirect=%2Fhost%2Fchange-requests'],
          ['Sign in as ECOMM_MANAGER only and type /host/change-requests', 'Redirected to /; the sidebar Host group shows only "Be a Host"'],
          ['As HOST A call requestPodChange(role: HOST) for a pod hosted by HOST B', 'FORBIDDEN "You do not host this pod"; no request is filed'],
          ['As VENUE_OWNER call requestPodChange(role: VENUE) for a pod at a venue they do not own', 'FORBIDDEN "This pod is not booked at a venue you own"'],
          ['As HOST A call withdrawPodChange on HOST B\'s request', 'FORBIDDEN "This is not your change request"'],
          ['As HOST A call respondToPodChange on an offer made to someone else', 'FORBIDDEN "This offer was not made to you"'],
          ['Call podChangeRequests (the admin queue) with a HOST token', 'FORBIDDEN "Access Denied"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: E-Commerce Dashboard',
    description: 'partners-app /ecomm/dashboard (Partner Brand, not the pet store). SectionGate needs ECOMM_MANAGER and the is_product_visible flag; partnerEcommStats is requireAuth and owner-scoped.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Brand dashboard (/ecomm/dashboard)',
        description: 'Guests go to /login; a user without ECOMM_MANAGER, or anyone while the product flag is off, is bounced to /; the stats only ever count the caller\'s own brands.',
        steps: [
          ['Signed out, open /ecomm/dashboard', 'Redirected to /login?redirect=%2Fecomm%2Fdashboard'],
          ['Sign in as USER only and type /ecomm/dashboard', 'Redirected to / and on to /earn; the sidebar shows "Become an E-Commerce Brand Partner"'],
          ['As ECOMM_MANAGER with is_product_visible off type /ecomm/dashboard', 'Redirected to / (the area is gone while the flag is off)'],
          ['Call partnerEcommStats(brand_id: <brand of another partner>) with an ECOMM_MANAGER token', 'NOT_FOUND "Brand not found or not yours"'],
          ['Call partnerEcommStats without a brand id using a HOST token', 'No error; all figures are zero'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Your Brands',
    description: 'partners-app /ecomm-brand and /ecomm-brand/:brandId (Partner Brand). Brand reads and writes are owner-scoped in ecommBrand.service (loadOwned).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Brand onboarding (/ecomm-brand)',
        description: 'Guests go to /login, users without ECOMM_MANAGER (or with the product flag off) are bounced, and the brand table only lists the caller\'s own brands.',
        steps: [
          ['Signed out, open /ecomm-brand', 'Redirected to /login?redirect=%2Fecomm-brand'],
          ['Sign in as HOST only and type /ecomm-brand/new', 'Redirected to /; the brand wizard never renders'],
          ['Call myEcommBrandsTable with an ECOMM_MANAGER token of partner A', 'Only partner A\'s brands are returned'],
          ['Call myEcommBrandsTable with no token', 'UNAUTHENTICATED "Authentication required"'],
          ['As a new ECOMM_MANAGER with no brand open /ecomm-brand', 'The empty state "No brands yet — create your first product brand to get started."'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Brand deletion (/ecomm-brand/:brandId)',
        description:
          'Another partner\'s brand page is refused; deleteMyEcommBrand and catalogue deletion requests only work on the caller\'s own brand, and an approved brand must go through a deletion request.',
        steps: [
          ['As ECOMM_MANAGER A open /ecomm-brand/<brand of partner B>', 'An error alert "Brand not found"; no brand details are shown'],
          ['Call deleteMyEcommBrand(<brand of B>) as A', 'NOT_FOUND "Brand not found"; B\'s brand is untouched'],
          ['Call deleteMyEcommBrand on A\'s own approved brand', 'BAD_REQUEST "This brand is approved — raise a deletion request instead"'],
          ['Call requestCatalogDeletion for B\'s brand as A', 'NOT_FOUND "Brand not found"'],
          ['Call requestCatalogDeletion with a HOST token', 'FORBIDDEN "Access Denied" (only ECOMM_MANAGER files deletion requests)'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Product Listings',
    description: 'partners-app /ecomm-brand/:brandId/products. myProductListingsTable filters on listing_submitted_by_id; listing writes need ECOMM_MANAGER (read from the database) and an owned listing.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Brand products (/ecomm-brand/:brandId/products)',
        description: 'Guests go to /login, users without ECOMM_MANAGER are bounced, and another partner\'s brand id lists nothing rather than their products.',
        steps: [
          ['Signed out, open /ecomm-brand/<brandId>/products', 'Redirected to /login with that path as the redirect'],
          ['Sign in as VENUE_OWNER only and type the URL', 'Redirected to / and on to the Venue studio'],
          ['As ECOMM_MANAGER A open /ecomm-brand/<brand of B>/products', 'The table is empty ("No product listings yet."); none of B\'s products are listed'],
          ['Call submitProductListing with a USER token', 'FORBIDDEN "You must be an Ecomm Manager to manage product listings"'],
        ],
      },
      {
        name: 'ECOMM_MANAGER cannot read or edit another brand\'s products',
        description:
          'Existing listings of brand B are unreachable for partner A ("Product listing not found"). Submit and update refuse a brand_id the caller does not own (FORBIDDEN "Not your brand"), so A cannot file or move a listing under B\'s brand.',
        steps: [
          ['As ECOMM_MANAGER A open /ecomm-brand/<brand of B>/products/<B listing id>', 'The editor does not load B\'s listing; the server answers "Product listing not found"'],
          ['Call updateMyProductListing(<B listing id>) as A', 'NOT_FOUND "Product listing not found"; B\'s listing is unchanged'],
          ['Call deleteMyProductListing and setMyProductListingActive on B\'s listing as A', 'Both NOT_FOUND "Product listing not found"'],
          ['Call myProductListingsTable(brand_id: <B>) as A', 'Empty rows'],
          ['Call submitProductListing as A with brand_id of B\'s approved brand and no pickup location', 'FORBIDDEN "Not your brand"; no listing is created under B'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Earn with Duncit',
    description: 'partners-app /earn is open to every signed-in user (no SectionGate) and is where / lands for a user with no studio. It calls no GraphQL operation.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Earn / onboarding journeys (/earn)',
        description: 'Only guests are kept out (redirect to /login); every signed-in user may open it, and it reads no other user\'s data.',
        steps: [
          ['Signed out, open /earn', 'Redirected to /login?redirect=%2Fearn'],
          ['Sign in as USER with no partner role and open /', 'Redirected to /earn'],
          ['Sign in as VENUE_OWNER and type /earn', 'The Earn page renders (no role gate)'],
          ['Inspect the page\'s network calls', 'No account-specific data is fetched'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Verification',
    description: 'partners-app /verification: no role gate; myVerifications is requireAuth and scoped to the caller.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Partner verification (/verification)',
        description: 'Guests go to /login; any signed-in user sees only their own verification records.',
        steps: [
          ['Signed out, open /verification', 'Redirected to /login?redirect=%2Fverification'],
          ['Sign in as user A and open /verification', 'Only A\'s verifications are listed'],
          ['Call myVerifications with no token', 'UNAUTHENTICATED "Not authenticated"'],
          ['Sign in as user B', 'None of A\'s documents or statuses are shown'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Wallet & Withdrawals',
    description: 'partners-app /wallet: no role gate; myWallet, myWalletStatementFile and requestWithdrawal are requireAuth and keyed to the token user (no id argument). Finance wallet ops are FINANCE_READ / FINANCE_RW.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Wallet & withdrawals (/wallet)',
        description: 'Guests go to /login; any signed-in user only ever sees and withdraws from their own wallet.',
        steps: [
          ['Signed out, open /wallet', 'Redirected to /login?redirect=%2Fwallet'],
          ['Call myWallet with no token', 'UNAUTHENTICATED "Not authenticated"'],
          ['Sign in as partner A and open /wallet', 'A\'s balance and transactions only'],
          ['Sign in as partner B and open /wallet', 'B\'s own wallet; nothing of A\'s'],
        ],
      },
      {
        name: 'A partner cannot read another user\'s wallet or request a withdrawal from it',
        description:
          'Wallet operations take no user id, so they are always bound to the token user; the Finance-only operations refuse partner tokens with "Access Denied".',
        steps: [
          ['As partner A call requestWithdrawal', 'The request debits only A\'s wallet; there is no argument to name another wallet'],
          ['Call withdrawalRequestsTable with a VENUE_OWNER token', 'FORBIDDEN "Access Denied" (FINANCE_READ: SUPER_ADMIN, CITY_ADMIN, FINANCE_MANAGER, FINANCE_USER)'],
          ['Call reviewWithdrawal on A\'s withdrawal with a HOST token', 'FORBIDDEN "Access Denied"; the withdrawal stays pending'],
          ['Call updateWithdrawalMinimums with an ECOMM_MANAGER token', 'FORBIDDEN "Access Denied"'],
          ['Call requestWithdrawal with amount 0', 'Refused with "Withdrawal amount must be greater than 0"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Support',
    description: 'partners-app /support (Help hub tab): no role gate; the form submits submitContactForm (captcha-guarded).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Partner support (/support)',
        description: 'Guests go to /login; every signed-in user may open Support and the page only reads the caller\'s own profile to prefill.',
        steps: [
          ['Signed out, open /support', 'Redirected to /login?redirect=%2Fsupport'],
          ['Sign in as USER only and open /support', 'The Support tab renders (no role gate)'],
          ['Call submitContactForm without a captcha token', 'Refused by the captcha check; no ticket is created'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Policies',
    description: 'partners-app /policies/:slug: no role gate; publicPolicies and policyBySlug are public.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Legal policies (/policies/:slug)',
        description: 'Guests are sent to /login by the partners-app route guard even though the policy queries are public; any signed-in user can read them.',
        steps: [
          ['Signed out, open /policies/<slug>', 'Redirected to /login with that path as the redirect'],
          ['Sign in as USER only and open /policies', 'Redirected to the first policy\'s /policies/<slug>'],
          ['Call policyBySlug with no token', 'The published policy is returned (public)'],
        ],
      },
    ],
  },
  {
    name: 'Partners: FAQs',
    description: 'partners-app /faqs (Help hub tab): no role gate; publicPartnerFaqs is public.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call FAQs (/faqs)',
        description: 'Guests are sent to /login by the route guard; any signed-in user can read the partner FAQs.',
        steps: [
          ['Signed out, open /faqs', 'Redirected to /login?redirect=%2Ffaqs'],
          ['Sign in as USER only and open /faqs', 'The FAQs render'],
          ['Call publicPartnerFaqs with no token', 'The FAQs are returned (public)'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Food',
    description:
      'The Venue Studio Food group: Food Dashboard (/venues/food-dashboard), Food Menu (/venues/food-menu), Food Orders (/venues/food-orders) and Food Coupons (/venues/food-coupons). SectionGate needs VENUE_OWNER; every operator call goes through managedVenue (owner or consoleEditors(\'VENUE\')).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Venue food menu (/venues/food-menu)',
        description: 'Guests go to /login, non-VENUE_OWNER users are bounced, and the owner menu read for a venue the caller does not own answers null.',
        steps: [
          ['Signed out, open /venues/food-menu', 'Redirected to /login?redirect=%2Fvenues%2Ffood-menu'],
          ['Sign in as HOST only and type /venues/food-menu', 'Redirected to / and on to the Host studio'],
          ['As VENUE_OWNER with no venue open "Food Menu"', '"You have no venues yet."'],
          ['Call updateApprovedVenue (menu) for another owner\'s venue with a VENUE_OWNER token', 'FORBIDDEN "Not your venue"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Venue food dashboard (/venues/food-dashboard)',
        description: 'Guests go to /login, non-VENUE_OWNER users are bounced, and venueFoodStats refuses a venue that is not the caller\'s.',
        steps: [
          ['Signed out, open /venues/food-dashboard', 'Redirected to /login?redirect=%2Fvenues%2Ffood-dashboard'],
          ['Sign in as ECOMM_MANAGER only and type the URL', 'Redirected to /'],
          ['Call venueFoodStats(venue_id: <venue of another owner>) with a VENUE_OWNER token', 'FORBIDDEN "Not your venue"'],
          ['Call venueFoodStats with no token', 'UNAUTHENTICATED "Not authenticated"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Venue food orders (/venues/food-orders)',
        description: 'Guests go to /login, non-VENUE_OWNER users are bounced, and the order table refuses another owner\'s venue.',
        steps: [
          ['Signed out, open /venues/food-orders', 'Redirected to /login?redirect=%2Fvenues%2Ffood-orders'],
          ['Sign in as CLUB_ADMIN only and type the URL', 'Redirected to / and on to the Club studio'],
          ['Call venueFoodOrdersTable(venue_id: <venue of another owner>) with a VENUE_OWNER token', 'FORBIDDEN "Not your venue"'],
          ['Call it with a malformed venue id', 'BAD_USER_INPUT "Invalid venue id"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Venue food coupons (/venues/food-coupons)',
        description: 'Guests go to /login, non-VENUE_OWNER users are bounced, and coupon reads refuse another owner\'s venue.',
        steps: [
          ['Signed out, open /venues/food-coupons', 'Redirected to /login?redirect=%2Fvenues%2Ffood-coupons'],
          ['Sign in as USER only and type the URL', 'Redirected to / and on to /earn'],
          ['Call venueFoodCouponsTable(venue_id: <venue of another owner>) with a VENUE_OWNER token', 'FORBIDDEN "Not your venue"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Venue food (/venues/food-dashboard)',
        description: 'The Food sidebar group only exists for VENUE_OWNER; its pages only offer the caller\'s own venues (myVenues), so another venue is reachable only by a direct API call, which is refused.',
        steps: [
          ['Sign in as VENUE_OWNER and expand the "Food" group', 'Food Dashboard, Food Menu, Food Orders and Food Coupons are listed'],
          ['Sign in as HOST only', 'No "Food" group is shown'],
          ['As VENUE_OWNER A open Food Dashboard and open the venue picker', 'Only A\'s venues are offered'],
          ['Call setVenueFoodOrderStatus on an order of venue B with A\'s token', 'FORBIDDEN "Not your venue"'],
        ],
      },
      {
        name: 'VENUE_OWNER cannot read or edit another venue\'s food menu',
        description: 'myVenue(B) returns null for owner A and updateApprovedVenue(venue_id = B) is refused "Not your venue"; B\'s menu is unchanged.',
        steps: [
          ['As VENUE_OWNER A call myVenue(venue_id: <B>)', 'Answers null; no menu data'],
          ['Open Food Menu with venue B forced in the request', 'The page shows "Could not load the food menu settings."'],
          ['Call updateApprovedVenue(venue_id: <B>, menu change) as A', 'FORBIDDEN "Not your venue"'],
          ['Re-read B\'s menu as B\'s owner', 'Unchanged'],
          ['As A link a Razorpay account owned by someone else to A\'s own venue', 'BAD_USER_INPUT "That Razorpay account does not belong to the owner of this venue"'],
        ],
      },
      {
        name: 'VENUE_OWNER cannot manage another venue\'s food coupons',
        description: 'Every coupon operation on venue B, or on a coupon of B, is refused by managedVenue for owner A.',
        steps: [
          ['As VENUE_OWNER A call createVenueFoodCoupon(venue_id: <B>)', 'FORBIDDEN "Not your venue"; no coupon is created'],
          ['Call updateVenueFoodCoupon, setVenueFoodCouponActive and deleteVenueFoodCoupon on a coupon of B as A', 'Each FORBIDDEN "Not your venue"; the coupon is unchanged'],
          ['Call deleteVenueFoodCoupon with an unknown coupon id', 'NOT_FOUND "Coupon not found"'],
        ],
      },
      {
        name: 'VENUE_OWNER cannot see or cancel another venue\'s food orders',
        description: 'managedOrder/managedVenue refuse owner A on venue B\'s orders; no refund is issued and the order status is unchanged.',
        steps: [
          ['As VENUE_OWNER A call venueFoodOrdersTable(venue_id: <B>)', 'FORBIDDEN "Not your venue"'],
          ['Call cancelVenueFoodOrder on a paid order of B as A with a valid reason', 'FORBIDDEN "Not your venue"; no refund is started'],
          ['Call setVenueFoodOrderStatus(ACCEPTED) on that order as A', 'FORBIDDEN "Not your venue"; the status is unchanged'],
          ['Call cancelVenueFoodOrder with an unknown order id', 'NOT_FOUND "Order not found"'],
        ],
      },
      {
        name: 'Food order and invoice need the access key or the placing account',
        description:
          'venueFoodOrder and venueFoodOrderInvoicePdfBase64 are public calls checked by access key: without the right key only the placing account may read; the venue owner uses the board instead. A malformed or unknown id answers null for the order read.',
        steps: [
          ['As a guest call venueFoodOrder(order_id, access_key: "wrong")', 'FORBIDDEN "This order link is not valid"; no name or phone is returned'],
          ['Call venueFoodOrderInvoicePdfBase64 with no access_key as another USER', 'FORBIDDEN "This order link is not valid"'],
          ['Call venueFoodOrder with a non-existent id', 'Answers null'],
          ['As the venue\'s owner call venueFoodOrder without the key', 'FORBIDDEN "This order link is not valid" (owners read orders on Food Orders)'],
          ['As the account that placed the order call it without the key', 'The order is returned'],
          ['Call venueFoodOrderInvoicePdfBase64 with the right key for an unpaid order', 'BAD_REQUEST "An invoice is ready once the order is paid"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Publish Page',
    description: 'Venue Studio "Publish Your Venue" (/venues/publish) and Host /host/publish: myPublicPage, publishPublicPage, myPublicPagePosterPdfBase64 and myVenueTableLabelPdfBase64 are requireAuth; ownership and approval are checked in publicPage.service.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Publish page (/venues/publish)',
        description: 'Guests go to /login, non-VENUE_OWNER users are bounced, and an unapproved venue cannot be published.',
        steps: [
          ['Signed out, open /venues/publish', 'Redirected to /login?redirect=%2Fvenues%2Fpublish'],
          ['Sign in as HOST only and type /venues/publish', 'Redirected to / and on to the Host studio'],
          ['As VENUE_OWNER open Publish Your Venue for a venue that is not approved', '"Your venue can be published once it is approved."'],
          ['Call publishPublicPage for an approved but inactive venue of the caller', 'FAILED_PRECONDITION "A venue can be published once it is approved and active"'],
        ],
      },
      {
        name: 'Cannot publish, poster or table-label another owner\'s venue',
        description: 'A venue the caller does not own reads exactly like a missing one ("Venue not found"), so ids cannot be probed; a HOST cannot get a venue table label, and a host page needs the HOST role.',
        steps: [
          ['As VENUE_OWNER A call publishPublicPage(kind: VENUE, ref_id: <venue B>)', 'NOT_FOUND "Venue not found"; B is not published'],
          ['Call myPublicPagePosterPdfBase64 for venue B as A', 'NOT_FOUND "Venue not found"'],
          ['As a HOST (no venue) call myVenueTableLabelPdfBase64(venue_id: <B>, headline: "Table 1")', 'NOT_FOUND "Venue not found"'],
          ['Call myVenueTableLabelPdfBase64 with an empty headline', 'BAD_USER_INPUT "Label text is required"'],
          ['As a USER without HOST call publishPublicPage(kind: HOST)', 'FORBIDDEN "Only an approved host can publish a host page"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Earnings',
    description: 'Venue Studio "Venue Earnings" (/venues/earnings): myVenueEarningsSummary and myVenuePayouts are requireAuth and scoped to the caller.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Venue earnings (/venues/earnings)',
        description: 'Guests go to /login, non-VENUE_OWNER users are bounced, and the earnings reads only ever return the caller\'s own venue money (empty for anyone else, not an error).',
        steps: [
          ['Signed out, open /venues/earnings', 'Redirected to /login?redirect=%2Fvenues%2Fearnings'],
          ['Sign in as HOST only and type /venues/earnings', 'Redirected to / and on to the Host studio'],
          ['Call myVenuePayouts with a HOST token', 'No error; an empty list'],
          ['As VENUE_OWNER A open Venue Earnings', 'Only payouts of A\'s venues, or "Payouts appear here after a pod at your venue completes."'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Pod Partner Requests',
    description: 'Pod Requests between venues and hosts: /venues/nearby-hosts, /venues/pod-requests/:id, /host/nearby-venues, /host/pod-requests/:id. Resolvers are requireAuth only; podPartnerRequest.service checks the party.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Pod partner requests (/venues/nearby-hosts)',
        description: 'Guests go to /login, non-VENUE_OWNER users are bounced, and searching or sending from a venue the caller does not own is refused "Not your venue".',
        steps: [
          ['Signed out, open /venues/nearby-hosts', 'Redirected to /login?redirect=%2Fvenues%2Fnearby-hosts'],
          ['Sign in as ECOMM_MANAGER only and type the URL', 'Redirected to /'],
          ['As VENUE_OWNER A call nearbyHostsForVenue(venue_id: <B>)', 'FORBIDDEN "Not your venue"'],
          ['Call sendPodPartnerRequest from venue B as A', 'FORBIDDEN "Not your venue"; nothing is sent'],
          ['As VENUE_OWNER with no approved venue open Search Nearby Hosts', '"Pod Requests open once one of your venues is approved."'],
        ],
      },
      {
        name: 'Only the two parties can see or answer a pod partner request',
        description: 'A third host or venue owner gets "This request is not yours"; the sender cannot answer their own request and the receiver cannot withdraw it.',
        steps: [
          ['As a third HOST call podPartnerRequest(<id between venue A and host B>)', 'FORBIDDEN "This request is not yours"'],
          ['Open /host/pod-requests/<that id> as the third host', 'The page shows the server message; no request details'],
          ['As the sender call respondPodPartnerRequest on their own request', 'FORBIDDEN "Only the receiver can answer this request"'],
          ['As the receiver call cancelPodPartnerRequest', 'FORBIDDEN "Only the sender can withdraw this request"'],
          ['Call podPartnerRequest with an unknown id', 'NOT_FOUND "Request not found"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Owner Access',
    description: 'The VENUE_OWNER role gates every /venues* and /register-venue* route and the Venue Owner sidebar group in partners-app.duncit.com (SectionGate + buildNav).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Studio options (/venues/options)',
        description: 'The Venue Studio Options page renders only for VENUE_OWNER; everyone else is redirected and never sees the venue options.',
        steps: [
          ['Signed out, open /venues/options', 'Redirected to /login?redirect=%2Fvenues%2Foptions'],
          ['Sign in as USER only and type /venues/options', 'Redirected to / and on to /earn'],
          ['Sign in as HOST, CLUB_ADMIN or ECOMM_MANAGER only and type the URL', 'Redirected to / which opens that user\'s own studio Options page'],
          ['Sign in as VENUE_OWNER and open /', 'Lands on /venues/options'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Slot Requests',
    description: 'Venue slot booking requests: approveVenueSlotRequest / declineVenueSlotRequest are requireAuth and checked against the slot\'s venue owner in venueSlot.service.',
    sub_flows: [
      {
        name: 'VENUE_OWNER cannot approve or decline another venue\'s slot request',
        description: 'A slot of another owner\'s venue is refused "Not your slot"; the pod\'s venue approval status is unchanged.',
        steps: [
          ['As VENUE_OWNER A open /venues/requests/<slot of venue B>?action=approve', 'The decision page shows "Not your slot"; no approve is sent'],
          ['Call approveVenueSlotRequest(<slot of B>) as A', 'FORBIDDEN "Not your slot"'],
          ['Call declineVenueSlotRequest(<slot of B>) as A', 'FORBIDDEN "Not your slot"'],
          ['Call venueSlotRequests(venue_id: <B>) as A', 'An empty list'],
          ['Check the pod as B\'s owner', 'Its venue approval status is still pending'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Availability',
    description: 'The venue calendar (/venues/availability, /venues/:venueId/availability): slot writes go through ensureOwnedVenue or the slot owner check.',
    sub_flows: [
      {
        name: 'VENUE_OWNER cannot create, block or delete slots of another venue',
        description: 'The availability page only resolves the caller\'s own venues; slot mutations for venue B are refused.',
        steps: [
          ['As VENUE_OWNER A open /venues/<B id>/availability', 'Error alert "Venue not found, or it isn\'t yours."'],
          ['Call createVenueSlots(venue_id: <B>) as A', 'NOT_FOUND "Venue not found or not yours"; no slot is created'],
          ['Call updateVenueSlot (block) and deleteVenueSlot on a slot of B as A', 'FORBIDDEN "Not your slot"; the slot is unchanged'],
          ['Call venueSlots(venue_id: <B>) as A', 'FORBIDDEN "Only the venue owner can view all slots"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Host Pods',
    description: 'Host studio pods (/host/pods): hostUpdatePod, hostDeletePod (cancel) and hostResubmitPod go through findHostedPod; settlement through assertPodActor.',
    sub_flows: [
      {
        name: 'HOST cannot edit, complete or cancel another host\'s pod',
        description: 'Host B\'s pod is refused to host A for edit and cancel ("Only the pod host can manage this pod") and for completion ("Only a host of this pod can do that"); no settlement or refund is created.',
        steps: [
          ['As HOST A call hostUpdatePod on a pod hosted only by B', 'FORBIDDEN "Only the pod host can manage this pod"; the pod is unchanged'],
          ['Call hostDeletePod on the same pod as A', 'FORBIDDEN "Only the pod host can manage this pod"; no attendee is refunded'],
          ['Call podSettlementPreview and completePodSettlement for that pod as A', 'Both FORBIDDEN "Only a host of this pod can do that"; no payment release is created'],
          ['Call hostUpdatePod with a malformed id', 'BAD_USER_INPUT "Invalid pod id"'],
          ['As USER (no HOST role) type /host/pods', 'Redirected to /; the sidebar offers "Be a Host"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Brand Integrations',
    description: 'Partner Brand integrations (/ecomm-brand/integrations): the Razorpay / ShipRocket accounts a partner saves once and links per brand. Secrets are never returned (only has_secret flags).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Brand integrations (/ecomm-brand/integrations)',
        description: 'Guests go to /login, users without ECOMM_MANAGER (or with the product flag off) are bounced, and the list only shows the caller\'s accounts.',
        steps: [
          ['Signed out, open /ecomm-brand/integrations', 'Redirected to /login?redirect=%2Fecomm-brand%2Fintegrations'],
          ['Sign in as VENUE_OWNER only and type the URL', 'Redirected to /'],
          ['As ECOMM_MANAGER A call myPartnerIntegrations', 'Only A\'s integrations, each with has_secret flags and no secret value'],
          ['As a partner with none saved open the page', '"No {provider} account saved yet." for each provider'],
        ],
      },
      {
        name: 'ECOMM_MANAGER cannot use or read another partner\'s integration or pickup address',
        description: 'Linking another owner\'s integration id is refused "Integration not found"; another brand\'s pickup locations are refused "Brand not found"; secrets are never in a response.',
        steps: [
          ['As ECOMM_MANAGER A call useBrandIntegration(brand: <A brand>, integration: <B integration id>)', 'NOT_FOUND "Integration not found"; A\'s brand keeps its current account'],
          ['Call useBrandIntegration on B\'s brand as A', 'NOT_FOUND "Brand not found"'],
          ['Call recheckPartnerIntegration and deletePartnerIntegration on B\'s integration as A', 'NOT_FOUND "Integration not found"'],
          ['Call myBrandPickupLocations(brand_id: <B>) as A', 'NOT_FOUND "Brand not found"'],
          ['Inspect any integration response', 'No key secret, webhook secret or sandbox secret value is present'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Brand Orders & Returns',
    description: 'Partner Brand Pod Shop orders (/ecomm-brand/orders) and buyer returns (/ecomm-brand/returns), scoped to ownedBrandIds. Not the pet store.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Brand orders (/ecomm-brand/orders)',
        description: 'Guests go to /login, users without ECOMM_MANAGER are bounced, and an order of another brand is "Order not found".',
        steps: [
          ['Signed out, open /ecomm-brand/orders', 'Redirected to /login?redirect=%2Fecomm-brand%2Forders'],
          ['Sign in as HOST only and type the URL', 'Redirected to /'],
          ['As ECOMM_MANAGER A open /ecomm-brand/orders/<order of brand B>', 'An error alert "Order not found"'],
          ['As a partner with no orders open the page', '"No orders yet."'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Brand returns (/ecomm-brand/returns)',
        description: 'Guests go to /login, users without ECOMM_MANAGER are bounced, and the return actions refuse callers who are neither staff nor a brand owner.',
        steps: [
          ['Signed out, open /ecomm-brand/returns', 'Redirected to /login?redirect=%2Fecomm-brand%2Freturns'],
          ['Sign in as CLUB_ADMIN only and type the URL', 'Redirected to /'],
          ['Call podShopReturnsTable with a USER token', 'FORBIDDEN "Access Denied"'],
          ['As a partner with no returns open the page', '"No returns yet."'],
        ],
      },
      {
        name: 'ECOMM_MANAGER cannot see, ship or cancel another brand\'s orders and returns',
        description: 'Orders and returns of brand B are absent from partner A\'s tables and direct calls are refused; no shipment, cancellation or refund happens.',
        steps: [
          ['As ECOMM_MANAGER A call brandProductOrdersTable(brand_id: <B>)', 'Empty rows'],
          ['Call brandBookProductOrderShipment and brandCancelProductOrder on B\'s order as A', 'NOT_FOUND "Order not found"; nothing is booked or cancelled'],
          ['Call brandCancelProductOrder as A on an order that also holds another brand\'s items', 'BAD_USER_INPUT "This order holds items that are not your brand’s, so it can only be cancelled by Duncit support"'],
          ['Call refundPodShopReturn and approvePodShopReturn on B\'s return as A', 'NOT_FOUND "Return not found"; no refund is issued'],
          ['Call podShopReturnsTable as A', 'Only returns on A\'s brands'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Brand Settings & Warehouses',
    description: 'Partner Brand settings (/ecomm-brand/:brandId/settings) and pickup addresses; pickup operations use loadOwnedBrand / ownedLocation.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Brand pickup addresses (/ecomm-brand/:brandId/settings)',
        description: 'Guests go to /login, users without ECOMM_MANAGER are bounced, and another partner\'s brand or pickup location is refused.',
        steps: [
          ['Signed out, open /ecomm-brand/<brandId>/settings', 'Redirected to /login with that path as the redirect'],
          ['Sign in as USER only and type the URL', 'Redirected to / and on to /earn'],
          ['As ECOMM_MANAGER A open /ecomm-brand/<B brand>/settings', '"Brand was not found in your account."'],
          ['Call saveMyBrandPickupLocation for B\'s brand as A', 'NOT_FOUND "Brand not found"; nothing is saved'],
          ['Call setDefaultMyBrandPickupLocation with B\'s location id on A\'s brand', 'NOT_FOUND "Pickup location not found"'],
          ['Call the staff brandPickupLocations query with an ECOMM_MANAGER token', 'FORBIDDEN "Access Denied"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Profile',
    description: 'partners-app /profile renders the shared shell ProfilePage (me, updateMyProfile, connected accounts, 2FA). No role gate; everything is the caller\'s own.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Partner profile (/profile)',
        description: 'Guests go to /login; any signed-in user edits only their own profile.',
        steps: [
          ['Signed out, open /profile', 'Redirected to /login?redirect=%2Fprofile'],
          ['Sign in as USER only and open /profile', 'The profile page renders with the caller\'s own details'],
          ['Call me with no token', 'Answers null'],
          ['Call updateMyProfile with no token', 'UNAUTHENTICATED "Authentication required"'],
        ],
      },
    ],
  },
  {
    name: 'Club Admins: Access & Dashboard',
    description:
      'club-admins.duncit.com (requiredRoles ALL_CLUB_ADMINS_ACCESS; SUPER_ADMIN always passes). The server reads with consoleReaders(\'CLUB_ADMIN\').',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Club admin directory (/)',
        description:
          'Only ALL_CLUB_ADMINS_ACCESS (or SUPER_ADMIN) signs in; clubAdminProfilesTable answers SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, ONBOARDING_MANAGER and ALL_CLUB_ADMINS_ACCESS, so CLUB_ADMIN, USER and other staff are refused in the UI and on the server.',
        steps: [
          ['Sign in to club-admins.duncit.com with an account holding only CLUB_ADMIN', 'Sign-in is refused with "You do not have access to Duncit Club Admins. Please contact your administrator." and no token is kept'],
          ['Repeat with a plain USER account and with an account holding only ALL_VENUES_ACCESS', 'The same "You do not have access to Duncit Club Admins" message; the dashboard never renders'],
          ['Signed out, type https://club-admins.duncit.com/club-admins into the address bar', 'Redirected to /login?redirect=%2Fclub-admins'],
          ['Remove ALL_CLUB_ADMINS_ACCESS from a signed-in account (Admin > Users) and reload /', 'The shell bounces to /login?denied=1 showing "You do not have access to Duncit Club Admins. Please contact your administrator."'],
          ['Call clubAdminProfilesTable with a CLUB_ADMIN token and with a USER token', 'Both answer FORBIDDEN "Access Denied"; no rows are returned'],
          ['Call clubAdminProfilesTable with no token', 'UNAUTHENTICATED "Not authenticated"'],
        ],
      },
    ],
  },
  {
    name: 'Club Admins: Club Admin Editor',
    description:
      'Editing a Club Admin is consoleEditors(\'CLUB_ADMIN\'); appointing one (adminCreateClubAdminProfile), approve/reject, commission and the active switch are consoleGovernors(\'CLUB_ADMIN\') = SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, ONBOARDING_MANAGER.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Club admin editor (/club-admins/new)',
        description:
          'Appointing a Club Admin is governance: the "Appoint a club admin" button only shows to governors and adminCreateClubAdminProfile refuses ALL_CLUB_ADMINS_ACCESS-only editors, CLUB_ADMIN and USER with "Access Denied".',
        steps: [
          ['Sign in to club-admins.duncit.com with ALL_CLUB_ADMINS_ACCESS only and open Club Admins (/club-admins)', 'The list renders without the "Appoint a club admin" button'],
          ['Sign in as ONBOARDING_MANAGER + ALL_CLUB_ADMINS_ACCESS and open /club-admins', '"Appoint a club admin" is shown and opens /club-admins/new'],
          ['As the ALL_CLUB_ADMINS_ACCESS-only user type /club-admins/new, fill the form and save', 'The save is refused with "Access Denied" and no Club Admin is created'],
          ['Call adminCreateClubAdminProfile with a CLUB_ADMIN token and with a USER token', 'FORBIDDEN "Access Denied"; the target user does not gain the CLUB_ADMIN role'],
          ['Call approveClubAdminProfile and setClubAdminCommission with an ALL_CLUB_ADMINS_ACCESS-only token', 'FORBIDDEN "Access Denied"; status and commission are unchanged'],
          ['Call updateClubAdminProfile with the same ALL_CLUB_ADMINS_ACCESS-only token', 'Allowed (editors may correct a profile); the change is saved'],
        ],
      },
    ],
  },
  {
    name: 'Regional Club Admin: Region Structure',
    description:
      'regional-club-admin.duncit.com (requiredRoles REGIONAL_CLUB_ADMIN). Every region query is requireRole(REGIONAL_RW = REGIONAL_CLUB_ADMIN, SUPER_ADMIN) and derives its scope from the caller\'s own region.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Region structure (/)',
        description:
          'CLUB_ADMIN, CITY_ADMIN and USER cannot sign in or call myRegionTree; a regional admin asking for a pod or club outside their region gets "Access Denied".',
        steps: [
          ['Sign in to regional-club-admin.duncit.com with CLUB_ADMIN only, then with CITY_ADMIN only', 'Both refused with "You do not have access to Duncit Regional Club Admin. Please contact your administrator."'],
          ['Signed out, open https://regional-club-admin.duncit.com/', 'Redirected to /login?redirect=%2F'],
          ['Call myRegionTree with a CITY_ADMIN token and with a CLUB_ADMIN token', 'FORBIDDEN "Access Denied"'],
          ['As REGIONAL_CLUB_ADMIN of region A open /pods/<podId of a club in region B>', 'The pod detail does not load; regionPodAttendees / regionPodPayments for that pod answer FORBIDDEN "Access Denied"'],
          ['As the same user call regionClubPods with a club id outside the region', 'FORBIDDEN "Access Denied"; no pods are returned'],
          ['Call regionPodAttendees with a malformed pod id', 'NOT_FOUND "Pod not found"'],
        ],
      },
    ],
  },
  {
    name: 'Regional Club Admin: Club Admins',
    description: 'The /club-admins page of the regional console: myRegionMembers, regionClubAdminCandidates, addRegionClubAdmin and removeRegionClubAdmin, all REGIONAL_RW.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Region members (/club-admins)',
        description:
          'Only REGIONAL_CLUB_ADMIN (own region) and SUPER_ADMIN read or change region members; others are refused and a member of another region cannot be added.',
        steps: [
          ['Sign in with CITY_ADMIN only and type /club-admins', 'Sign-in is refused with "You do not have access to Duncit Regional Club Admin. Please contact your administrator."'],
          ['Call myRegionMembers and addRegionClubAdmin with a CLUB_ADMIN token', 'Both FORBIDDEN "Access Denied"; region membership is unchanged'],
          ['As REGIONAL_CLUB_ADMIN of region A call addRegionClubAdmin with a Club Admin already in region B', 'Refused with "Already in the region "<region B name>""'],
          ['Call addRegionClubAdmin with a user who does not hold CLUB_ADMIN', 'Refused with "That person does not hold the Club Admin role"'],
          ['Call regionClubAdminClubs with a Club Admin id from region B', 'FORBIDDEN "Access Denied"'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Pods Dashboard',
    description:
      'pods.duncit.com signs in ALL_PODS_ACCESS (or SUPER_ADMIN), and podDashboard is consoleReaders(\'POD\') on the server (SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, ALL_PODS_ACCESS).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Pods dashboard (/pods/dashboard)',
        description:
          'HOST, CLUB_ADMIN, VENUE_OWNER, USER and other staff cannot sign in, and podDashboard refuses their tokens; an ALL_PODS_ACCESS-only staffer reads the dashboard.',
        steps: [
          ['Sign in to pods.duncit.com with HOST only, then VENUE_OWNER only, then CLUB_ADMIN only', 'Each is refused with "You do not have access to Duncit Pods. Please contact your administrator."'],
          ['Sign in with CITY_ADMIN but without ALL_PODS_ACCESS', 'Refused with the same message (the portal admits only ALL_PODS_ACCESS or SUPER_ADMIN)'],
          ['Signed out, type /pods/dashboard', 'Redirected to /login?redirect=%2Fpods%2Fdashboard'],
          ['Call podDashboard with a HOST token and a USER token', 'FORBIDDEN "Access Denied"'],
          ['Sign in with ALL_PODS_ACCESS only and open Dashboard (/pods/dashboard)', 'The dashboard data loads'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: All Pods',
    description: 'The /pods table (podsTable) and its row actions. deletePod and the review actions are SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN on the server.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Pod admin (/pods)',
        description:
          'Partners and USER cannot sign in to the Pods portal; podsTable itself does not throw for a partner token but hides pending-approval, hidden and deleted pods unless the caller can review, and every write needs a pod-admin role.',
        steps: [
          ['Sign in to pods.duncit.com with HOST only', 'Refused with "You do not have access to Duncit Pods. Please contact your administrator."'],
          ['Signed out, type /pods/<podId>/edit', 'Redirected to /login?redirect=%2Fpods%2F<podId>%2Fedit'],
          ['Call podsTable(include_deleted: true) with a HOST token', 'Only live, public pods come back: pending-approval, hidden and cancelled pods are left out'],
          ['Call deletePod on any pod with a VENUE_OWNER token and with an ALL_PODS_ACCESS-only token', 'FORBIDDEN "Access Denied"; the pod is unchanged'],
          ['Call podsTable(include_deleted: true) with a CITY_ADMIN token', 'Cancelled pods are included'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Complete a Pod',
    description:
      'The "Complete this pod" dialog calls completePodSettlement (pod host, or SUPER_ADMIN / CITY_ADMIN / ZONAL_ADMIN / FINANCE_MANAGER within scope). Payouts it creates stay PENDING until Finance runs approvePodPaymentRelease (SUPER_ADMIN, CITY_ADMIN, FINANCE_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Pod completion & payouts (/pods (Complete dialog))',
        description:
          'USER and partners cannot reach the dialog; on the server a caller who is neither the pod\'s host nor a pod finance admin is refused "Only a host of this pod can do that". Note the actual rule: an ALL_PODS_ACCESS-only staffer is refused too.',
        steps: [
          ['Sign in to pods.duncit.com with VENUE_OWNER only', 'Refused with "You do not have access to Duncit Pods. Please contact your administrator."'],
          ['Call podSettlementPreview for pod P with a token of a HOST who does not host P', 'FORBIDDEN "Only a host of this pod can do that"'],
          ['Call completePodSettlement for pod P with the same token', 'FORBIDDEN "Only a host of this pod can do that"; the pod stays incomplete and no payment release is created'],
          ['As an ALL_PODS_ACCESS-only staffer open "Complete this pod" on P and submit', 'Refused with "Only a host of this pod can do that"'],
          ['Call completePodSettlement with a non-existent pod id', 'NOT_FOUND "Pod not found"'],
          ['As ALL_PODS_ACCESS + CITY_ADMIN of P\'s city complete P', 'The pod completes and its payouts are created as PENDING releases'],
        ],
      },
      {
        name: 'Pods staff cannot approve payouts (Finance only)',
        description:
          'Completing a pod creates PENDING payment releases; approvePodPaymentRelease is requireRole(SUPER_ADMIN, CITY_ADMIN, FINANCE_MANAGER), so an ALL_PODS_ACCESS token is refused and the release stays pending.',
        steps: [
          ['As a pod finance admin complete pod P from the Pods portal', 'The pod completes; the payment release group for P shows as pending approval in the Finance console'],
          ['Call approvePodPaymentRelease(id) for that group with an ALL_PODS_ACCESS-only token', 'FORBIDDEN "Access Denied"'],
          ['Call it with a ZONAL_ADMIN token', 'FORBIDDEN "Access Denied" (ZONAL_ADMIN is not in the Finance write list)'],
          ['Check the host and venue wallets', 'No credit was posted; the release is still pending'],
          ['Approve the same group as FINANCE_MANAGER', 'The release is approved and the wallets are credited once'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Auto Pods',
    description: 'The /auto-pods routes render only while the auto_pods flag is on; adminAutoPodsTable is consoleReaders(\'POD\') and the auto pod writes are requireRole(SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Auto Pods (/auto-pods)',
        description:
          'Partners and USER cannot sign in; on the server adminAutoPodsTable refuses every role outside SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN and ALL_PODS_ACCESS, and the auto pod writes refuse an ALL_PODS_ACCESS-only staffer.',
        steps: [
          ['Sign in to pods.duncit.com with CLUB_ADMIN only', 'Refused with "You do not have access to Duncit Pods. Please contact your administrator."'],
          ['With the auto_pods flag off, as an allowed staffer type /auto-pods', 'The route renders nothing (no table, no error)'],
          ['Call adminAutoPodsTable with a HOST token', 'FORBIDDEN "Access Denied"'],
          ['With the flag on, as ALL_PODS_ACCESS only open Auto Pods (/auto-pods)', 'The Auto Pods table loads'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Change Requests',
    description: 'The /pods/change-requests queue: podChangeRequests is consoleReaders(\'POD\'); podChangeCandidates, podChangeVenueSlots, offerPodChange and cancelPodForChange are requireRole(SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Change requests (/pods/change-requests)',
        description:
          'Partners and USER cannot sign in and every admin change-request operation refuses them; ALL_PODS_ACCESS alone reads the queue but cannot work it (assign, offer, cancel), because working it cancels pods and refunds attendees.',
        steps: [
          ['Sign in to pods.duncit.com with HOST only', 'Refused with "You do not have access to Duncit Pods. Please contact your administrator."'],
          ['Call podChangeRequests(role: HOST) with a HOST token', 'FORBIDDEN "Access Denied"'],
          ['Call offerPodChange and cancelPodForChange with a VENUE_OWNER token', 'FORBIDDEN "Access Denied"; the request and the pod are unchanged'],
          ['As ALL_PODS_ACCESS only open Change Requests (/pods/change-requests)', 'The requests load; the assign drawer\'s candidates and slots, offering and cancelling fail with "Access Denied"'],
          ['As ALL_PODS_ACCESS + CITY_ADMIN open the queue', 'Requests load and the assign drawer can offer a candidate'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Pod Ideas',
    description: 'Pod ideas are public reads (podIdeasTable); moderation (setPodIdeaStatus) is requireRole(SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, ALL_PODS_ACCESS).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Pod ideas moderation (/pod-ideas)',
        description:
          'Partners and USER cannot sign in to moderate; podIdeasTable stays readable (ideas are public) but setPodIdeaStatus refuses anyone outside the moderation list. ALL_PODS_ACCESS is allowed here.',
        steps: [
          ['Sign in to pods.duncit.com with USER only and type /pod-ideas', 'Refused with "You do not have access to Duncit Pods. Please contact your administrator."'],
          ['Call setPodIdeaStatus(status: APPROVED) with a HOST token', 'FORBIDDEN "Access Denied"; the idea status is unchanged'],
          ['Call podIdeasTable with no token', 'Rows are returned (public read)'],
          ['As ALL_PODS_ACCESS only open Pod Ideas and approve an idea', 'The status changes to approved'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Pod Plans',
    description: 'podPlansTable is consoleReaders(\'POD\'); the plan writes are requireRole(SUPER_ADMIN, CITY_ADMIN); publicPodPlans stays public.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Pod plans (/pod-plans)',
        description:
          'Partners and USER cannot sign in; the plan table reads for the Pods console readers, while the plan writes accept only SUPER_ADMIN and CITY_ADMIN, so ZONAL_ADMIN and ALL_PODS_ACCESS-only staff cannot save a plan.',
        steps: [
          ['Sign in to pods.duncit.com with VENUE_OWNER only', 'Refused with "You do not have access to Duncit Pods. Please contact your administrator."'],
          ['As ALL_PODS_ACCESS only open Pod Plans (/pod-plans) and save a plan', 'The plans table loads; the save fails with "Access Denied"'],
          ['Call createPodPlan with a HOST token', 'FORBIDDEN "Access Denied"; no plan is created'],
          ['Call publicPodPlans with no token', 'The public plans are returned'],
          ['As ALL_PODS_ACCESS + CITY_ADMIN open /pod-plans', 'The plans table loads'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Event Tickets',
    description: 'eventTicketsTable is requireRole(SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, FINANCE_MANAGER, ALL_PODS_ACCESS); verifyEventTicketQr and checkInEventTicket are requireRole(SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, FINANCE_MANAGER); a host scans through hostScanPodTicket instead.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Attendance (/event-tickets)',
        description:
          'Partners and USER cannot sign in or check tickets in from this page; ALL_PODS_ACCESS alone reads the tickets table but cannot verify or check a ticket in. Pod hosts mark attendance through their own attendance board, not this console.',
        steps: [
          ['Sign in to pods.duncit.com with HOST only and type /event-tickets', 'Refused with "You do not have access to Duncit Pods. Please contact your administrator."'],
          ['Call eventTicketsTable with a CLUB_ADMIN token', 'FORBIDDEN "Access Denied"'],
          ['Call checkInEventTicket and verifyEventTicketQr with a HOST token', 'FORBIDDEN "Access Denied"; the ticket is not checked in'],
          ['As ALL_PODS_ACCESS only open Event Tickets', 'The tickets table loads; checking a ticket in fails with "Access Denied"'],
          ['As ALL_PODS_ACCESS + CITY_ADMIN open Event Tickets', 'The tickets table loads'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Pod Settings',
    description: 'The page reads appSettings (SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER, TECH_MANAGER) and saves with updateAppSettings (SUPER_ADMIN, TECH_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Pod settings (/pod-settings)',
        description:
          'Partners and USER cannot sign in. On the server reading needs a platform/support/tech role and saving needs SUPER_ADMIN or TECH_MANAGER, so a CITY_ADMIN pods staffer can read the settings but the save is refused.',
        steps: [
          ['Sign in to pods.duncit.com with CLUB_ADMIN only', 'Refused with "You do not have access to Duncit Pods. Please contact your administrator."'],
          ['As ALL_PODS_ACCESS only open Pod Settings (/pod-settings)', 'The PodSettings query fails with "Access Denied"'],
          ['As ALL_PODS_ACCESS + CITY_ADMIN open Pod Settings, change a value and save', 'The values load, but the save fails with "Access Denied" and the setting is unchanged'],
          ['Call updateAppSettings with a HOST token', 'FORBIDDEN "Access Denied"'],
          ['Save the same change as SUPER_ADMIN', 'The setting is saved'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Pod Monitoring (AI)',
    description: 'podAuditLogsTable is requireRole(SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, ALL_PODS_ACCESS, LOGS_MANAGER); club admins read their own clubs through clubAdminPodAuditLogsTable instead.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Pod monitoring (AI) (/pod-monitoring)',
        description:
          'Partners and USER cannot sign in; the platform-wide audit table refuses HOST, CLUB_ADMIN and VENUE_OWNER tokens.',
        steps: [
          ['Sign in to pods.duncit.com with CLUB_ADMIN only and type /pod-monitoring', 'Refused with "You do not have access to Duncit Pods. Please contact your administrator."'],
          ['Call podAuditLogsTable with a CLUB_ADMIN token', 'FORBIDDEN "Access Denied" (the club admin\'s own feed is clubAdminPodAuditLogsTable)'],
          ['As ALL_PODS_ACCESS only open Pod Monitoring (AI)', 'The audit rows load'],
          ['Call podAuditLogsTable with a LOGS_MANAGER token', 'Rows are returned (read-only log access)'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Portal Navigation & Product Flag',
    description: 'onboarding.duncit.com admits ONBOARDING_MANAGER (requiredRoles) and SUPER_ADMIN; /ecomm-brands also needs the is_product_visible flag (RequireEcomm).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Access & navigation (/)',
        description:
          'Console roles (ALL_VENUES_ACCESS, ALL_HOSTS_ACCESS, ALL_CLUB_ADMINS_ACCESS ...), partners and USER are refused at sign-in and on a typed URL.',
        steps: [
          ['Sign in to onboarding.duncit.com with ALL_VENUES_ACCESS only', 'Refused with "You do not have access to Duncit Onboarding. Please contact your administrator."'],
          ['Repeat with VENUE_OWNER only and with USER only', 'The same message; no sidebar is shown'],
          ['Signed out, type /meetings/venue', 'Redirected to /login?redirect=%2Fmeetings%2Fvenue'],
          ['Remove ONBOARDING_MANAGER from a signed-in account and reload /', 'Bounced to /login?denied=1 with the same "You do not have access to Duncit Onboarding" message'],
          ['As ONBOARDING_MANAGER with the product flag off type /ecomm-brands', 'Redirected to / (Dashboard); the sidebar has no "Onboarded E-Commerce Brands" entry'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Dashboard',
    description: 'The Onboarding dashboard at /.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Onboarding dashboard (/)',
        description: 'Only ONBOARDING_MANAGER and SUPER_ADMIN reach the dashboard; the data behind its tiles is refused to everyone else on the server.',
        steps: [
          ['Sign in to onboarding.duncit.com with ALL_HOSTS_ACCESS only', 'Refused with "You do not have access to Duncit Onboarding. Please contact your administrator."'],
          ['Signed out, open /', 'Redirected to /login?redirect=%2F'],
          ['Call onboardingMeetingsTable with an ALL_HOSTS_ACCESS token and a HOST token', 'Both FORBIDDEN "Access Denied"'],
          ['Sign in as ONBOARDING_MANAGER', 'The dashboard renders'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Surveys Hub & Lists',
    description: 'surveysTable and the survey writes are requireRole(SUPER_ADMIN, ONBOARDING_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Onboarding surveys (/surveys)',
        description: 'Console roles, partners and USER are refused at sign-in and every survey admin operation answers "Access Denied".',
        steps: [
          ['Sign in with ALL_CLUB_ADMINS_ACCESS only and type /surveys', 'Refused with "You do not have access to Duncit Onboarding. Please contact your administrator."'],
          ['Call surveysTable with a CITY_ADMIN token', 'FORBIDDEN "Access Denied"'],
          ['Call createSurvey and deleteSurvey with a HOST token', 'FORBIDDEN "Access Denied"; no survey is created or removed'],
          ['As ONBOARDING_MANAGER open Surveys', 'The surveys hub renders'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Meeting Schedule Queues',
    description: 'The /meetings/:kind queues (venue, host, ecomm, club_admin): onboardingMeetingsTable and the meeting writes are requireRole(ONBOARDING_RW = SUPER_ADMIN, ONBOARDING_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Onboarding meetings (/meetings/:kind)',
        description: 'Console roles, partners and applicants cannot open a meeting queue or call the meeting operations.',
        steps: [
          ['Sign in with ALL_VENUES_ACCESS only and type /meetings/venue', 'Refused with "You do not have access to Duncit Onboarding. Please contact your administrator."'],
          ['Call onboardingMeetingsTable with a VENUE_OWNER token', 'FORBIDDEN "Access Denied"'],
          ['Call updateMeeting and cancelMeeting with a USER token (the applicant themself)', 'FORBIDDEN "Access Denied"; the meeting is unchanged'],
          ['As ONBOARDING_MANAGER open "Venue Meetings"', 'The queue loads'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Meeting Decisions',
    description: 'decideMeeting (APPROVED / DENIED) is requireRole(SUPER_ADMIN, ONBOARDING_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Applicant approval (/meetings/:kind)',
        description: 'Only ONBOARDING_MANAGER and SUPER_ADMIN decide an application; nobody else can approve themself or another applicant.',
        steps: [
          ['As an applicant (USER) call decideMeeting(id: <own meeting>, decision: APPROVED)', 'FORBIDDEN "Access Denied"; the meeting stays undecided and no partner role is granted'],
          ['Call decideMeeting with an ALL_HOSTS_ACCESS token', 'FORBIDDEN "Access Denied"'],
          ['Call it with a CITY_ADMIN token', 'FORBIDDEN "Access Denied" (CITY_ADMIN is not in ONBOARDING_RW)'],
          ['As ONBOARDING_MANAGER approve the meeting from the queue', 'The decision is saved'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Host Additional Requests',
    description: 'hostRequestsTable and approve/reject/acknowledge/delete are requireRole(SUPER_ADMIN, ONBOARDING_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Host requests (/host-requests)',
        description: 'Console roles, partners and USER cannot list or decide host additional requests.',
        steps: [
          ['Sign in with ALL_HOSTS_ACCESS only and type /host-requests', 'Refused with "You do not have access to Duncit Onboarding. Please contact your administrator."'],
          ['Call hostRequestsTable with an ALL_HOSTS_ACCESS token', 'FORBIDDEN "Access Denied"'],
          ['As the requesting HOST call approveHostRequest on their own request', 'FORBIDDEN "Access Denied"; the request stays pending'],
          ['As ONBOARDING_MANAGER open "Host Additional Requests"', 'The table loads'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Onboarded Hosts Review',
    description: 'hostsTable is consoleReaders(\'HOST\'); approveHost, rejectHost, setHostActive and the commission writes are consoleGovernors(\'HOST\') (SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, ONBOARDING_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Host review (/hosts)',
        description:
          'Console roles cannot sign in to Onboarding. On the server ALL_HOSTS_ACCESS can still read hostsTable (it is the Hosts console\'s own read), but approve/reject/active and commission are refused to it and to partners.',
        steps: [
          ['Sign in with ALL_HOSTS_ACCESS only and type /hosts', 'Refused with "You do not have access to Duncit Onboarding. Please contact your administrator."'],
          ['Call approveHost and setHostActive with an ALL_HOSTS_ACCESS token', 'FORBIDDEN "Access Denied"; the host status and live switch are unchanged'],
          ['Call hostsTable with a HOST token', 'FORBIDDEN "Access Denied"'],
          ['Call hostsTable with an ALL_HOSTS_ACCESS token', 'Rows are returned (console read)'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Onboarded Venues',
    description: 'venuesTable is consoleReaders(\'VENUE\'); approveVenue, rejectVenue, setVenueActive and setVenueHostRequestLimit are consoleGovernors(\'VENUE\'); setVenueDeductions also admits FINANCE_MANAGER.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Venue review (/venues)',
        description:
          'Console roles and partners cannot sign in to Onboarding; ALL_VENUES_ACCESS can read venuesTable on the server but every governance write refuses it and refuses VENUE_OWNER.',
        steps: [
          ['Sign in with ALL_VENUES_ACCESS only and type /venues', 'Refused with "You do not have access to Duncit Onboarding. Please contact your administrator."'],
          ['As VENUE_OWNER call approveVenue on their own pending venue', 'FORBIDDEN "Access Denied"; the venue stays pending'],
          ['Call setVenueActive and setVenueDeductions with an ALL_VENUES_ACCESS token', 'FORBIDDEN "Access Denied"'],
          ['Call venuesTable with a USER token', 'FORBIDDEN "Access Denied"'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Onboarded E-Commerce Brands',
    description: 'ecommBrandsTable and approve/reject are requireRole(BRAND_REVIEW = SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, ONBOARDING_MANAGER, PRODUCTS_MANAGER); the route also needs the product flag.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Brand review (/ecomm-brands)',
        description: 'Partner Brand owners (ECOMM_MANAGER), console roles and USER cannot review brands; with the product flag off the route redirects even for ONBOARDING_MANAGER.',
        steps: [
          ['Sign in with ECOMM_MANAGER only and type /ecomm-brands', 'Refused with "You do not have access to Duncit Onboarding. Please contact your administrator."'],
          ['As ECOMM_MANAGER call approveEcommBrand on their own brand', 'FORBIDDEN "Access Denied"; the brand stays in review'],
          ['Call ecommBrandsTable with an ALL_VENUES_ACCESS token', 'FORBIDDEN "Access Denied"'],
          ['As ONBOARDING_MANAGER with is_product_visible off type /ecomm-brands', 'Redirected to /'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Onboarded Club Admins',
    description: 'clubAdminProfilesTable is consoleReaders(\'CLUB_ADMIN\'); approve/reject/commission/active are consoleGovernors(\'CLUB_ADMIN\').',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Club admin review (/club-admins)',
        description: 'CLUB_ADMIN, console roles and USER cannot sign in to review; governance writes refuse ALL_CLUB_ADMINS_ACCESS and CLUB_ADMIN.',
        steps: [
          ['Sign in with ALL_CLUB_ADMINS_ACCESS only and type /club-admins', 'Refused with "You do not have access to Duncit Onboarding. Please contact your administrator."'],
          ['As CLUB_ADMIN call approveClubAdminProfile on their own profile', 'FORBIDDEN "Access Denied"'],
          ['Call setClubAdminCommission with an ALL_CLUB_ADMINS_ACCESS token', 'FORBIDDEN "Access Denied"; the commission is unchanged'],
          ['As ONBOARDING_MANAGER open "Onboarded Club Admins"', 'The table loads'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Onboarding Settings',
    description: 'The /settings page edits the onboarding intro: onboardingIntro is requireAuth, updateOnboardingIntro is requireRole(SUPER_ADMIN, ONBOARDING_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Onboarding settings (/settings)',
        description: 'Console roles, partners and USER cannot open Settings; the intro stays readable to any signed-in user (the app shows it) but only ONBOARDING_MANAGER and SUPER_ADMIN can change it.',
        steps: [
          ['Sign in with ALL_VENUES_ACCESS only and type /settings', 'Refused with "You do not have access to Duncit Onboarding. Please contact your administrator."'],
          ['Call updateOnboardingIntro with a HOST token and with a CITY_ADMIN token', 'Both FORBIDDEN "Access Denied"; the intro is unchanged'],
          ['Call onboardingIntro with no token', 'UNAUTHENTICATED "Not authenticated"'],
          ['As ONBOARDING_MANAGER open Settings and save the intro', 'The change is saved'],
        ],
      },
    ],
  },
  {
    name: 'Products: Access & Product Visibility',
    description: 'products.duncit.com admits PRODUCTS_MANAGER (requiredRoles) and SUPER_ADMIN; every route except / and /profile also needs the is_product_visible flag (RequireProducts).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Products dashboard (/)',
        description: 'Partner Brand owners (ECOMM_MANAGER), the pet-store role and USER cannot sign in to the Products portal.',
        steps: [
          ['Sign in to products.duncit.com with ECOMM_MANAGER only', 'Refused with "You do not have access to Duncit Products. Please contact your administrator."'],
          ['Repeat with ECOMM_STORE_MANAGER only and with USER only', 'The same message'],
          ['Signed out, open /', 'Redirected to /login?redirect=%2F'],
          ['Remove PRODUCTS_MANAGER from a signed-in account and reload', 'Bounced to /login?denied=1 with the same message'],
          ['As PRODUCTS_MANAGER with the product flag off type /inventory', 'Redirected to / (the Welcome dashboard)'],
        ],
      },
    ],
  },
  {
    name: 'Products: Duncit Products',
    description: 'inventoryProductsTable and the inventory writes are requireRole(SUPER_ADMIN, CITY_ADMIN, PRODUCTS_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Duncit catalogue (/inventory)',
        description: 'ECOMM_MANAGER and USER cannot list or change Duncit-owned inventory.',
        steps: [
          ['Sign in with ECOMM_MANAGER only and type /inventory', 'Refused with "You do not have access to Duncit Products. Please contact your administrator."'],
          ['Call inventoryProductsTable with an ECOMM_MANAGER token', 'FORBIDDEN "Access Denied"'],
          ['Call createInventoryProduct and archiveInventoryProduct with a USER token', 'FORBIDDEN "Access Denied"; nothing is created or archived'],
          ['As PRODUCTS_MANAGER open "Duncit Products"', 'The table loads'],
        ],
      },
    ],
  },
  {
    name: 'Products: Catalog Brands',
    description: 'The /catalog/brands list reads ecommBrandsTable (BRAND_REVIEW); setBrandCommission and setEcommBrandActive are staff-only.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Partner brands (/catalog/brands)',
        description: 'A Partner Brand owner cannot read every brand or change a brand\'s commission or live switch.',
        steps: [
          ['Sign in with ECOMM_MANAGER only and type /catalog/brands', 'Refused with "You do not have access to Duncit Products. Please contact your administrator."'],
          ['Call ecommBrandsTable with an ECOMM_MANAGER token', 'FORBIDDEN "Access Denied"'],
          ['Call setBrandCommission and setEcommBrandActive on their own brand with the ECOMM_MANAGER token', 'FORBIDDEN "Access Denied"; commission and status are unchanged'],
          ['As PRODUCTS_MANAGER open "Brands"', 'The brands table loads'],
        ],
      },
    ],
  },
  {
    name: 'Products: Brands Review',
    description: 'approveEcommBrand / rejectEcommBrand are requireRole(BRAND_REVIEW = SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, ONBOARDING_MANAGER, PRODUCTS_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Brand review (/ecomm/brands)',
        description: 'A brand owner cannot approve their own brand and USER cannot read the review queue.',
        steps: [
          ['Sign in with ECOMM_MANAGER only and type /ecomm/brands', 'Refused with "You do not have access to Duncit Products. Please contact your administrator."'],
          ['As ECOMM_MANAGER call approveEcommBrand on their own pending brand', 'FORBIDDEN "Access Denied"; the brand stays in review'],
          ['Call ecommBrandsTable with a USER token', 'FORBIDDEN "Access Denied"'],
          ['As PRODUCTS_MANAGER open "Brands Review" and approve the brand', 'The brand is approved'],
        ],
      },
    ],
  },
  {
    name: 'Products: Ecomm Requests',
    description: 'The Brand Request / Product Request pages call myEcommChangeRequests and submitEcommChangeRequest, requireRole(SUPER_ADMIN, CITY_ADMIN, PRODUCTS_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Change requests (/ecomm/brand-request)',
        description: 'ECOMM_MANAGER and USER cannot raise or read the Products team\'s change requests.',
        steps: [
          ['Sign in with ECOMM_MANAGER only and type /ecomm/brand-request', 'Refused with "You do not have access to Duncit Products. Please contact your administrator."'],
          ['Call myEcommChangeRequests with an ECOMM_MANAGER token', 'FORBIDDEN "Access Denied"'],
          ['Call submitEcommChangeRequest with a USER token', 'FORBIDDEN "Access Denied"; no request is filed'],
          ['As PRODUCTS_MANAGER open "Brand Request"', 'The page loads'],
        ],
      },
    ],
  },
  {
    name: 'Products: Warehouse Approval',
    description: 'warehouseApprovalRequests, approveWarehouseRequest and denyWarehouseRequest are requireRole(SUPER_ADMIN, CITY_ADMIN, PRODUCTS_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Warehouses (/warehouse-approval)',
        description: 'A brand owner cannot approve their own pickup address and USER cannot read the queue.',
        steps: [
          ['Sign in with ECOMM_MANAGER only and type /warehouse-approval', 'Refused with "You do not have access to Duncit Products. Please contact your administrator."'],
          ['As ECOMM_MANAGER call approveWarehouseRequest on the request for their own pickup address', 'FORBIDDEN "Access Denied"; the request stays pending'],
          ['Call warehouseApprovalRequests with a USER token', 'FORBIDDEN "Access Denied"'],
          ['As PRODUCTS_MANAGER open "Pickup Address Approval"', 'The queue loads'],
        ],
      },
    ],
  },
  {
    name: 'Products: Orders & Fulfilment',
    description: 'productOrdersTable and order operations are OPS_RW (SUPER_ADMIN, CITY_ADMIN, PRODUCTS_MANAGER, FINANCE_MANAGER); forceCancelProductOrder is CANCEL_RW (SUPER_ADMIN, PRODUCTS_MANAGER, FINANCE_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Order fulfilment (/orders)',
        description: 'ECOMM_MANAGER and USER cannot read the platform order table or move an order; CITY_ADMIN can operate orders but cannot force-cancel.',
        steps: [
          ['Sign in with ECOMM_MANAGER only and type /orders', 'Refused with "You do not have access to Duncit Products. Please contact your administrator."'],
          ['Call productOrdersTable with an ECOMM_MANAGER token', 'FORBIDDEN "Access Denied"'],
          ['Call advanceProductOrderStatus with a USER token', 'FORBIDDEN "Access Denied"; the order status is unchanged'],
          ['Call forceCancelProductOrder with a CITY_ADMIN token', 'FORBIDDEN "Access Denied"; no refund is created'],
          ['As PRODUCTS_MANAGER open "Orders"', 'The orders table loads'],
        ],
      },
    ],
  },
  {
    name: 'Products: Pod Shop Slider',
    description: 'updatePodShopSlider is requireRole(SUPER_ADMIN, CITY_ADMIN, PRODUCTS_MANAGER, TECH_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Pod Shop slider (/settings/pod-shop-slider)',
        description: 'ECOMM_MANAGER and USER cannot change the Pod Shop slider.',
        steps: [
          ['Sign in with ECOMM_MANAGER only and type /settings/pod-shop-slider', 'Refused with "You do not have access to Duncit Products. Please contact your administrator."'],
          ['Call updatePodShopSlider with an ECOMM_MANAGER token', 'FORBIDDEN "Access Denied"; the slider is unchanged'],
          ['Call it with a USER token', 'FORBIDDEN "Access Denied"'],
          ['As PRODUCTS_MANAGER open "Pod Shop Slider" and save', 'The slider is saved'],
        ],
      },
    ],
  },
  {
    name: 'Products: Deletion Requests',
    description: 'The Products portal Delete Requests group: catalogDeletionRequestsTable and reviewCatalogDeletion are requireRole(PRODUCTS_TEAM = SUPER_ADMIN, PRODUCTS_MANAGER); partners raise requests with ECOMM_MANAGER.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Catalogue deletion (/deletion-requests/brands)',
        description: 'A brand owner can raise a deletion request but cannot read the review queue or approve their own request; USER and CITY_ADMIN are refused too.',
        steps: [
          ['Sign in with ECOMM_MANAGER only and type /deletion-requests/brands', 'Refused with "You do not have access to Duncit Products. Please contact your administrator."'],
          ['As ECOMM_MANAGER call reviewCatalogDeletion(approve: true) on their own brand deletion request', 'FORBIDDEN "Access Denied"; the brand is not deleted'],
          ['Call catalogDeletionRequestsTable with a CITY_ADMIN token', 'FORBIDDEN "Access Denied"'],
          ['As PRODUCTS_MANAGER open "Brand Deletion Requests"', 'The queue loads'],
        ],
      },
    ],
  },
  {
    name: 'Products: Product Returns',
    description: 'Pod Shop returns: podShopReturnsTable and the return actions act as STAFF for SUPER_ADMIN, PRODUCTS_MANAGER, FINANCE_MANAGER, as BRAND (own brands only) for ECOMM_MANAGER, and refuse everyone else.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Pod Shop returns (/returns)',
        description:
          'ECOMM_MANAGER cannot open the Products portal; on the server a brand owner is scoped to their own brands\' returns rather than refused, and USER is refused "Access Denied".',
        steps: [
          ['Sign in with ECOMM_MANAGER only and type /returns', 'Refused with "You do not have access to Duncit Products. Please contact your administrator."'],
          ['Call podShopReturnsTable with a USER token', 'FORBIDDEN "Access Denied"'],
          ['Call refundPodShopReturn with a CITY_ADMIN token', 'FORBIDDEN "Access Denied"; no refund is created'],
          ['Call podShopReturnsTable with an ECOMM_MANAGER token', 'Only returns on that partner\'s own brands are listed'],
          ['As PRODUCTS_MANAGER open "Product Returns"', 'Every return is listed'],
        ],
      },
    ],
  },
  {
    name: 'Products: Cart Settings',
    description: 'productCartSettings is a public read; updateProductCartSettings is requireRole(SUPER_ADMIN, PRODUCTS_MANAGER, TECH_MANAGER).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Cart settings (/cart/settings)',
        description: 'ECOMM_MANAGER and USER cannot open Cart Settings or save them; the settings themselves stay publicly readable.',
        steps: [
          ['Sign in with ECOMM_MANAGER only and type /cart/settings', 'Refused with "You do not have access to Duncit Products. Please contact your administrator."'],
          ['Call updateProductCartSettings with an ECOMM_MANAGER token and a CITY_ADMIN token', 'Both FORBIDDEN "Access Denied"; the settings are unchanged'],
          ['Call productCartSettings with no token', 'The public cart settings are returned'],
          ['As PRODUCTS_MANAGER open "Cart Settings" and save', 'The change is saved'],
        ],
      },
    ],
  },
  {
    name: 'Clubs: Requests for Club Admins',
    description: 'clubs.duncit.com /club-admin-requests: clubSlotRequestsTable is consoleReaders(\'CLUB\') and resolveClubSlotRequest is consoleEditors(\'CLUB\') = SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, ALL_CLUBS_ACCESS (no ONBOARDING_MANAGER: a club is not an application).',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Club slot requests (/club-admin-requests)',
        description: 'ONBOARDING_MANAGER, CLUB_ADMIN, USER and other staff cannot sign in to the Clubs console or read/resolve club slot requests.',
        steps: [
          ['Sign in to clubs.duncit.com with ONBOARDING_MANAGER only', 'Refused with "You do not have access to Duncit Clubs. Please contact your administrator."'],
          ['Signed out, type /club-admin-requests', 'Redirected to /login?redirect=%2Fclub-admin-requests'],
          ['Call clubSlotRequestsTable with an ONBOARDING_MANAGER token and a CLUB_ADMIN token', 'Both FORBIDDEN "Access Denied"'],
          ['Call resolveClubSlotRequest with a CLUB_ADMIN token', 'FORBIDDEN "Access Denied"; the request stays open'],
          ['As ALL_CLUBS_ACCESS open "Requests for Club Admins"', 'The table loads'],
        ],
      },
    ],
  },
  {
    name: 'Venues: Venue Editor',
    description: 'The Venues console editor: adminUpdateVenue is consoleEditors(\'VENUE\'); approve/reject, the live switch, the host request limit and money (share/commission/cancellation) are consoleGovernors(\'VENUE\'), money also FINANCE_MANAGER.',
    sub_flows: [
      {
        name: 'ALL_VENUES_ACCESS editor cannot approve, deactivate or change venue money',
        description:
          'For a viewer without a governor role the "Status and money" card disables Status, "Live and taking bookings", "Venue share %", "Venue commission %" and the host request limit and explains why; the server refuses the same changes for ALL_VENUES_ACCESS.',
        steps: [
          ['Sign in to venues.duncit.com with ALL_VENUES_ACCESS only and open a venue\'s editor', 'The "Status and money" card shows the note "Approvals, the percentages and the live switch are set by platform admins and the onboarding desk. Everything else on this page is yours to edit."'],
          ['Inspect Status, "Live and taking bookings", "Venue share %" and "Venue commission %"', 'All are disabled; the current values are still visible'],
          ['Change the venue address and save', 'The address change is saved'],
          ['Call adminUpdateVenue with status: APPROVED using the ALL_VENUES_ACCESS token', 'FORBIDDEN "You cannot change a venue review status"; the status is unchanged'],
          ['Call setVenueActive, setVenueDeductions and setVenueCancellationTrigger with the same token', 'Each FORBIDDEN "Access Denied"; live state, percentages and cancellation policy are unchanged'],
          ['Sign in as ONBOARDING_MANAGER and open the same editor', 'The governed fields are enabled and the note is gone'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Store: Shopper Access & Privacy',
    description:
      'The Duncit Pet Store (ecomm.duncit.com). Browsing is public; the account pages need a store sign-in; orders, invoices, payments and returns are read only by the placing account or, for a guest order, by its access key (or the guest cart token for a payment). Separate from Partner Brand.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Store browsing (/)',
        description: 'The shelf is public to everyone; while store_enabled is off every route shows the "Opening soon" page; browsing never exposes a shopper\'s data.',
        steps: [
          ['Signed out, open https://ecomm.duncit.com/', 'The home page renders without asking to sign in'],
          ['Call storeHome and storeNavigation with no token', 'Both answer; the payload has no customer, order or address data'],
          ['Switch the store off in the E-commerce console Settings and reload /', 'Every route shows "Opening soon" and "<store name> is getting its shelves ready. Please check back shortly."'],
          ['Call storeSettings with no token', 'Only public storefront settings are returned (name, logo, support contacts, COD/autoship switches); no Razorpay account or admin field'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store search (/search)',
        description: 'Search and suggestions are public and only return listed products.',
        steps: [
          ['Signed out, open /search?q=food', 'Results render without sign-in'],
          ['Call storeSearch and storeSuggest with no token for the name of an unlisted (draft) product', 'The draft product is not returned'],
          ['Repeat signed in as a shopper', 'The same results: search carries no per-user data'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store product (/p/:slug)',
        description: 'A product page is public for listed products; an unlisted or unknown slug shows the not-found page.',
        steps: [
          ['Signed out, open /p/<listed slug>', 'The product page renders'],
          ['Open /p/<slug of a draft product>', 'The not-found content "Page not found" with "This page has wandered off. Let us take you back to the shop." and "Back to home"'],
          ['Call storeProduct(slug: <draft slug>) with no token', 'Answers null'],
          ['Call storeSubmitReview with no token', 'UNAUTHENTICATED "Not authenticated"'],
          ['Call storeSubmitReview signed in as a shopper who never received the product', 'BAD_USER_INPUT "You can review a product once it has been delivered to you"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store cart (/cart)',
        description: 'A cart is keyed to the signed-in account (u:<id>) or to the browser\'s guest cart token (g:<token>); nobody reads another cart.',
        steps: [
          ['As guest A add an item, then open /cart in a different browser (guest B)', 'Guest B sees an empty cart'],
          ['Call storeCart with guest A\'s cart_token while signed in as shopper C', 'Shopper C\'s own cart is returned, not guest A\'s'],
          ['Call storeCart with no token and a malformed cart_token', 'BAD_USER_INPUT "Your cart session has expired — refresh the page"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store checkout (/checkout -> /order/success)',
        description: 'Guest checkout follows the guest_checkout_enabled setting; the success page only opens for the payer\'s account, its cart token or the order key.',
        steps: [
          ['With guest checkout off, place an order signed out', 'Refused with "Sign in to check out"'],
          ['As shopper A pay an order and copy /order/success?payment=<id>&key=<key>', 'The order confirmation renders for A'],
          ['Open the same link without &key= in another browser', 'An error alert "Sign in with the account that placed this order" (account order) or "This order link is not valid" (guest order); no order details'],
          ['Call storeOrderConfirmation for A\'s payment signed in as shopper B', 'FORBIDDEN "Sign in with the account that placed this order"'],
          ['Call storeVerifyPayment for a guest payment with a different guest cart_token', 'FORBIDDEN "This order link is not valid"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store account (/account)',
        description: 'Account pages ask a signed-out visitor to sign in; the address book and profile are bound to the token user.',
        steps: [
          ['Signed out, open /account', 'The sign-in dialog opens over "Sign in to see your account" / "Your orders, addresses and saved products are waiting." with a "Sign in" button'],
          ['Call myAddresses with no token', 'UNAUTHENTICATED "Not authenticated"'],
          ['Signed in as shopper B call deleteMyAddress and setDefaultMyAddress with an address id of shopper A', 'NOT_FOUND "Address not found"; A\'s address book is unchanged'],
          ['Call saveMyAddress(id: <A\'s address id>) as B', 'NOT_FOUND "Address not found"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store orders (/account/orders/:orderNo)',
        description: 'My orders lists only the token user\'s pet-store orders; an order detail of someone else is refused.',
        steps: [
          ['Signed out, open /account/orders', 'The sign-in gate shows instead of the list'],
          ['Signed in as shopper B open /account/orders/<A\'s order no>', 'An error alert "Sign in with the account that placed this order"; no items, address or phone are shown'],
          ['Call storeMyOrders as B', 'Only B\'s orders are returned'],
          ['Call storeOrder with an unknown order_no', 'NOT_FOUND "Order not found"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store autoship (/autoship)',
        description: 'Autoship needs autoship_enabled and a signed-in shopper; every subscription operation is scoped to the token user.',
        steps: [
          ['With autoship off, open /autoship', 'The not-found content "Page not found"'],
          ['With autoship on and signed out, open /autoship', 'The sign-in gate "Sign in to see your account"'],
          ['Signed in as B call storePauseSubscription and storeCancelSubscription with A\'s subscription id', 'NOT_FOUND "Subscription not found"; A\'s subscription is unchanged'],
          ['Call storeMySubscriptions with no token', 'UNAUTHENTICATED "Not authenticated"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store engagement (/wishlist)',
        description: 'The wishlist is keyed like the cart: account or guest cart token; nobody reads another shopper\'s list.',
        steps: [
          ['As guest A heart a product, then open /wishlist in another browser', 'The other browser shows the empty wishlist state'],
          ['Signed in as B call storeWishlist with A\'s guest cart_token', 'B\'s own wishlist is returned'],
          ['Sign in as A in A\'s browser', 'storeMergeGuest moves the guest wishlist onto A\'s account'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store support (/contact)',
        description: 'The Contact page files a support ticket with or without an account; it never reveals other tickets.',
        steps: [
          ['Signed out, open /contact', 'The "Contact us" form renders'],
          ['Submit the form signed out', 'A ticket is created and only its ticket number is returned'],
          ['Call storeCreateSupportTicket and inspect the response', 'Only ticket_no comes back; no other ticket or customer data'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store settings (/)',
        description: 'Store settings are written only from the E-commerce console; the storefront read is public and trimmed.',
        steps: [
          ['Call storeSettings with no token', 'Public fields only'],
          ['Call storeAdminSettings with a shopper token', 'FORBIDDEN "Access Denied"'],
          ['Call storeSaveSettings with no token', 'UNAUTHENTICATED "Not authenticated"; nothing is saved'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store content (/pages/:slug)',
        description: 'Policy pages are public when active; an inactive page reads as not found; page edits are console-only.',
        steps: [
          ['Signed out, open /pages/<active slug>', 'The page renders'],
          ['Call storePage with the slug of an inactive page', 'Answers null; the storefront shows the not-found content'],
          ['Call storeSavePage with a shopper token', 'FORBIDDEN "Access Denied"; the page is unchanged'],
        ],
      },
      {
        name: 'Shopper cannot read another shopper\'s order, invoice or return',
        description:
          'storeOrder, storeInvoicePdf, storeOrderReturns, storeCancelOrder and storeRequestReturn check the order owner: an account order needs that account, a guest order needs its access key; anything else is refused and no address or phone leaks.',
        steps: [
          ['Signed in as shopper B call storeOrder(order_no: <A\'s account order>)', 'FORBIDDEN "Sign in with the account that placed this order"'],
          ['Call storeInvoicePdf and storeOrderReturns for the same order as B', 'Both FORBIDDEN "Sign in with the account that placed this order"; no PDF is returned'],
          ['As a guest call storeOrder for a guest order with a wrong access_key', 'FORBIDDEN "This order link is not valid"'],
          ['Open /track?order=<guest order>&key=<wrong key>', 'No order details are shown'],
          ['As B call storeRequestReturn for A\'s order', 'FORBIDDEN "This order is not yours to return"; no return is created'],
          ['As B call storeCancelOrder for A\'s order', 'FORBIDDEN "Sign in with the account that placed this order"; the order is not cancelled'],
          ['Call storeTrackOrder with the right order number and a wrong email or phone', 'NOT_FOUND "We could not find an order with those details"'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Portal: Access',
    description:
      'The Duncit E-commerce console (pet store admin). requiredRoles is ECOMM_STORE_MANAGER (plus SUPER_ADMIN), and every storeAdmin*/store shipping resolver runs requireStoreAdmin = requireRole(SUPER_ADMIN, ECOMM_STORE_MANAGER). ECOMM_MANAGER (Partner Brand) is not admitted.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Store catalogue (/products/new)',
        description: 'PRODUCTS_MANAGER, ECOMM_MANAGER, USER and guests cannot open the product editor or call storeSaveProduct.',
        steps: [
          ['Sign in to the E-commerce console with PRODUCTS_MANAGER only', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Signed out, type /products/new', 'Redirected to /login?redirect=%2Fproducts%2Fnew'],
          ['Call storeSaveProduct with a PRODUCTS_MANAGER token', 'FORBIDDEN "Access Denied"; no product is created'],
          ['Call storeAdminProductsTable with no token', 'UNAUTHENTICATED "Not authenticated"'],
          ['Sign in as ECOMM_STORE_MANAGER and open /products/new', 'The product editor renders'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store coupons (/coupons)',
        description: 'Coupons are store-admin only.',
        steps: [
          ['Sign in with USER only and type /coupons', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Call storeCouponsTable with a PRODUCTS_MANAGER token', 'FORBIDDEN "Access Denied"'],
          ['Call storeSaveCoupon and storeDeleteCoupon with a USER token', 'FORBIDDEN "Access Denied"; coupons are unchanged'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store orders (/orders/:id)',
        description: 'Order detail, notes, status, cancel and COD collection are store-admin only.',
        steps: [
          ['Sign in with PRODUCTS_MANAGER only and type /orders/<id>', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Call storeAdminOrder with a USER token', 'FORBIDDEN "Access Denied"; no address or phone is returned'],
          ['Call storeAdminCancelOrder with a PRODUCTS_MANAGER token', 'FORBIDDEN "Access Denied"; the order and its payment are unchanged'],
          ['Call storeOrdersTable with no token', 'UNAUTHENTICATED "Not authenticated"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store shipping (/shipping)',
        description: 'ShipRocket status, bookings, NDR answers, COD ledger and pickup locations are store-admin only.',
        steps: [
          ['Sign in with PRODUCTS_MANAGER only and type /shipping', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Call storeShiprocketStatus and storeCodLedger with a PRODUCTS_MANAGER token', 'Both FORBIDDEN "Access Denied"'],
          ['Call storeBookShipment with a USER token', 'FORBIDDEN "Access Denied"; no shipment is booked'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store returns (/returns/:id)',
        description: 'Return review and refunds are store-admin only.',
        steps: [
          ['Sign in with USER only and type /returns/<id>', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Call storeAdminReturn with a PRODUCTS_MANAGER token', 'FORBIDDEN "Access Denied"'],
          ['Call storeUpdateReturn with a USER token', 'FORBIDDEN "Access Denied"; the return status and refund are unchanged'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store reviews (/reviews)',
        description: 'Review moderation (delete, reply) is store-admin only.',
        steps: [
          ['Sign in with PRODUCTS_MANAGER only and type /reviews', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Call storeReviewsTable with a USER token', 'FORBIDDEN "Access Denied"'],
          ['Call storeDeleteReview and storeReplyReview with a PRODUCTS_MANAGER token', 'FORBIDDEN "Access Denied"; the review is unchanged'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store carts (/carts)',
        description: 'Abandoned carts (with shopper contact details) and cart reminders are store-admin only.',
        steps: [
          ['Sign in with USER only and type /carts', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Call storeCartsTable with a PRODUCTS_MANAGER token', 'FORBIDDEN "Access Denied"'],
          ['Call storeRemindCart with a USER token', 'FORBIDDEN "Access Denied"; no reminder is sent'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store customers (/customers)',
        description: 'The customer list and a customer\'s orders are store-admin only.',
        steps: [
          ['Sign in with PRODUCTS_MANAGER only and type /customers', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Call storeCustomersTable with a USER token', 'FORBIDDEN "Access Denied"'],
          ['Call storeCustomerOrders(email: <any shopper>) with a PRODUCTS_MANAGER token', 'FORBIDDEN "Access Denied"; no orders are returned'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store stock (/stock-alerts)',
        description: 'Back-in-stock subscribers and sends are store-admin only.',
        steps: [
          ['Sign in with USER only and type /stock-alerts', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Call storeStockAlertsTable with a PRODUCTS_MANAGER token', 'FORBIDDEN "Access Denied"'],
          ['Call storeSendBackInStock with a USER token', 'FORBIDDEN "Access Denied"; no email is sent'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store payments (/logs/payments)',
        description: 'The store payment log is store-admin only.',
        steps: [
          ['Sign in with PRODUCTS_MANAGER only and type /logs/payments', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Call storePaymentsTable with a PRODUCTS_MANAGER token', 'FORBIDDEN "Access Denied"'],
          ['Call storePaymentsTable with no token', 'UNAUTHENTICATED "Not authenticated"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store settings (/settings)',
        description: 'storeAdminSettings and storeSaveSettings (incl. the Razorpay account and store on/off) are store-admin only.',
        steps: [
          ['Sign in with PRODUCTS_MANAGER only and type /settings', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Call storeAdminSettings and storeAdminRazorpayAccounts with a USER token', 'Both FORBIDDEN "Access Denied"'],
          ['Call storeSaveSettings(store_enabled: false) with a PRODUCTS_MANAGER token', 'FORBIDDEN "Access Denied"; the storefront stays open'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store pages (/pages)',
        description: 'Policy and content page editing is store-admin only.',
        steps: [
          ['Sign in with USER only and type /pages', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Call storeAdminPages with a PRODUCTS_MANAGER token', 'FORBIDDEN "Access Denied"'],
          ['Call storeSavePage and storeDeletePage with a USER token', 'FORBIDDEN "Access Denied"; pages are unchanged'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Store support (/support)',
        description: 'The console Support page only explains tagging and links out to the Support console (tickets?source=STORE) and the store Contact page; the tickets themselves are guarded by the Support console.',
        steps: [
          ['Sign in with PRODUCTS_MANAGER only and type /support', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['As ECOMM_STORE_MANAGER open Support > "Store tickets"', 'The page shows two link buttons that open in a new tab: the Support console tickets filtered to the store and the store\'s /contact page'],
          ['Check the page\'s network calls', 'No ticket data is fetched by this page'],
        ],
      },
      {
        name: 'Partner Brand ECOMM_MANAGER can reach the pet-store admin (separation check)',
        description:
          'Premise no longer holds: requiredRoles is ECOMM_STORE_MANAGER and requireStoreAdmin allows only SUPER_ADMIN and ECOMM_STORE_MANAGER, so a Partner Brand ECOMM_MANAGER is refused in the console and on every store admin call; this flow asserts the separation.',
        steps: [
          ['Sign in to the E-commerce console with an account holding only ECOMM_MANAGER and an approved Partner Brand', 'Refused with "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Call storeOrdersTable and storeCustomersTable with that ECOMM_MANAGER token', 'Both FORBIDDEN "Access Denied"; no pet-store order or customer data is returned'],
          ['Call storeSaveProduct with the same token', 'FORBIDDEN "Access Denied"; nothing is created on the pet store'],
          ['Sign the same account in to partners-app.duncit.com and open /ecomm-brand', 'The Partner Brand area works as before; it shows only the partner\'s own brands and no pet-store data'],
          ['Sign in to the console with ECOMM_STORE_MANAGER', 'The console opens and store orders load'],
        ],
      },
    ],
  },
];
