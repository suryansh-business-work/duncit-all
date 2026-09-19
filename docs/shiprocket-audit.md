# ShipRocket integration — audit (19 Sep 2026)

Scope: pet-store orders (`ProductOrder.channel = PET_STORE`) from ecomm.duncit.com,
operated from ecomm-portal.duncit.com. The pod shop (`POD_SHOP`) rides the same
shipment code, so every fix below applies to it too.

## Where the code lives

| Area | File |
| --- | --- |
| REST wrapper (auth, token, calls) | `server/src/modules/commerce/shiprocket/shiprocket.gateway.ts` |
| Quote / create shipment / tracking | `server/src/modules/commerce/shiprocket/shiprocket.service.ts` |
| Status mapping | `server/src/modules/commerce/shiprocket/shiprocket.statusMap.ts` |
| Webhook | `server/src/modules/commerce/shiprocket/shiprocket.webhook.ts`, mounted in `server/src/index.ts` at `/shiprocket` |
| Order creation after payment | `productOrderService.createFromPayment` → `tryCreateShipment` (`productOrder.service.ts`), called from `payment.finalize.ts` |
| Store shipping quote | `quoteStoreShipping` in `store/store.pricing.ts` |
| Product-page pincode check | `deliveryCheck` in `store/store.storefront.service.ts` |
| Cancel | `cancelOrder` in `store/store.order.service.ts` |
| Returns | `store/store.return.service.ts` (no courier leg) |
| Warehouses | `venues/brandPickupLocation/*` (`addPickupLocation` on approval) |
| Credentials | Tech portal → Environment Variables → `SHIPROCKET` (`envEntry.fields.ts`), read by `getRuntimeEnvValue` |
| Connection test | `shiprocketConnection` in `platform/envEntry/envEntry.connection.ts` |
| Admin order page | `portals/ecomm-portal/src/pages/orders/order-detail/*` |
| Storefront order / track | `website/ecomm-store/src/pages/order-detail/*`, `pages/track/*` |

## Flow status

| Step | Where | Status | Notes |
| --- | --- | --- | --- |
| Auth / token | `getToken` (gateway) | **buggy** | Token cached in process memory only (lost on every deploy). Refreshed only at TTL expiry, not a day before. Reads the Tech portal's *default* SHIPROCKET entry only — Portal Mapping (`assigned_portals`) is ignored. A refused login is latched in memory: correct (it stopped the account lock-out), but the latch also clears on every restart, so each deploy spends one more bad login. |
| Serviceability / rate | `getServiceability` | **partial** | Sends pickup/delivery pincode, weight and cod only — no dimensions, no `declared_value`, so volumetric charging is invisible. No cache: every product page view and every checkout step calls ShipRocket (twice with COD). |
| Pincode check (product page) | `deliveryCheck` | **buggy** | Any ShipRocket error (today: the refused login) is swallowed into the "could not confirm" empty answer. Root cause of "We could not confirm delivery to this pincode right now" is the failed login, not the pincode. |
| Checkout quote | `quoteStoreShipping` | **done** (rules) / partial (data) | Free above `free_shipping_above` (₹499 in prod) and flat `flat_shipping_fee` fallback both come from store settings. COD block list respected. Same weight-only request as above. |
| Create order (`/orders/create/adhoc`) | `shiprocketService.createShipment` | **partial** | Idempotent only on our side (`shiprocket.order_id` set). If ShipRocket accepts the order and our save fails, a retry books a second one. Parcel = sum of weights, **max** of L/B/H — height is not stacked, so multi-item parcels are under-declared. No HSN on items. `pickup_location` falls back to a hard-coded `'Primary'`. No address sanity check before the call. |
| Courier + AWB (`/courier/assign/awb`) | `assignAwb` | **partial** | Always the recommended courier; the admin cannot choose. ETA not saved. No wallet check — a low wallet fails the AWB and the order drops to FAILED. |
| Pickup (`/courier/generate/pickup`) | — | **missing** | Never requested. |
| Label | `generateLabel` | **partial** | Function exists, never called; only the `label_url` returned by AWB assignment is stored. |
| Invoice / manifest | — | **missing** | `invoice_url`, `manifest_url` columns exist, nothing fills them. |
| Webhook | `/shiprocket/webhook` | **buggy** | ShipRocket refuses webhook URLs containing "shiprocket", "kartrocket", "sr" or "kr", so this path can never be registered (and none is). When no secret is configured the endpoint accepts anything — unauthenticated "DELIVERED" would mark a COD order paid. |
| Tracking poll | `refreshTracking` | **partial** | Manual button only; no scheduled fallback. Each refresh appends the latest activity again (duplicate events); earlier scans are never stored. |
| Status mapping | `mapShiprocketStatus` | **partial** | No NDR/undelivered, no lost, RTO delivered not distinguished from RTO initiated. Label-only (ignores status ids). |
| Buyer notifications | `afterStoreStatusChange` → `mailOrderUpdate` | **partial** | Email on status change. No WhatsApp for shipped / out for delivery / delivered. |
| Cancel before pickup | `cancelOrder` | **done** | ShipRocket `/orders/cancel`, restock (`restock_on_cancel`), refund recorded / coins returned. |
| Return (reverse pickup) | `store.return.service` | **missing** | Returns are approved/refunded on paper only; no `/orders/create/return`, no return AWB, no tracking. |
| NDR / RTO | — | **missing** | No NDR queue or actions; RTO delivered does not restock or settle money. |
| COD remittance | — | **missing** | |
| Pickup locations | `brandPickupLocation` | **partial** | One-way: `addpickup` on approval. Never reads `/settings/company/pickup`, so a nickname changed or verified in ShipRocket is invisible. |
| Wallet guard | — | **missing** | |
| Retries / errors | `srRequest` | **buggy** | No timeout, no backoff on 5xx/429, errors not logged with context. `tryCreateShipment` logs at warn and the order shows FAILED with the raw message. |

## The two stuck orders

`ord_mu8319d825afec77` and `ord_mu7g657hdc32526e` are FAILED with
`ShipRocket login failed: Invalid email and password combination` — the saved
Tech-portal credentials are stale. The Tech portal's *Test connection* answering
HTTP 403 is the same refusal (ShipRocket answers 403 for a wrong or blocked API
user). Nothing retries them automatically; after the credentials are fixed they
need the order page's Retry — which books a real courier and debits the wallet,
so it is left for the owner to trigger.

## The ship-to address ("India / India, Uttar Pradesh, 201017")

The pipeline itself carries every field: the checkout form requires line 1,
city and state (`makeAddressSchema`), the server re-checks them
(`cleanAddress`), the payment metadata keeps the object whole, and
`createFromPayment` copies it verbatim onto the order. There is no mapping bug
between the storefront, the payment and the order. What the order page shows
means the values themselves were placeholders — line 1 and/or city holding just
"India" (the browser's address autofill fills `address-line1` /
`address-level2` with the country for a profile that has no street). Both
checks only test *non-empty*, so "India" passes, and ShipRocket then rejects it
(address under ~3 characters / no real city).

**Fix:** reject an address line or city that is shorter than 3 characters or is
only the country/state/pincode, on the storefront form and in `cleanAddress`;
check the same before calling ShipRocket, with a readable error; and let an
admin correct the ship-to address on the order page before (re)creating the
shipment — the only way to rescue orders already placed.

## Other findings

- **MRP ₹0.00 in the E-commerce Products table** — the table shows only the
  listing-level `store.mrp`, which nothing fills; the catalogue forms (Products
  portal, Partners app) never capture an MRP at all, and the per-variant
  `mrp` is only editable deep in the listing editor.
- **Brand empty** — `brand_name` is denormalised on the product but only ever
  written when a Partners listing is created; the Products portal form sets
  `brand_id` without it, so the table and the storefront Brand facet read "".
- **products.duncit.com "This feature is currently unavailable", 0 products** —
  the `is_product_visible` system flag is **off** in production (read from the
  public `publicFeatureFlags` query). Every product operation is refused while it
  is off. Not changed — it needs the owner's decision (Admin → Feature Flags).
- **Payments (go-live blockers, not changed):** the two orders ran on the DUMMY
  gateway, and the Tech portal's Razorpay entry is a test account.
