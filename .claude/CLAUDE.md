mWeb and Native apps should have absolutely consistent functionality, UI, and user experience, ensuring that all features, validations, navigation flows, and behaviours work identically across both platforms.

Duncit CRM Web Portal and Duncit CRM Mobile app should be identical in all feature jo kaam web se ho sakata hai wo kaam app se bhi ho jaaye 

## Backword Compatibility
Ensure complete backward compatibility across mWeb, Native Android, and iOS applications. Users may still be running older app versions even after new releases are deployed. Do not introduce breaking changes that could cause existing app versions to fail. For GraphQL, use the @deprecated directive for outdated fields instead of immediately removing or disabling them. Deprecated fields must remain fully functional and continue supporting older app versions while newer versions migrate to updated fields or APIs. Ensure backward compatibility across backend APIs, GraphQL schemas, response structures, and UI flows. No existing app version should encounter errors or functionality issues due to new releases.

## Very Inportant Level Instruction
1. Before writing or executing any code, continuously monitor the system’s CPU temperature, CPU utilization, RAM usage, and storage usage. If any of these resources reach a critically high level that could cause the system to hang, crash, shut down, or interrupt the workflow, temporarily pause all workflows and wait until the system resources return to safe and stable levels. Once everything is normalized, automatically resume the workflow from where it was paused. The primary goal is to prevent system overload, unexpected shutdowns, data loss, and workflow interruptions, There should be no manual typing continue continue after some time based on ram usages etc.

2. Whenever you push any code, create a Pull Request (PR) and ensure that all changes are pushed to the appropriate staging branch/environment. Make sure every PR is properly created and all CI/CD checks, GitHub Actions, automated tests, builds, linting, security checks, and other configured validations are completely green before considering the task complete. Continuously monitor the PR and its CI/CD actions until all checks pass successfully. If any check fails or an issue is detected, investigate the root cause, fix the issue, commit the changes to the same working branch, push them again, and monitor the updated CI/CD run. Repeat this fix → push → monitor cycle until every required check and action is green. Do not consider the development workflow complete while any required PR check, test, build, or CI/CD action is failing or pending.

3. For React mWeb, Portals, and React Native, every page/screen must have a proper Error Boundary—do not write or release code without it. Create a common reusable Duncit Error Boundary package with Retry and Report an Issue options. Errors should be safely logged with useful debugging details without exposing sensitive user data, and one page failure should never crash the entire application.

4. Make sure the SonarQube Quality Gate always passes. There should be zero Blocker, High, Medium, or Low actionable issues across Security, Reliability, and Maintainability before considering the work complete. Fix detected issues, push the changes, and recheck SonarQube until the Quality Gate is green. Never bypass, suppress, or disable a valid Sonar rule just to make the gate pass. If SonarQube access or analysis requires a token, ask for the required token instead of skipping the check. Coverage should always Greater than 85%

5. For all Unit, Integration, and E2E tests, never write false-positive, dummy, or tests designed only to increase coverage. Every test must validate real expected behavior with meaningful assertions, including success, failure, validation, boundary, and relevant edge cases. Maintain strong coverage according to the defined quality standards, ensure tests are deterministic and reliable, and consider testing complete only when all required tests and coverage checks pass successfully.

## Code-Specific Instructions

1. **Think Before Coding:** State assumptions, surface ambiguity and tradeoffs, ask when unclear, and suggest simpler approaches when appropriate.
2. **Search First, Code Second:** Inspect the entire relevant codebase before writing new code.
3. **Reuse First:** Reuse existing functions, utilities, hooks, components, services, helpers, types, modules, and common packages.
4. **Extend Before Creating:** Extend existing implementations before creating new files, abstractions, or parallel solutions.
5. **Avoid Duplication:** Never duplicate existing business logic or functionality; anything used in more than two places belongs in the appropriate `@duncit/*` package.
6. **Avoid Premature Abstraction:** Create abstractions only for clear, repeated, or genuinely shared responsibilities.
7. **Simplicity First:** Write the minimum code required; avoid speculative features, unnecessary configurability, and overengineering.
8. **Surgical Changes:** Change only what is necessary, preserve existing style and behavior, and avoid unrelated refactoring.
9. **Traceability:** Every changed line must directly support the requested task.
10. **Deep Analysis:** Thoroughly analyze related functionality before implementation and prevent regressions or bugs.
11. **Goal-Driven Execution:** Define clear success criteria and verify each implementation step.
12. **Multi-Step Tasks:** Use a brief plan where appropriate: Step → Verification.
13. **File Size:** No `.tsx` file may exceed 200 lines; split growing logic into smaller reusable modules/components.
14. **Dynamic Data:** Never hardcode business/static data; use APIs, configs, environment variables, or dynamic sources.
15. **Tech Stack:** mWeb & Portals → MUI; Native Apps → Tamagui; Website → Astro.
16. **Forms & Validation:** Use React Hook Form + Zod for all forms and schema-based validation.
17. **Form Structure:** For mWeb/Admin forms, use the required `.form.tsx`, `.form.cy.tsx`, `.types.tsx`, and `index.tsx` structure.
18. **Error Handling:** Handle API and validation errors gracefully with meaningful user-facing messages and appropriate logging.
19. **Separation of Concerns:** Keep components, functions, and modules small, focused, and single-purpose.
20. **Async/API Practices:** Use `async/await`, environment-based configuration, and consistent project structure.
21. **Accessibility:** Follow WCAG 2.2 AA by default, including keyboard navigation, visible focus, screen-reader support, accessible forms, dialogs, tables, errors, and dynamic content.
22. **Icons:** Use `@mui/icons-material` for mWeb/Portals and `@expo/vector-icons` for Native Apps; never use Unicode icons.
23. **Date & Time:** Use MUI X Core pickers with `date-fns` and admin-configured timezone/format settings; never hardcode date/time formats.
24. **Localization:** Never hardcode user-facing text. Use server-provided localization first and local fallback only when the server translation is unavailable.
25. **Fallback Icons:** Follow the project's enforced local fallback-icon system.
26. **GraphQL:** Use GraphQL + GraphQL Code Generator for all API interactions and use generated types.
27. **GraphQL Optimization:** Request only required fields, avoid unnecessary nesting and duplicate requests, reuse fragments and operations, prevent N+1 queries, use pagination/filtering, and verify resolver/database performance.
28. **Alerts & Dialogs:** Never use browser `alert`, `confirm`, or `prompt`; use MUI-based UI for mWeb/Portals and Tamagui-based UI for Native.
29. **mWeb & Mobile:** Keep business logic and behavior identical and shared where appropriate while keeping MUI and Tamagui UI separate.
30. **SonarQube:** Follow SonarQube clean-code standards; keep cognitive complexity ≤15 and avoid known flagged patterns. Overall coverage should be 85%+
31. **TypeScript:** Use strict, accurate types; avoid unnecessary assertions, `any`, redundant casts, and non-null assertions.
32. **Security:** Never hardcode secrets, credentials, passwords, tokens, or IP addresses.
33. **Performance:** Avoid unnecessary renders, API calls, N+1 queries, expensive computations, and unnecessary bundle growth.
34. **Caching:** Understand existing caching and invalidation behavior before introducing or modifying caching.
35. **Database Safety:** Review query performance, indexes, migrations, destructive operations, data integrity, and rollback strategy before database changes.
36. **Data Integrity:** Protect financial, transactional, payment, order, attendance, and critical data from partial, duplicate, or inconsistent writes.
37. **Concurrency:** Consider race conditions, duplicate requests, retries, parallel updates, and stale data.
38. **Idempotency:** Make payments, webhooks, notifications, migrations, and retryable operations idempotent where applicable.
39. **Authorization:** Enforce permissions server-side; never rely only on hiding UI elements.
40. **Auditability:** Use existing audit and logging mechanisms for Finance, Payments, Admin overrides, permissions, and other sensitive operations.
41. **Observability:** Use structured logging and monitoring where appropriate; never expose secrets or sensitive user data in logs.
42. **API Contracts:** When changing frontend/backend behavior, verify schemas, generated types, validation, and affected consumers together.
43. **Backward Compatibility:** Do not unnecessarily break APIs, GraphQL contracts, database schemas, imports, exports, or user flows.
44. **UI States:** Properly handle loading, success, error, empty, disabled, and populated states.
45. **Responsive UI:** Verify mWeb and Portal experiences across relevant viewport sizes.
46. **SEO:** For Astro/website changes, verify semantic HTML, metadata, canonical URLs, structured data, and crawlability where applicable.
47. **Dependencies:** Before adding a dependency, verify whether an existing package/dependency can solve the requirement.
48. **No Silent Failures:** Never silently swallow errors; provide appropriate user feedback and developer diagnostics.
49. **Environment Separation:** Never mix local, staging, and production configuration, credentials, or data.
50. **Rollback Awareness:** For production-impacting changes, understand the recovery and rollback path before implementation.
51. **Documentation:** Update package documentation and runnable demos whenever a shared package changes.
52. **Infrastructure:** Keep server infrastructure changes reproducible through Terraform and follow existing migration/runbook conventions.
53. **Email Templates:** Do not create local MJML files; maintain email templates through the Communications Portal.
54. **Tables:** Use `@duncit/table` for all Portal tables.
55. **Package Reuse:** Check relevant `@duncit/*` package documentation and existing exports before creating helpers, hooks, constants, schemas, regexes, or components.
56. **Shared Logic:** Share framework-free business logic between mWeb and Native through appropriate common packages while keeping platform-specific UI separate.
57. **Duncit Tabs:** Never render MUI `<Tabs>`/`<Tab>` directly in mWeb/Portals; use `DuncitTabs` from `@duncit/tabs` with URL-based selection.
58. **Critical Modules:** Apply extra scrutiny to Finance, Payments, Orders, Attendance, Authentication, Localization, and Admin functionality.
59. **Business Flow:** Understand the complete existing business and data flow before modifying sensitive functionality.
60. **Edge Cases:** Consider relevant null/undefined, empty, duplicate, timeout, retry, pagination, timezone, permission, network-failure, and stale-data scenarios.
61. **Commit Discipline:** Keep unrelated tasks in separate commits with clear, task-specific commit messages.
62. **Staging Only:** Push changes only to `staging`; do not create or push to any other branch.
64. **E-commerce vs Partner Brand:** `https://ecomm.duncit.com` and `https://partners-app.duncit.com/ecomm-brand` are separate products; never mix their logic, data, UI, or business rules.
65. **WhatsApp:** Always use the Communications Portal to create or manage WhatsApp templates and campaigns.
66. **Finance:** Work on Finance functionality with extremely deep analysis and research. Understand financial flows, business rules, calculations, data integrity, edge cases, dependencies, security, auditability, and backward compatibility before making changes.
67. **Attendance:** Use the existing attendance board, attendance service, OTP service, and established attendance rules; never create parallel attendance or OTP flows.
68. **Versioning:** Maintain the enforced single app version across `app/mobile-app/app.json`, `app/mobile-app/package.json`, and `app/mweb/package.json`.
69. **Fallback Assets:** Keep fallback icon manifests and local assets synchronized with the enforced fallback-icon system.
70. **Localization Seed:** When adding or changing localization entries, follow the existing bundle, server seed, shipped-key generation, and copy-revision workflow.
71. **Production Safety:** Never push directly to production branches or deploy production changes unless explicitly requested and permitted by the project's deployment workflow.
72. GraphQL Optimization — Reuse existing queries, mutations, fragments, and generated types; request only required fields, avoid duplicate requests and N+1 queries, use proper pagination/filtering, and verify resolver/database performance.
73. Staging Only — Changes must go through staging; never push directly to main/master, and do not create additional branches.
74. App Versioning — Keep the app version synchronized across app.json, app/mobile-app/package.json, and app/mweb/package.json, following the enforced version-bump/deployment flow.
75. No Local MJML — Never create or maintain local MJML email files; maintain email templates through the Communications/Tech Portal.
76. No Duplicate Shared Logic — Before creating any helper, hook, schema, utility, constant map, or component, check existing @duncit/* packages and package documentation first.
77. Sensitive Modules — Apply extra scrutiny to Finance, Payments, Orders, Attendance, Authentication, Localization, and Admin functionality, including authorization, concurrency, idempotency, auditability, and data integrity.
78. API Contract Consistency — When changing frontend/backend behavior, verify the GraphQL schema, generated types, validation, and all affected consumers together.
79. No Silent Failures — Never swallow errors silently; provide appropriate user-facing feedback and developer-facing diagnostics/logging.
80. Environment Separation — Never mix local, staging, and production configuration, credentials, or data.
81. Always follow the Design System—never hard-code colors, shadows, spacing, borders, typography, radius, or any other design value; always use the respective design tokens from the token files.
82. Use the Duncit Regex package for all form validations. Never hardcode regex patterns directly in application code. If a new regex is required, add and test it to the Duncit Regex package first, then use it across mWeb, Portals, and Native applications.
83. After every code push to staging, monitor the PR and GitHub Actions status every 10 minutes until all checks are green. If any check fails, immediately investigate the root cause, apply the necessary fix to the same branch, push the changes, and rerun only the specific failed job or check without restarting workflows or jobs that have already passed, wherever GitHub Actions supports selective reruns. Continue monitoring and resolving failures until all required PR checks pass, the staging pipeline is successful, and the code is ready for merging. Never ignore failed checks, bypass CI requirements, or merge code while any required check is failing.
84. Whenever any portal feature, API, workflow, schema, permission, configuration, or business logic is added, modified, or removed, automatically identify, synchronize, and update all related MCP servers, MCP tools, tool definitions, handlers, input/output schemas, integrations, documentation, and dependencies to ensure complete consistency between the portal and its MCP ecosystem. Every relevant MCP tool must always reflect the latest portal functionality without missing, outdated, or broken capabilities. Treat MCP synchronization as a mandatory part of every portal change, validate backward compatibility, run relevant tests, and ensure all affected MCP tools are fully updated and verified before considering the task complete.
85. **Env Registry Audit (before EVERY push):** `server/src/modules/platform/envEntry/env-registry.json` is the single source of truth for every environment value — the Tech portal's categories, fields, labels, hints, descriptions (why each value is used), validation and `usedIn` files load from it, and its `githubSecrets` section lists the only GitHub Actions secrets allowed to stay (each with `whyNotTechPortal`). Before every push run `node scripts/audit-env-registry.mjs`. If it reports drift, run `node scripts/audit-env-registry.mjs --write`, review the diff, write a real `description` + `validation` for any new field or secret, and commit the JSON with the change. Never add a value as a GitHub secret or a `VITE_*`/`--build-arg` when the server can resolve it from the Tech portal at runtime (`getRuntimeEnvValue` / `publicClientConfig`); add it to the registry instead. The husky pre-push hook runs the audit too, and CI runs it in Shared Gates.
86. **AI Cost Report (after EVERY push):** Right after a push to a PR branch run `node scripts/ai-cost-report.mjs`. It posts one comment on the PR's Conversation tab with, per commit of that push, the LLM, the editor, input and output tokens (cache read/write shown) and the estimated cost, measured from the Claude Code session transcripts. It skips commits an earlier comment already covered, so re-running is safe; use `--dry-run` to preview. Rates live in `scripts/lib/ai-pricing.json`: when a new model shows up as "unpriced", add its rate card there (and its test in `scripts/lib/ai-cost.test.mjs`), never guess a price.

## Project Specific
1. E-commerce (https://ecomm.duncit.com) and Partner Brand (https://partners-app.duncit.com/ecomm-brand) are separate things. Please keep this in mind and do not mix them up.
2. Shared Code: Reuse existing common modules/packages; do not duplicate logic. Anything used in more than two places belongs in the appropriate @duncit/* package.
3. Tables: Use @duncit/table for all Portal tables.
4. WhatsApp: Always use the Communications Portal to create or manage WhatsApp templates and campaigns. Do not create them through any other method.
5. Finance: Work on all Finance-related functionality with very deep analysis and research. Carefully understand existing financial flows, business rules, calculations, data integrity, edge cases, and dependencies before making any changes. Prioritize correctness, security, auditability, and backward compatibility over speed, and verify the complete flow thoroughly before pushing to staging.
6. Server-First Localization — Always use server-provided localization first. Use the local fallback bundle only when the requested key/translation is unavailable from the server.
7. mWeb vs Partner Brand separation — Keep E-commerce (ecomm.duncit.com) and Partner Brand (partners-app.duncit.com/ecomm-brand) completely separate; do not mix their flows, data, or implementations.mWeb vs Partner Brand separation — Keep E-commerce (ecomm.duncit.com) and Partner Brand (partners-app.duncit.com/ecomm-brand) completely separate; do not mix their flows, data, or implementations.
8. Package Documentation & Demos — Whenever a shared @duncit/* package changes, update its documentation and runnable demo accordingly.
9. Attendance / OTP Architecture — Attendance and phone OTP flows must use the existing centralized services and shared logic; do not create duplicate attendance or OTP implementations.
10. Duncit CRM App ↔ CRM Portal Parity — The Duncit CRM Android app (`app/crm-app`, internal employees) and the CRM portal (`portals/crm`) run on the SAME backend and must offer the same features, validations, permissions and wording. Whatever exists in the CRM portal must also exist in the CRM app: any CRM portal feature, API, schema, rule or copy that is added, changed or removed must be reflected in `app/crm-app` in the same change, using the same GraphQL operations, the same Zod rules (shared via `@duncit/forms/schemas` or another `@duncit/*` package) and the same localization keys (`crm.*`, `shell.*`, app-only copy in `crmApp.*`). The app follows the member app's coding standards (Expo, Tamagui, React Hook Form + Zod, graphql-request + codegen, per-screen error boundaries, server-first localization) but is a separate project: never import from or change `app/mobile-app` for CRM work. Its native phone features (dialer, caller ID, call log + recording sync, widget, home-screen dialer icon) live in `app/crm-app/modules/crm-telephony`. Its APK is built by `.github/workflows/crm-android-build.yml` on every push to staging/main, announced on Slack, and downloadable from the CRM portal's "Download CRM App" sidebar page.


## MCP Security, Validation & Authorization (Mandatory)

- Audit all existing MCPs across the Duncit ecosystem.
- MCPs must follow the exact same validations as UI forms and backend APIs. Reuse centralized validation schemas wherever possible.
- Never bypass required fields, formats, data types, dependencies, business rules, or workflow restrictions.
- Reject invalid or incomplete submissions with clear field-level errors. Request missing information; never fabricate values.
- Enforce server-side RBAC/ABAC for every MCP tool and API operation (read, create, update, delete).
- Verify authenticated user identity, permissions, ownership, assigned scope, club, region, and approval requirements.
- Apply deny-by-default and least-privilege principles. Never trust MCP prompts, client-supplied roles, or AI-generated authorization claims.
- Protect sensitive data and prevent cross-user access, privilege escalation, and unauthorized workflow execution.
- Implement input sanitization, strict schema validation, rate limiting, audit logs, secure error handling, and prompt-injection protection.
- Update all MCP tool schemas, descriptions, required parameters, and execution logic.
- Run positive, negative, authorization, and end-to-end tests across all MCPs, portals, roles, and workflows.
- Never weaken existing validations or permissions to make an MCP operation succeed.
- Maintain backward compatibility without compromising security.
- Report modified MCPs, vulnerabilities fixed, test results, and unresolved issues.

**Non-negotiable:** No MCP operation may execute unless validation, authentication, authorization, scope checks, and required business approvals succeed server-side.
