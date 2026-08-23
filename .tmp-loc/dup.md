<!-- duncit-duplication-gate -->
### Duplicate code gate — jscpd

**Result: FAILED** — this branch adds duplicated code.

| Metric | Value |
| --- | --- |
| Duplicated lines | 10578 of 652496 |
| Duplication | 1.62% (ceiling 1.9%) |
| Clone pairs | 400 across 7655 files |

#### 3 workspace(s) gained duplicated lines

| Workspace | Baseline | Now | Δ |
| --- | ---: | ---: | ---: |
| `packages/host-pod-actions` | 70 | 165 | +95 |
| `packages/media-picker` | 245 | 302 | +57 |
| `portals/onboarding` | 1040 | 1078 | +38 |

#### Largest clones touching those workspaces

- **108 lines** — `packages/media-picker/src/media-list-field/MediaListRow.tsx:6-113` ↔ `portals/onboarding/src/components/media-list-field/MediaListRow.tsx:6-113`
- **79 lines** — `portals/marketing/src/components/MediaPickerField.tsx:1-79` ↔ `portals/onboarding/src/components/MediaPickerField.tsx:1-79`
- **75 lines** — `portals/admin/src/components/BankAccountVerificationSection.tsx:6-80` ↔ `portals/onboarding/src/components/BankAccountVerificationSection.tsx:6-80`
- **72 lines** — `portals/admin/src/forms/validation/bankAccount.ts:1-72` ↔ `portals/onboarding/src/forms/validation/bankAccount.ts:1-72`
- **65 lines** — `portals/onboarding/src/components/DateField.tsx:1-65` ↔ `portals/products/src/components/DateField.tsx:1-65`
- **62 lines** — `portals/marketing/src/components/MediaPickerField.tsx:79-140` ↔ `portals/onboarding/src/components/MediaPickerField.tsx:79-140`
- **59 lines** — `portals/admin/src/components/MediaPickerField.tsx:83-141` ↔ `portals/onboarding/src/components/MediaPickerField.tsx:79-137`
- **54 lines** — `portals/admin/src/pages/user-details-page/UserHealthSection/AdjustHealthDialog.tsx:103-156` ↔ `portals/onboarding/src/pages/user-details-page/UserHealthSection/AdjustHealthDialog.tsx:86-139`
- **53 lines** — `packages/media-picker/src/media-list-field/MediaListField.tsx:59-111` ↔ `portals/onboarding/src/components/media-list-field/MediaListField.tsx:54-105`
- **52 lines** — `packages/media-picker/src/media-list-field/MediaListRow.tsx:32-83` ↔ `portals/onboarding/src/components/media-list-field/MediaListRow.tsx:32-83`

<details><summary>Measured duplicated lines per workspace</summary>

```json
{
  "app/mobile-app": 2695,
  "app/mweb": 2957,
  "packages/ai-prompts": 15,
  "packages/app-settings": 17,
  "packages/category": 103,
  "packages/club-form": 276,
  "packages/communication": 600,
  "packages/forms": 12,
  "packages/host-pod-actions": 165,
  "packages/location": 104,
  "packages/media-picker": 302,
  "packages/pod-form": 390,
  "packages/pod-product-picker": 44,
  "portals/admin": 1045,
  "portals/ads-portal": 105,
  "portals/ai": 81,
  "portals/challenge-portal": 49,
  "portals/crm": 1231,
  "portals/developers": 49,
  "portals/employee": 74,
  "portals/finance": 334,
  "portals/hr": 76,
  "portals/legal": 49,
  "portals/marketing": 332,
  "portals/onboarding": 1078,
  "portals/partners-app": 848,
  "portals/products": 152,
  "portals/support": 188,
  "portals/tech": 482,
  "portals/website-app": 184,
  "server": 3724,
  "website/ads-website": 162,
  "website/earnwith-website": 158,
  "website/main-website": 127,
  "website/partners-website": 158
}
```

</details>

Move the shared logic into a `@duncit/*` package (CLAUDE.md rule 40 has the map of
which package owns what; `server/src` consolidates internally instead). If the code
genuinely moved rather than multiplied, re-run `pnpm dup:update` and commit the
baseline — a raised number is what review is meant to look at.
