# Duncit Form Validation and GraphQL Sync Improvement Guide

This guide is based on a repo-level scan of `admin/`, `mweb-app/`, `server/`, the existing `FORMS_DOCUMENTATION.md`, current Formik/Yup usage, GraphQL codegen config, and test setup.

## Short Summary

- Form validation is inconsistent. Some flows already use Formik + Yup, but many admin dialogs still use local state and submit-time checks only.
- Real-time validation is not consistently visible. Several Formik forms technically validate on change, but helper text is gated by `touched`, so users only see the error after blur or submit.
- Phone, name, slug, URL, document, and conditional fields need stronger shared rules.
- Several actual forms are missing from the current form inventory: inventory product, account edit, profile about links, pet profile, comments, post/upload, app location, signup survey, interview booking, feature flags, policies, roles/RBAC, platform fees/refunds, environment variables.
- GraphQL codegen was pointing to old `../web-ui/...` paths. It should generate from the actual `admin/` and `mweb-app/` folders and run through one root sync command.
- Cypress is not configured yet. Form tests should be added beside each form using `*.form.spec.ts` and Cypress should be configured to pick those up.

## Target Architecture

Every real form should have a nearby typed form contract file:

```text
<feature-folder>/
  <form-name>.form.ts
  <form-name>.form.spec.ts
  <existing-ui-component>.tsx
```

The `.form.ts` file should own:

- `FormValues` type, preferably from `yup.InferType<typeof schema>`.
- `initialValues` factory.
- `validationSchema` using Yup.
- `toMutationInput(values)` mapper for GraphQL input payloads.
- `fromQueryData(data)` mapper where edit forms load existing data.
- Field constants, enum option adapters, and conditional validation helpers.

The `.tsx` component should only render MUI controls, bind Formik, and call the form contract functions. This keeps UI behavior stable while moving validation logic out of components.

## Required Shared Validation Rules

Create shared rules in each app first, then use them inside each form contract.

Suggested files:

```text
admin/src/forms/validation/rules.ts
mweb-app/src/forms/validation/rules.ts
```

Rules to standardize:

| Rule | Suggested Yup rule | Applies to |
| --- | --- | --- |
| Person name | `trim().matches(/^[A-Za-z][A-Za-z .'-]{0,59}$/)` | first name, last name, owner name, host name |
| Display title | `trim().min(2).max(120)` plus restricted unsafe symbols | pod title, badge title, notification title, FAQ question |
| Phone number | `matches(/^\d{6,15}$/)` | all phone fields |
| Phone extension | `matches(/^\+?\d{1,5}$/)` | all phone code fields |
| Email | `trim().lowercase().email().max(254)` | all email fields |
| Slug/key | `matches(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/)` | slugs, feature flags, role keys, policy slug |
| URL | `url()` or custom `http/https/mailto/tel` helper | media, CTA, community, recording, links |
| Postal code | country-aware regex where possible | venue/location PIN fields |
| PAN | `matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/)` | host/venue PAN |
| Aadhar | `matches(/^\d{12}$/)` | host identity |
| GSTIN | `matches(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/)` | venue GSTIN |
| Date range | `end > start` | sliders, interviews, pods |
| Future datetime | `start > now` where create mode only | pods, interview scheduling |
| Rich text | strip HTML, require useful text length | policies, website content |

Do not silently coerce bad values in UI handlers, for example `Math.max(1, +value || 1)`. Let users type, show Yup errors in real time, then normalize only in `toMutationInput`.

## Real-Time Validation Standard

Formik should be configured consistently:

```ts
validateOnChange: true,
validateOnBlur: true,
```

Field error display should not wait only for submit. Use one shared MUI Formik field helper that shows the error after the user interacts with a field:

```ts
const showError = Boolean(meta.error && (meta.touched || meta.value !== initialValue));
```

For noisy required fields, show required errors after blur, but show format errors while typing once the field is non-empty. For async uniqueness checks such as slug/key/email, debounce validation and show loading helper text.

## GraphQL Type Sync Plan

Use GraphQL generated types as the API contract and Yup inferred types as the UI contract. The form mapper is the boundary.

Pattern:

```ts
import type { CreateVenueInput } from '../../generated/graphql/graphql';

export const venueSchema = yup.object({ ... });
export type VenueFormValues = yup.InferType<typeof venueSchema>;

export function toCreateVenueInput(values: VenueFormValues): CreateVenueInput {
  return {
    venue_name: values.venue_name.trim(),
    owner_phone: values.owner_phone.trim(),
  };
}
```

Rules:

- GraphQL input enums should come from generated types, not copied string unions.
- Form option arrays should be derived from generated enum values when possible.
- Run `npm run graphql:sync` after any server schema, input, enum, query, or mutation change.
- Keep mutation variables typed at the call site. Avoid `any` in form submit payloads.
- Put form-owned operations near the form folder when possible, then import generated operation types from `src/generated/graphql/graphql`.

## Cypress Form Test Standard

Cypress is not installed/configured yet. Add it before writing specs.

Suggested app configs:

```text
admin/cypress.config.ts
mweb-app/cypress.config.ts
```

Suggested scripts:

```json
{
  "test:forms": "cypress run --component --spec 'src/**/*.form.spec.ts'",
  "test:forms:open": "cypress open --component"
}
```

Every form spec should cover:

- required field errors show while typing or after first interaction.
- phone fields reject alphabetic and alphanumeric input.
- name fields reject invalid special characters.
- emails reject invalid format and normalize case where applicable.
- URL fields reject invalid protocols where only http/https is allowed.
- conditional required fields trigger correctly.
- submit button does not call `onSubmit` when invalid.
- valid payload calls `onSubmit` with normalized GraphQL input.

Spec location example:

```text
admin/src/pages/users-page/create-user/create-user.form.ts
admin/src/pages/users-page/create-user/create-user.form.spec.ts
```

## Admin Forms Needing Migration or Validation Fixes

| Priority | Form | Current location | Current state | Required fix |
| --- | --- | --- | --- | --- |
| P0 | Create User | `admin/src/pages/users-page/CreateUserDialog.tsx` | Inline `validForm`; weak phone/name/password/roles validation | Move to `create-user.form.ts`; Yup for names, email, phone, DOB, password, roles; real-time errors |
| P0 | User Profile Edit | `admin/src/pages/user-details-page/ProfileForm.tsx` | Controlled state, no schema | Move to `profile.form.ts`; validate names, email, phone, city/zone, URL, status |
| P0 | Host Create | `admin/src/components/AdminHostCreateDialog.tsx` | Inline required checks only | Move to `host-create.form.ts`; validate phone, email, Aadhar, PAN, media URLs, address |
| P0 | Host Edit | `admin/src/pages/hosts-page/HostEditDialog.tsx` | Inline Yup inside component, weak phone/PAN/Aadhar | Extract `host-edit.form.ts`; add strict identity and phone rules |
| P0 | Venue Edit | `admin/src/pages/venues-page/VenueEditDialog.tsx` | Inline Yup, weak owner phone/PAN/GSTIN/postal code | Extract `venue-edit.form.ts`; add document URL/type validation and owner rules |
| P0 | Admin Venue Create | `admin/src/components/AdminVenueCreateDialog.tsx` and nested folder | Likely multi-step create flow, not in current doc details | Audit against venue edit and migrate to `venue-create.form.ts` |
| P0 | Contact Action | `admin/src/pages/user-details-page/ContactActionDialog.tsx` | Yup only on submit, local state | Convert to Formik with field-level errors; URL/status/duration validation while typing |
| P0 | Notification | `admin/src/pages/notifications-page/NotificationFormDialog.tsx` | Local state, required button checks only | Add Yup conditional scope validation for location/zone/user IDs |
| P0 | Slider | `admin/src/pages/sliders-page/SliderFormDialog.tsx` | UI-level checks | Add Yup URL/media type/scope/date range validation |
| P0 | Manage Interview | `admin/src/pages/interview-requests-page/ManageInterviewDialog.tsx` | UI-level checks | Add status-driven validation, meeting URL, start/end rules |
| P1 | Pod Form | `admin/src/pages/pods-page/PodFormDialog.tsx` | Good Formik/Yup base, schema in `pod-form/schema.ts` | Rename/move schema to `pod.form.ts`; show errors while typing; tighten hashtags/media URLs |
| P1 | Inventory Product | `admin/src/pages/inventory-page/inventory-product-page/InventoryProductPage.tsx` | Formik/Yup exists, missing from doc | Rename schema to `inventory-product.form.ts`; add Cypress tests; validate barcode/contact better |
| P1 | Club Form | `admin/src/pages/clubs-page/ClubFormDialog.tsx` | Inline minimal validation | Move to `club.form.ts`; validate URLs, media, category IDs, venue links |
| P1 | Category Form | `admin/src/pages/categories-page/CategoryFormDialog.tsx` | Inline name check | Move to `category.form.ts`; validate icon/image mode, sort order, media list |
| P1 | Badge Form | `admin/src/pages/badges-page/BadgeFormDialog.tsx` | Inline title check | Move to `badge.form.ts`; condition/threshold conditional rules |
| P1 | FAQ Edit | `admin/src/pages/faqs-page/FaqEditDialog.tsx` | Inline required checks | Move to `faq.form.ts`; question/answer length and sort order validation |
| P1 | Location Form | `admin/src/pages/locations-page/LocationFormDialog.tsx` | Inline checks | Move to `location.form.ts`; country/state/city/PIN/zones validation |
| P1 | Pod Plan | `admin/src/pages/pod-plans/PodPlanFormDialog.tsx` | Inline Yup inside component | Extract `pod-plan.form.ts`; validate image URL optional empty string correctly |
| P1 | Website Content | `admin/src/pages/website-content-page/WebsiteContentDialog.tsx` and `validation.ts` | Schema exists but UI is controlled and not Formik | Move to `website-content.form.ts`; bind Formik; validate slug and rich body |
| P1 | Email Template Create | `admin/src/pages/email-templates-page/CreateTemplateForm.tsx` | Inline non-empty checks | Move to `email-template-create.form.ts`; slug, subject, name, variable syntax validation |
| P1 | Email Template Send Test | `admin/src/pages/email-templates-page/SendTestDialog.tsx` | Local state only | Move to `email-template-test.form.ts`; strict email validation |
| P1 | Policy Edit | `admin/src/pages/policies-page/PolicyEditDialog.tsx` | Controlled state, no Yup visible in dialog | Move to `policy.form.ts`; slug, title, rich text, sort order validation |
| P1 | Feature Flag Edit | `admin/src/pages/feature-flags-page/FlagEditDialog.tsx` | Local state, disabled button only | Move to `feature-flag.form.ts`; key/name/description validation |
| P2 | New Permission | `admin/src/pages/permissions-page/NewPermissionDialog.tsx` | UI-level checks | Move to `permission.form.ts`; resource/action uniqueness and enum/key rules |
| P2 | Role Edit | `admin/src/pages/roles-page/RoleEditDialog.tsx` | Needs audit | Move to `role.form.ts`; role key/name/permissions validation |
| P2 | Permissions Dialog | `admin/src/pages/roles-page/PermissionsDialog.tsx` | Needs audit | Add permission selection validation if it submits mutation |
| P2 | RBAC Key Entity | `admin/src/pages/rbac/KeyEntityEditDialog.tsx` | Needs audit | Move to `key-entity.form.ts`; key/label/description validation |
| P2 | Platform Fees | `admin/src/pages/finance/PlatformFeesPage.tsx` | Form-like settings not in doc | Move settings validation to `platform-fees.form.ts`; percent/currency bounds |
| P2 | Refund | `admin/src/pages/finance/payment-logs-page/RefundDialog.tsx` | Needs audit | Move to `refund.form.ts`; amount/reason constraints |
| P2 | Display Formats | `admin/src/pages/settings-page/DisplayFormatsSection.tsx` | date-fns try/catch | Move to `display-formats.form.ts`; keep preview validation |
| P2 | Environment Variables | `admin/src/pages/settings-page/environmentVariables.ts` | Yup exists outside form inventory | Move/export as `environment-variable.form.ts`; key naming and secret handling rules |

## Mweb Forms Needing Migration or Validation Fixes

| Priority | Form | Current location | Current state | Required fix |
| --- | --- | --- | --- | --- |
| P0 | Register | `mweb-app/src/forms/register-form/RegisterForm.tsx` and `validators/auth.ts` | Formik/Yup exists, names too permissive | Move schema/types to `register.form.ts`; enforce name, phone, DOB age, city/zone IDs |
| P0 | Google Signup Phone | `mweb-app/src/forms/google-signup-phone.form.tsx` | Formik/Yup exists | Align with shared phone/DOB/location rules and add tests |
| P0 | WhatsApp OTP Request/Verify | `mweb-app/src/pages/signup-whatsapp-page/*` | useFormik in page, schemas in auth validators | Move each to `whatsapp-otp-request.form.ts` and `whatsapp-otp-verify.form.ts`; real-time numeric validation |
| P0 | Account Edit | `mweb-app/src/pages/account-page/EditAccountDialog.tsx` | Inline Yup inside component | Extract `account-edit.form.ts`; tighten name/city/country/phone/whatsapp rules |
| P0 | Checkout | `mweb-app/src/pages/checkout-page/validation.ts` | Phone only min/max, not digits-only | Move to `checkout.form.ts`; validate phone digits, billing address, payment method enum |
| P0 | Register Venue | `mweb-app/src/pages/register-venue-page/validation.ts` and step components | Yup exists, weak owner phone/GSTIN/PAN/document URL | Split or combine into `register-venue.form.ts`; add step-level specs |
| P1 | Login | `mweb-app/src/forms/login.form.tsx` | Good Formik/Yup base | Keep file, add tests and email normalization |
| P1 | Support | `mweb-app/src/forms/support-form/SupportForm.tsx` | Formik/Yup exists, no explicit validateOnChange | Rename `schema.ts` to `support.form.ts`; validate category select helper/error state |
| P1 | Profile About Links | `mweb-app/src/pages/profile-page/ProfileAboutSection.tsx` | Inline Formik/Yup inside section | Extract `profile-about.form.ts`; allow empty row cleanup; URL tests |
| P1 | Pet Profile | `mweb-app/src/pages/profile-page/pet-profile-section/PetForm.tsx` | Formik/Yup exists, missing from doc | Move schema to `pet-profile.form.ts`; test required/length/media fields |
| P1 | Pod Idea Composer | `mweb-app/src/pages/pod-ideas-page/IdeaComposerDialog.tsx` | Controlled state and character limits only | Move to `pod-idea.form.ts`; Yup title/body constraints and submit gating |
| P1 | Signup Survey | `mweb-app/src/pages/signup-survey/queries.ts` | Schema exists in query helper | Move to `signup-survey.form.ts`; validate selected interests and optional text |
| P1 | Interview Booking Details | `mweb-app/src/pages/interview-booking-page/InterviewDetailsForm.tsx` | Needs audit | Move to `interview-booking.form.ts`; slot, notes, meeting details validation |
| P1 | Comment Input | `mweb-app/src/components/pod-comments-sheet/CommentInput.tsx` | Formik/Yup exists | Move helper schema to `comment.form.ts`; test trim/max/empty |
| P2 | Post Dialog | `mweb-app/src/pages/profile-page/PostDialog.tsx` and nested `post-dialog/PostDialog.tsx` | Needs audit | Move to `post.form.ts`; text/media visibility validation |
| P2 | Upload Dialog | `mweb-app/src/pages/profile-page/UploadDialog.tsx` | Needs audit | Move to `upload.form.ts`; file type/size/url validation |
| P2 | App Location Dialog | `mweb-app/src/components/app-header/LocationDialog.tsx` | Needs audit | Move to `location-select.form.ts`; city/zone required and options-bound validation |

## Migration Order

1. Fix GraphQL codegen paths and add `npm run graphql:sync`.
2. Add shared validation rules and shared Formik MUI field helpers in both apps.
3. Add Cypress component config and `src/**/*.form.spec.ts` spec pattern.
4. Migrate P0 forms first: auth, account, checkout, user, host, venue, notification, interview.
5. Migrate P1 admin content/catalog forms and mweb profile/community forms.
6. Migrate P2 settings/RBAC/finance/supporting dialogs.
7. Run `npm run graphql:sync`, `npm run build:admin`, `npm run build:app`, and form tests.

## Non-Breaking Refactor Rules

- Preserve current component props and exported component names during first migration.
- If a schema currently lives in `validators/auth.ts` or `validation.ts`, re-export it temporarily from the old file after moving it.
- Keep existing mutation names and variable shapes; only add `toMutationInput` mappers.
- Do not change backend resolver behavior in the same PR unless GraphQL schema validation requires it.
- Keep TSX files under 200 lines. If a form is large, split sections into sibling components and keep the `.form.ts` contract separate.
- Do not hardcode business data in the form file. Pull options from GraphQL, configs, constants, or generated enum types.

## Backend Sync Checklist

For every form migration, verify the matching server module:

- GraphQL input type exists and has required fields aligned with UI schema.
- Resolver/service still validates input with Yup or equivalent server-side validation.
- UI optional fields match backend nullable/optional fields.
- Enum values match generated GraphQL enum types.
- Server returns useful validation errors for API-level failures.
- `npm run graphql:sync` updates generated UI/server types without stale paths.

## Definition of Done Per Form

- `<form-name>.form.ts` exists next to the form UI.
- Yup schema covers required, type, min/max, format, and conditional validation.
- Formik uses `validateOnChange` and `validateOnBlur`.
- MUI fields show field-level error text during typing after interaction.
- Submit is blocked when invalid and mutation is never called with invalid values.
- GraphQL mutation input is typed and mapped through `toMutationInput`.
- `<form-name>.form.spec.ts` covers invalid and valid paths.
- Build passes for the owning app.
- GraphQL sync command passes after schema/operation changes.
