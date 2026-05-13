# Duncit — All Forms Documentation

> Auto-extracted from `admin/` and `mweb-app/` source code.
> Validation library: **Yup** | Form library: **Formik**

---

## Table of Contents

### Admin Panel (`admin/`)
1. [Login Form](#1-admin-login-form)
2. [Create User Dialog](#2-create-user-dialog)
3. [User Profile Form (Edit)](#3-user-profile-form-edit)
4. [Contact Action Dialog (Call / Email)](#4-contact-action-dialog-call--email)
5. [Host Create Dialog (Admin)](#5-host-create-dialog-admin)
6. [Host Edit Dialog](#6-host-edit-dialog)
7. [Venue Edit Dialog](#7-venue-edit-dialog)
8. [Pod Form Dialog (Create / Edit)](#8-pod-form-dialog-create--edit)
9. [Club Form Dialog (Create / Edit)](#9-club-form-dialog-create--edit)
10. [Category Form Dialog](#10-category-form-dialog)
11. [Badge Form Dialog](#11-badge-form-dialog)
12. [FAQ Edit Dialog](#12-faq-edit-dialog)
13. [Location Form Dialog](#13-location-form-dialog)
14. [Notification Form Dialog](#14-notification-form-dialog)
15. [Slider Form Dialog](#15-slider-form-dialog)
16. [Pod Plan Form Dialog](#16-pod-plan-form-dialog)
17. [New Permission Dialog](#17-new-permission-dialog)
18. [Manage Interview Request Dialog](#18-manage-interview-request-dialog)
19. [Email Template — Create Form](#19-email-template--create-form)
20. [Email Template — Send Test Dialog](#20-email-template--send-test-dialog)
21. [Website Content Dialog](#21-website-content-dialog)
22. [Display Formats Settings](#22-display-formats-settings)

### Mweb App (`mweb-app/`)
23. [Login Form](#23-mweb-login-form)
24. [Register Form](#24-register-form)
25. [Google Signup Phone Form](#25-google-signup-phone-form)
26. [WhatsApp OTP — Request Form](#26-whatsapp-otp--request-form)
27. [WhatsApp OTP — Verify Form](#27-whatsapp-otp--verify-form)
28. [Support Form](#28-support-form)
29. [Register Venue — Details Step](#29-register-venue--details-step)
30. [Register Venue — Documents Step](#30-register-venue--documents-step)
31. [Register Venue — Owner Step](#31-register-venue--owner-step)
32. [Checkout Form](#32-checkout-form)
33. [Pod Idea Composer Dialog](#33-pod-idea-composer-dialog)

---

---

# ADMIN PANEL FORMS

---

## 1. Admin Login Form

**File:** `admin/src/forms/login.form.tsx`
**Validator:** `admin/src/validators/auth.ts` → `loginSchema`
**Used on:** Admin Login page

| Field | Type | Label | Required | Validation |
|-------|------|-------|----------|------------|
| `email` | `string` | Email | ✅ | Valid email format |
| `password` | `string` | Password | ✅ | Min 8 characters |

**Submit label:** `Sign in`
**Error handling:** Inline alert on API/validation error

---

## 2. Create User Dialog

**File:** `admin/src/pages/users-page/CreateUserDialog.tsx`
**Validator:** Custom inline logic (`validForm` flag)
**Used on:** Users page

| Field | Type | Label | Required | Validation / Notes |
|-------|------|-------|----------|--------------------|
| `first_name` | `string` | First name | ✅ | - |
| `last_name` | `string` | Last name | ✅ | - |
| `email` | `email` | Email | ❌ | Welcome email sent if provided |
| `phone_extension` | `string` | Phone extension | ✅ | Dropdown (PhoneExtensionField) |
| `phone_number` | `string` | Phone number | ✅ | - |
| `dob` | `date` | Date of birth | ✅ | Date picker |
| `password` | `password` | Temporary password | ✅ | Min 8 chars; generate button available |
| `roles` | `string[]` | Roles | ✅ | Multi-select; at least one required |
| `city` | `string` | City | ❌ | - |
| `zone` | `string` | Zone | ❌ | - |

---

## 3. User Profile Form (Edit)

**File:** `admin/src/pages/user-details-page/ProfileForm.tsx`
**Validator:** None (controlled form, saved on "Save Changes")
**Used on:** User Details page

| Field | Type | Label | Required | Notes |
|-------|------|-------|----------|-------|
| `first_name` | `string` | First name | ❌ | - |
| `last_name` | `string` | Last name | ❌ | - |
| `email` | `email` | Email | ❌ | - |
| `phone_extension` | `string` | Phone extension | ❌ | Dropdown |
| `phone_number` | `string` | Phone number | ❌ | - |
| `city` | `string` | City | ❌ | - |
| `zone` | `string` | Zone | ❌ | - |
| `assigned_city` | `string` | Assigned city (admin scope) | ❌ | - |
| `assigned_zones` | `string` | Assigned zones | ❌ | Comma-separated |
| `profile_photo` | `string` | Profile photo URL | ❌ | MediaPickerField |
| `bio` | `string` | Bio | ❌ | Multiline |
| `status` | `select` | Status | ❌ | `ACTIVE` / `INACTIVE` / `SUSPENDED` |

---

## 4. Contact Action Dialog (Call / Email)

**File:** `admin/src/pages/user-details-page/ContactActionDialog.tsx`
**Validator:** `contactActionValidation.ts` → `contactActionSchema` (Yup)
**Used on:** User Details page

| Field | Type | Label | Required | Notes |
|-------|------|-------|----------|-------|
| `target` | `string` | Phone / Email | ✅ (auto) | Auto-populated; disabled input |
| `subject` | `string` | Subject | ❌ | Email only |
| `status` | `select` | Status | ✅ | Call: `LOGGED/CONNECTED/MISSED/VOICEMAIL`; Email: `LOGGED/SENT/BOUNCED/REPLIED` |
| `duration` | `number` | Duration seconds | ❌ | Call only |
| `recording_url` | `string` | Recording URL | ❌ | Call only |
| `notes` | `string` | Notes | ❌ | Multiline |

**Actions:** Save Log / Open Dialer (call) / Open Email / Start Recorded Call (call)

---

## 5. Host Create Dialog (Admin)

**File:** `admin/src/components/AdminHostCreateDialog.tsx`
**Validator:** Inline required-field checks (no Yup schema)
**Used on:** Hosts page

### Step 1 — Personal
| Field | Type | Label | Required |
|-------|------|-------|----------|
| `target_user_id` | `autocomplete` | Link to existing user | ✅ |
| `full_name` | `string` | Full name | ✅ |
| `email` | `string` | Email | ✅ |
| `phone` | `string` | Phone | ✅ |
| `dob` | `date` | DOB | ❌ |

### Step 2 — Identity
| Field | Type | Label | Required |
|-------|------|-------|----------|
| `aadhar_number` | `string` | Aadhar number | ✅ |
| `pan_number` | `string` | PAN number | ✅ |
| `passport_photo_url` | `string` | Passport photo | ✅ | MediaPickerField |

### Step 3 — Verification
| Field | Type | Label | Required |
|-------|------|-------|----------|
| `police_verification_url` | `string` | Police verification | ✅ | MediaPickerField |
| `full_address` | `string` | Full address | ✅ |
| `tags` | `string` | Tags | ❌ | Comma-separated |

**Submit options:** Save as Draft / Submit for Review

---

## 6. Host Edit Dialog

**File:** `admin/src/pages/hosts-page/HostEditDialog.tsx`
**Validator:** Inline Yup schema (`schema`)
**Used on:** Hosts page

### Step 1 — Personal
| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `full_name` | `string().trim().required()` | Full name | ✅ |
| `email` | `string().email().required()` | Email | ✅ |
| `phone` | `string().trim().required()` | Phone | ✅ |
| `dob` | `string().default('')` | DOB | ❌ |

### Step 2 — Identity
| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `aadhar_number` | `string().trim().required()` | Aadhar number | ✅ |
| `pan_number` | `string().trim().required()` | PAN number | ✅ |
| `passport_photo_url` | `string().trim().required()` | Passport photo | ✅ |

### Step 3 — Verification
| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `police_verification_url` | `string().trim().required()` | Police verification | ✅ |
| `full_address` | `string().trim().required()` | Full address | ✅ |
| `tags` | `array(string)` | Tags | ❌ |
| `status` | `select` | Status | ✅ | Options from `STATUSES` |

---

## 7. Venue Edit Dialog

**File:** `admin/src/pages/venues-page/VenueEditDialog.tsx`
**Validator:** Inline Yup `schema`
**Used on:** Venues page

### Step 1 — Venue Details
| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `venue_name` | `string().trim().required()` | Venue name | ✅ |
| `venue_type` | `string().trim().required()` | Venue type | ✅ |
| `capacity` | `number().integer().min(1).required()` | Capacity | ✅ |
| `description` | `string` | Description | ❌ |
| `cover_image_url` | `string` | Cover image | ❌ |
| `address_line1` | `string().trim().required()` | Address line 1 | ✅ |
| `address_line2` | `string` | Address line 2 | ❌ |
| `location_id` | `string().trim().required()` | Location (city) | ✅ |
| `country_code` | `string().trim().required()` | Country | ✅ |
| `state` | `string().trim().required()` | State | ✅ |
| `city` | `string().trim().required()` | City | ✅ |
| `locality` | `string().trim().required()` | Locality | ✅ |
| `postal_code` | `string().trim().required()` | Postal code | ✅ |
| `tags` | `array` | Tags | ❌ |

### Step 2 — Documents
| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `documents` | `array().default([])` | Document uploads (type + URL) | ❌ |
| `gstin` | `string` | GSTIN | ❌ |
| `pan` | `string` | PAN | ❌ |

### Step 3 — Owner
| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `owner_name` | `string().trim().required()` | Owner name | ✅ |
| `owner_email` | `string().email().required()` | Owner email | ✅ |
| `owner_phone` | `string().trim().required()` | Owner phone | ✅ |
| `owner_dob` | `string().nullable()` | Owner DOB | ❌ |
| `owner_address` | `string().max(500)` | Owner address | ❌ |
| `status` | `select` | Status | ✅ | Options from `STATUSES` |

---

## 8. Pod Form Dialog (Create / Edit)

**Files:** `admin/src/pages/pods-page/PodFormDialog.tsx`, `pod-form/schema.ts`, various section files
**Validator:** `podFormSchema` (Yup)
**Used on:** Pods page

### Section: Basic Info
| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `pod_title` | `string().trim().min(3).max(120).required()` | Pod title | ✅ |
| `pod_hosts_id` | `array(string).min(1).required()` | Hosts (multi-select) | ✅ |
| `pod_hashtag_text` | `string().max(500)` | Hashtags | ❌ |

### Section: When & Where
| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `club_id` | `string().required()` | Club | ✅ |
| `venue_id` | `string().required()` | Venue | ✅ |
| `pod_date_time` | `string().required()` + future date test | Start date & time | ✅ |
| `pod_end_date_time` | `string().default('')` + after-start test | End date & time | ❌ |
| `location_id` | `string().default('')` | Location | ❌ |
| `zone_name` | `string().default('')` | Zone | ❌ |

### Section: About
| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `pod_description` | `string().trim().min(10).required()` | Description | ✅ |
| `pod_info` | `string().max(2000)` | Pod info / additional notes | ❌ |

### Section: Payment & Charges
| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `pod_type` | `string().required()` | Pod type (FREE / PAID etc.) | ✅ |
| `pod_occurrence` | `string().required()` | Occurrence (ONCE / RECURRING) | ✅ |
| `pod_amount` | `number().min(0).max(1999).required()` | Amount (₹) | ✅ |
| `no_of_spots` | `number().min(0).max(10000).required()` | No. of spots | ✅ |
| `payment_terms` | `string().max(4000)` | Payment terms | ❌ |
| `place_charges` | `array({ label, amount, note })` | Place charges | ❌ |
| `is_active` | `boolean` | Active toggle | ❌ | Edit mode only |

### Section: Offers & Perks
| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `what_this_pod_offers` | `array(string).max(20)` | What this pod offers (chips) | ❌ |
| `available_perks` | `array(string).max(20)` | Available perks (chips) | ❌ |

### Section: Media
| Field | Label | Notes |
|-------|-------|-------|
| `media_text` | Images & Videos (one URL per line) | `.mp4/.mov/.webm` → VIDEO, others → IMAGE |

### Section: Duncit Products
| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `products_enabled` | `boolean` | Enable Duncit products toggle | ❌ |
| `product_requests` | `array({ product_id, quantity })` | Product requests | Conditional — min 1 if products_enabled |

---

## 9. Club Form Dialog (Create / Edit)

**Files:** `admin/src/pages/clubs-page/ClubFormDialog.tsx`, `club-form/BasicClubSection.tsx`, `ClubMediaSection.tsx`, `ClubVenueLinksSection.tsx`
**Validator:** Minimal — `club_name` non-empty check
**Used on:** Clubs page

### Section 1: Basic Information
| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| `club_name` | Club name | ✅ | Slug auto-generated |
| `club_description` | Description | ❌ | Multiline |
| `super_category_id` | Super Category | ❌ | Select |
| `category_id` | Category (sub-category) | ❌ | Select |
| `is_active` | Active | ❌ | Toggle; edit mode only |

### Section 2: Media & Moments
| Field | Label | Notes |
|-------|-------|-------|
| `cover_image_url` | Cover image | MediaPickerField |
| `banner_image_url` | Banner image | MediaPickerField |
| `moments_media` | Moments (URLs) | MediaListField |
| `feature_text` | Feature text | - |
| `moments_text` | Moments text | - |

### Section 3: Venues & Community Links
| Field | Label | Notes |
|-------|-------|-------|
| `meetup_venues_id` | Linked venues | Multi-select |
| `community_link` | Community link | URL |
| `announcement_link` | Announcement link | URL |
| `group_link` | Group link | URL |

> AI Fill button available for: `club_name`, `club_description`, `feature_text`, `moments_text`, `community_link`, `announcement_link`, `group_link`

---

## 10. Category Form Dialog

**File:** `admin/src/pages/categories-page/CategoryFormDialog.tsx`
**Validator:** `name` non-empty check
**Used on:** Categories page (Super Category / Category / Sub-Category)

| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| `name` | Name | ✅ | - |
| `iconMode` | Icon mode | ✅ | Toggle: `MUI Icon` / `Image` |
| `icon` | Icon / Image | ❌ | IconPickerField or MediaPickerField |
| `description` | Description | ❌ | Multiline |
| `mediaText` | Images & Videos (one URL per line) | ❌ | MP4 → VIDEO, others → IMAGE |
| `sort_order` | Sort order | ❌ | Number |
| `is_active` | Status | ❌ | `Active` / `Inactive`; edit mode only |

---

## 11. Badge Form Dialog

**File:** `admin/src/pages/badges-page/BadgeFormDialog.tsx`
**Validator:** `title` non-empty check
**Used on:** Badges page

| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| `title` | Title | ✅ | - |
| `description` | Description | ❌ | Multiline |
| `image_url` | Badge image | ❌ | MediaPickerField; square PNG/SVG recommended |
| `condition_type` | Condition | ✅ | Select from `CONDITIONS` list |
| `threshold` | Threshold | ❌ | Number; disabled when `MANUAL` condition |
| `is_active` | Active (auto-evaluated) | ❌ | Toggle |

---

## 12. FAQ Edit Dialog

**File:** `admin/src/pages/faqs-page/FaqEditDialog.tsx`
**Validator:** `question` and `answer` non-empty check
**Used on:** FAQs page

| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| `super_category_id` | Super Category | ❌ | Select; empty = General FAQ |
| `question` | Question | ✅ | - |
| `answer` | Answer | ✅ | Multiline (min 4 rows) |
| `sort_order` | Sort order | ❌ | Number |
| `is_active` | Active | ❌ | Toggle |

---

## 13. Location Form Dialog

**File:** `admin/src/pages/locations-page/LocationFormDialog.tsx`
**Validator:** `location_name` non-empty check
**Used on:** Locations page

| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| `country` | Country | ✅ | From LocationHierarchyFields |
| `state` | State | ✅ | From LocationHierarchyFields |
| `location_name` | Location name / City | ✅ | From LocationHierarchyFields |
| `location_pincode` | Primary PIN code | ✅ | - |
| `is_active` | Active / Inactive | ❌ | Toggle; edit mode only |
| `location_image` | Location image URL | ✅ | MediaPickerField |
| `zones[].zone_name` | Locality / Area | ❌ | Repeatable rows |
| `zones[].zone_code` | Area code | ❌ | - |
| `zones[].pincode` | PIN code | ❌ | - |

---

## 14. Notification Form Dialog

**File:** `admin/src/pages/notifications-page/NotificationFormDialog.tsx`
**Validator:** `title` and `body` non-empty (UI-level)
**Used on:** Notifications page

| Field | Label | Required | Conditional |
|-------|-------|----------|-------------|
| `title` | Title | ✅ | - |
| `body` | Body | ✅ | Multiline |
| `image_url` | Image URL | ❌ | MediaPickerField |
| `link_url` | Link URL | ❌ | e.g. `/pods/abc` |
| `silent` | Silent (in-app only) | ❌ | Toggle |
| `scope` | Audience | ✅ | `ALL / LOCATION / ZONE / USER` |
| `location_id` | Location | Conditional | Shown when scope = `LOCATION` or `ZONE` |
| `zone_name` | Zone | Conditional | Shown when scope = `ZONE` |
| `target_user_ids` | Users | Conditional | Multi-select; shown when scope = `USER` |

---

## 15. Slider Form Dialog

**File:** `admin/src/pages/sliders-page/SliderFormDialog.tsx`
**Validator:** UI-level (busy flag)
**Used on:** Sliders page

| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| `title` | Title | ✅ | From SliderBasicFields |
| `description` | Description | ❌ | - |
| `media_url` | Media URL | ✅ | MediaPickerField |
| `media_type` | Media type | ✅ | `IMAGE` / `VIDEO` |
| `link_url` | Link URL | ❌ | - |
| `scope` | Scope | ✅ | From SliderScopeFields |
| `location_id` | Location | Conditional | - |
| `zone_name` | Zone | Conditional | - |
| `super_category_id` | Super Category | Conditional | - |
| `sort_order` | Sort order | ❌ | Lower shows first |
| `is_active` | Active | ❌ | Toggle; edit mode only |
| `starts_at` | Starts at | ❌ | DateTimeField |
| `ends_at` | Ends at | ❌ | DateTimeField; must be after `starts_at` |

> AI Fill button available for: `title`, `description`, `media_url`, `media_type`, `link_url`, `sort_order`

---

## 16. Pod Plan Form Dialog

**File:** `admin/src/pages/pod-plans/PodPlanFormDialog.tsx`
**Validator:** Inline Yup `schema` via `useFormik`

| Field | Yup Validation | Label | Required | Notes |
|-------|---------------|-------|----------|-------|
| `key` | `string().matches(/^[a-z0-9_-]+$/).required()` | Key | ✅ | Disabled on edit; e.g. `free`, `premium` |
| `name` | `string().min(1).max(80).required()` | Display name | ✅ | - |
| `description` | `string().max(500)` | Description | ❌ | Multiline |
| `image_url` | `string().url().nullable()` | Image URL | ❌ | - |
| `features` | `array(string).max(20)` | Features (one per line) | ❌ | Multiline textarea split by `\n` |
| `price_label` | `string().max(60)` | Price label | ❌ | - |
| `sort_order` | `number().integer().min(0).max(999).required()` | Sort order | ✅ | - |
| `is_coming_soon` | `boolean` | Coming soon | ❌ | Toggle |
| `is_active` | `boolean` | Active | ❌ | Toggle |

---

## 17. New Permission Dialog

**File:** `admin/src/pages/permissions-page/NewPermissionDialog.tsx`
**Validator:** `resourceKey` and `actionKey` non-empty (UI-level)
**Used on:** Permissions page

| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| `resource_key` | Resource | ✅ | Select from existing resources |
| `action_key` | Action | ✅ | Select from existing actions |
| `description` | Description | ❌ | Multiline |

---

## 18. Manage Interview Request Dialog

**File:** `admin/src/pages/interview-requests-page/ManageInterviewDialog.tsx`
**Validator:** UI-level
**Used on:** Interview Requests page

| Field | Label | Required | Conditional |
|-------|-------|----------|-------------|
| `newStatus` | Status | ✅ | `PENDING / SCHEDULED / APPROVED / REJECTED / CANCELLED` |
| `customStart` | Start | Conditional | DateTimeField; shown when status = `SCHEDULED` or `APPROVED` |
| `customEnd` | End | Conditional | DateTimeField; must be after start |
| `meetingLink` | Meeting link | ❌ | URL; e.g. Google Meet |
| `notes` | Admin notes | ❌ | Multiline |
| `pickedSlotIdx` | Preferred slot | ❌ | Click chip to auto-fill start/end |

---

## 19. Email Template — Create Form

**File:** `admin/src/pages/email-templates-page/CreateTemplateForm.tsx`
**Validator:** All three fields non-empty (UI-level)
**Used on:** Email Templates page

| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| `slug` | Slug | ✅ | Auto-lowercased, non-alphanumeric → `-` |
| `name` | Name | ✅ | - |
| `subject` | Subject | ✅ | Supports Handlebars e.g. `{{ app_name }}` |

---

## 20. Email Template — Send Test Dialog

**File:** `admin/src/pages/email-templates-page/SendTestDialog.tsx`
**Validator:** `testTo` email non-empty (UI-level)
**Used on:** Email Templates page

| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| `to` | To (email) | ✅ | Uses sample JSON from Variables tab |

---

## 21. Website Content Dialog

**File:** `admin/src/pages/website-content-page/WebsiteContentDialog.tsx`
**Validator:** `title` non-empty (UI-level)
**Used on:** Website Content page

| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| `type` | Page | ✅ | Select from `PAGE_TYPES` |
| `sort_order` | Sort order | ❌ | Number |
| `title` | Title | ✅ | - |
| `slug` | Slug | ❌ | Auto-generated from title if blank |
| `category` | Category / Team | ❌ | - |
| `published_at` | Published at | ❌ | `datetime-local` |
| `summary` | Summary | ❌ | Multiline |
| `body` | Body | ❌ | Multiline (min 5 rows) |
| `image_url` | Image | ❌ | MediaPickerField |
| `cta_label` | CTA label | ❌ | - |
| `cta_url` | CTA URL | ❌ | - |
| `is_published` | Published | ❌ | Toggle |

---

## 22. Display Formats Settings

**File:** `admin/src/pages/settings-page/DisplayFormatsSection.tsx`
**Validator:** `date-fns` format string validation (try/catch preview)
**Used on:** Settings page

| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| `date_format` | Date format | ✅ | Preset select or custom `date-fns` pattern |
| `time_format` | Time format | ✅ | Preset select or custom `date-fns` pattern |

**Presets — Date:** `dd MMM yyyy`, `dd/MM/yyyy`, `MM/dd/yyyy`, `yyyy-MM-dd`, `EEE, dd MMM yyyy`
**Presets — Time:** `hh:mm a`, `HH:mm`, `h:mm a`, `HH:mm:ss`

---

---

# MWEB APP FORMS

---

## 23. Mweb Login Form

**File:** `mweb-app/src/forms/login.form.tsx`
**Validator:** `mweb-app/src/validators/auth.ts` → `loginSchema`
**Used on:** Login page

| Field | Yup Validation | Label | Required | Notes |
|-------|---------------|-------|----------|-------|
| `email` | `string().email().required()` | Email | ✅ | Hint: "We'll send pod updates here" |
| `password` | `string().min(8).required()` | Password | ✅ | Show/hide toggle |

**Submit label:** `Login`

---

## 24. Register Form

**Files:** `mweb-app/src/forms/register-form/RegisterForm.tsx`, `mweb-app/src/validators/auth.ts` → `registerSchema`
**Used on:** Register page

| Field | Yup Validation | Label | Required | Notes |
|-------|---------------|-------|----------|-------|
| `first_name` | `string().min(1).max(60).required()` | First name | ✅ | - |
| `last_name` | `string().min(1).max(60).required()` | Last name | ✅ | - |
| `email` | `string().email().required()` | Email | ✅ | - |
| `phone_extension` | `string().matches(extRegex).required()` | Phone code | ✅ | `PhoneExtensionField` |
| `phone_number` | `string().matches(/^\d{6,15}$/).required()` | Phone number | ✅ | 6–15 digits |
| `password` | `string().min(8).required()` | Password | ✅ | - |
| `dob` | `date().max(today).required()` | Birth year | ✅ | Year-only `DatePicker` |
| `city` | `string().trim().required()` | City | ✅ | Autocomplete |
| `zone` | `string().trim().required()` | Zone | ✅ | Autocomplete, options depend on city |

---

## 25. Google Signup Phone Form

**File:** `mweb-app/src/forms/google-signup-phone.form.tsx`
**Validator:** `mweb-app/src/validators/auth.ts` → `googleSignupSchema`
**Used on:** Post-Google-sign-in modal

| Field | Yup Validation | Label | Required | Notes |
|-------|---------------|-------|----------|-------|
| `phone_extension` | `string().matches(extRegex).required()` | Phone code | ✅ | Default `+91` |
| `phone_number` | `string().matches(/^\d{6,15}$/).required()` | Phone | ✅ | - |
| `dob` | `date().max(today).required()` | Birth year | ✅ | Year-only picker |
| `city` | `string().trim().required()` | City | ✅ | Autocomplete |
| `zone` | `string().trim().required()` | Zone | ✅ | Depends on city |

---

## 26. WhatsApp OTP — Request Form

**File:** `mweb-app/src/pages/signup-whatsapp-page/RequestForm.tsx`
**Validator:** `mweb-app/src/validators/auth.ts` → `whatsAppOtpRequestSchema`
**Used on:** Signup WhatsApp page (step 1)

| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `phone_extension` | `string().matches(extRegex).required()` | Code | ✅ |
| `phone_number` | `string().matches(/^\d{6,15}$/).required()` | WhatsApp number | ✅ |

**Actions:** Send OTP / Skip

---

## 27. WhatsApp OTP — Verify Form

**File:** `mweb-app/src/pages/signup-whatsapp-page/VerifyForm.tsx`
**Validator:** `mweb-app/src/validators/auth.ts` → `whatsAppOtpVerifySchema`
**Used on:** Signup WhatsApp page (step 2)

| Field | Yup Validation | Label | Required | Notes |
|-------|---------------|-------|----------|-------|
| `otp` | `string().matches(/^[0-9]{4,8}$/).required()` | Enter OTP | ✅ | Numeric; max 8 digits |

**Actions:** Verify & continue / Change number / Skip for now

---

## 28. Support Form

**Files:** `mweb-app/src/forms/support-form/SupportForm.tsx`, `schema.ts`
**Validator:** `supportSchema` (Yup)
**Used on:** Support page

| Field | Yup Validation | Label | Required | Notes |
|-------|---------------|-------|----------|-------|
| `name` | `string().trim().min(2).required()` | Your name | ✅ | - |
| `email` | `string().trim().email().required()` | Email | ✅ | - |
| `category` | `string().oneOf([...]).required()` | Category | ✅ | `BUG / QUESTION / FEEDBACK / ACCOUNT / PAYMENT / OTHER` |
| `subject` | `string().trim().min(3).max(120).required()` | Subject | ✅ | - |
| `message` | `string().trim().min(10).max(2000).required()` | Describe issue | ✅ | Multiline (min 4 rows) |
| `attachments` | `array(string().url()).max(5)` | Attachments | ❌ | Up to 5 image URLs |

---

## 29. Register Venue — Details Step (Step 1)

**Files:** `mweb-app/src/pages/register-venue-page/DetailsStep.tsx`, `validation.ts` → `step1Schema`
**Used on:** Register Venue page (step 1 of 3)

| Field | Yup Validation | Label | Required | Notes |
|-------|---------------|-------|----------|-------|
| `venue_name` | `string().trim().required()` | Venue name | ✅ | - |
| `venue_type` | `string().trim().required()` | Type | ✅ | Select from `VENUE_TYPES` |
| `capacity` | `number().min(1).required()` | Capacity | ✅ | - |
| `description` | `string` | Description | ❌ | Multiline |
| `cover_image_url` | `string` | Cover image | ❌ | Upload button |
| `address_line1` | `string().trim().required()` | Address line 1 | ✅ | - |
| `address_line2` | `string` | Address line 2 | ❌ | - |
| `location_id` | `string().trim().required()` | City (from locations) | ✅ | VenueLocationFinder |
| `country_code` | `string().trim().required()` | Country | ✅ | Auto-filled |
| `state` | `string().trim().required()` | State | ✅ | Auto-filled |
| `city` | `string().trim().required()` | City | ✅ | Auto-filled |
| `locality` | `string().trim().required()` | Locality / area | ✅ | - |
| `postal_code` | `string().trim().matches(/^[0-9A-Za-z -]{3,12}$/).required()` | PIN code | ✅ | - |

---

## 30. Register Venue — Documents Step (Step 2)

**Files:** `mweb-app/src/pages/register-venue-page/DocumentsStep.tsx`, `validation.ts` → `step2Schema`
**Used on:** Register Venue page (step 2 of 3)

| Field | Yup Validation | Label | Required | Notes |
|-------|---------------|-------|----------|-------|
| `gstin` | `string().trim().max(30)` | GSTIN | ❌ | Optional |
| `pan` | `string().trim().max(20)` | PAN | ❌ | Optional |
| `documents` | `array({ type, url }).test('has-doc', ...)` | Documents | ✅ | At least 1 document required; type select + file upload per row; types from `DOC_TYPES` |

---

## 31. Register Venue — Owner Step (Step 3)

**Files:** `mweb-app/src/pages/register-venue-page/OwnerStep.tsx`, `validation.ts` → `step3Schema`
**Used on:** Register Venue page (step 3 of 3)

| Field | Yup Validation | Label | Required |
|-------|---------------|-------|----------|
| `owner_name` | `string().trim().required()` | Owner name | ✅ |
| `owner_email` | `string().trim().email().required()` | Owner email | ✅ |
| `owner_phone` | `string().trim().required()` | Owner phone | ✅ |
| `owner_dob` | `string().nullable()` | Owner DOB | ❌ |
| `owner_address` | `string().trim().max(500)` | Owner address | ❌ |

---

## 32. Checkout Form

**Files:** `mweb-app/src/pages/checkout-page/CheckoutPage.tsx`, `validation.ts` → `checkoutFormSchema`
**Validator:** `checkoutFormSchema` (Yup)
**Used on:** Checkout page

| Field | Yup Validation | Label | Required | Notes |
|-------|---------------|-------|----------|-------|
| `email` | `string().trim().email().required()` | Email | ✅ | Auto-filled from user profile |
| `phone` | `string().trim().min(6).max(32).required()` | Phone | ✅ | Auto-filled from user profile |
| `billing_address` | `string().trim().min(8).max(500).required()` | Billing address | ✅ | - |
| `method` | `string().trim().required()` | Payment method | ✅ | Default: `DUMMY_UPI` |
| `simulate_failure` | `boolean` | Simulate failure | ✅ | Dev/test toggle |

---

## 33. Pod Idea Composer Dialog

**File:** `mweb-app/src/pages/pod-ideas-page/IdeaComposerDialog.tsx`
**Validator:** UI-level (controlled state, no Yup)
**Used on:** Pod Ideas page

| Field | Label | Required | Constraints |
|-------|-------|----------|-------------|
| `title` | Title | ✅ | Max 160 chars; character counter shown |
| `description` | Description | ✅ | Max 2001 chars; multiline (4–10 rows) |

---

## Summary Table

| # | Form | App | Fields | Validation |
|---|------|-----|--------|------------|
| 1 | Admin Login | Admin | 2 | Yup |
| 2 | Create User | Admin | 10 | Inline |
| 3 | User Profile (Edit) | Admin | 12 | None |
| 4 | Contact Action (Call/Email) | Admin | 6 | Yup |
| 5 | Host Create | Admin | 10 | Inline |
| 6 | Host Edit (3 steps) | Admin | 11 | Yup |
| 7 | Venue Edit (3 steps) | Admin | 18 | Yup |
| 8 | Pod Form (multi-section) | Admin | ~20 | Yup |
| 9 | Club Form (3 sections) | Admin | ~12 | Inline |
| 10 | Category Form | Admin | 6 | Inline |
| 11 | Badge Form | Admin | 5 | Inline |
| 12 | FAQ Edit | Admin | 5 | Inline |
| 13 | Location Form | Admin | 8+ zones | Inline |
| 14 | Notification Form | Admin | 7 | Inline |
| 15 | Slider Form | Admin | 10 | Inline |
| 16 | Pod Plan Form | Admin | 9 | Yup |
| 17 | New Permission | Admin | 3 | Inline |
| 18 | Manage Interview | Admin | 6 | Inline |
| 19 | Email Template Create | Admin | 3 | Inline |
| 20 | Email Template Test | Admin | 1 | Inline |
| 21 | Website Content | Admin | 11 | Inline |
| 22 | Display Formats | Admin | 2 | date-fns |
| 23 | Login | Mweb | 2 | Yup |
| 24 | Register | Mweb | 9 | Yup |
| 25 | Google Signup Phone | Mweb | 5 | Yup |
| 26 | WhatsApp OTP Request | Mweb | 2 | Yup |
| 27 | WhatsApp OTP Verify | Mweb | 1 | Yup |
| 28 | Support | Mweb | 6 | Yup |
| 29 | Register Venue Step 1 | Mweb | 13 | Yup |
| 30 | Register Venue Step 2 | Mweb | 3 | Yup |
| 31 | Register Venue Step 3 | Mweb | 5 | Yup |
| 32 | Checkout | Mweb | 5 | Yup |
| 33 | Pod Idea Composer | Mweb | 2 | Inline |
