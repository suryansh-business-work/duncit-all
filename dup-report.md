<!-- duncit-duplication-gate -->
### Duplicate code gate — jscpd

**Result: FAILED** — this branch adds duplicated code.

| Metric | Value |
| --- | --- |
| Duplicated lines | 10856 of 776236 |
| Duplication | 1.4% (ceiling 1.7%) |
| Clone pairs | 406 across 8412 files |

#### 2 workspace(s) gained duplicated lines

| Workspace | Baseline | Now | Δ |
| --- | ---: | ---: | ---: |
| `app/mobile-app` | 2567 | 2685 | +118 |
| `app/mweb` | 2750 | 2826 | +76 |

#### Largest clones touching those workspaces

- **76 lines** — `app/mweb/src/forms/components/country-codes.ts:1-76` ↔ `app/mobile-app/src/forms/components/country-codes.ts:1-76`
- **64 lines** — `app/mweb/src/components/DateField.tsx:1-64` ↔ `portals/partners-app/src/components/DateField.tsx:1-64`
- **62 lines** — `app/mweb/src/pages/home-page/PodCard.tsx:92-153` ↔ `packages/pod-form/src/preview/PodPreviewCard.tsx:63-97`
- **61 lines** — `app/mweb/src/forms/validation/rules.ts:7-67` ↔ `portals/partners-app/src/forms/validation/rules.ts:7-67`
- **60 lines** — `app/mweb/src/pages/pod-pending-page/podPending.ts:27-86` ↔ `app/mobile-app/src/utils/pod-pending.ts:29-89`
- **59 lines** — `app/mweb/src/utils/category-match.ts:22-80` ↔ `app/mobile-app/src/utils/category-match.ts:23-81`
- **50 lines** — `app/mweb/src/components/AttachmentList.tsx:40-89` ↔ `portals/support/src/components/AttachmentList.tsx:45-94`
- **49 lines** — `app/mweb/src/utils/geo.ts:1-49` ↔ `portals/admin/src/utils/geo.ts:1-49`
- **48 lines** — `app/mobile-app/src/components/pod-ideas/IdeaCommentRow.tsx:18-65` ↔ `app/mobile-app/src/components/profile/post-viewer/PostViewerBody.tsx:23-70`
- **47 lines** — `app/mweb/src/pages/host-manage-page/hostPodsFilters.ts:41-87` ↔ `app/mobile-app/src/utils/host-pods-filters.ts:41-87`

<details><summary>Measured duplicated lines per workspace</summary>

```json
{
  "app/mobile-app": 2685,
  "app/mweb": 2826,
  "packages/ai-prompts": 15,
  "packages/app-settings": 17,
  "packages/auto-pods": 32,
  "packages/category": 103,
  "packages/club-form": 292,
  "packages/communication": 600,
  "packages/forms": 12,
  "packages/host-pod-actions": 114,
  "packages/location": 104,
  "packages/media-picker": 215,
  "packages/pod-form": 405,
  "packages/pod-product-picker": 44,
  "portals/admin": 1172,
  "portals/ads-portal": 105,
  "portals/ai": 81,
  "portals/challenge-portal": 49,
  "portals/crm": 1731,
  "portals/developers": 49,
  "portals/employee": 74,
  "portals/finance": 380,
  "portals/hr": 76,
  "portals/legal": 49,
  "portals/marketing": 334,
  "portals/onboarding": 1055,
  "portals/partners-app": 697,
  "portals/products": 198,
  "portals/support": 194,
  "portals/tech": 445,
  "portals/website-app": 191,
  "server": 3697,
  "website/ads-website": 139,
  "website/earnwith-website": 135,
  "website/main-website": 104,
  "website/partners-website": 135
}
```

</details>

Move the shared logic into a `@duncit/*` package (CLAUDE.md rule 40 has the map of
which package owns what; `server/src` consolidates internally instead). If the code
genuinely moved rather than multiplied, re-run `pnpm dup:update` and commit the
baseline — a raised number is what review is meant to look at.
