# Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

## Tech Stack:
mWeb & Portals: MUI (Material UI)
Native Apps: Tamagui
Website: Astro (Highest Priority)

## Forms & Validation:
React Hook Form + Zod for form handling and validation.

Tradeoff: These guidelines bias toward caution over speed. For trivial tasks, use judgment.

1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.
2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# Follow beloe as well these strict coding guidelines for the project

1. File Size Limit:
   - No file should exceed 200 lines of code for tsx file
   - If logic grows, split into smaller reusable modules/components.

2. Dynamic Data:
   - Do NOT hardcode static data.
   - All data must come from APIs, configs, environment variables, or dynamic sources.
   - Use constants only for reusable configuration, not business data.

3. Form Validation:
   - Use YUP for all form validations.
   - Ensure proper schema-based validation.
   - Cover:
     - Required fields
     - Type validation (string, number, email, etc.)
     - Min/Max constraints
     - Custom validation where needed

4. Code Quality:
   - Write clean, modular, and reusable code.
   - Use proper naming conventions.
   - Avoid duplication (DRY principle).

5. Error Handling:
   - Handle all API and validation errors properly.
   - Show meaningful error messages to users.

6. Scalability:
   - Keep components small and maintainable.
   - Follow separation of concerns.

7. Best Practices:
   - Use async/await for API calls.
   - Use environment variables for configs.
   - Maintain consistent folder structure.

8. Check linting, build, and formatting, then push the code. Ensure that all GitHub CI checks are green and that everything is up and running:
<https://duncit.com>
<https://server.duncit.com/>
<https://admin.duncit.com/>
<https://mweb.duncit.com/>
<https://partners.duncit.com/>
<https://partners-app.duncit.com/>
<https://ads.duncit.com/>
<https://crm.duncit.com/>
<https://finance.duncit.com/>
<https://tech.duncit.com/>
<https://support.duncit.com/>
<https://website.duncit.com/>
<https://legal.duncit.com/>
<https://ai.duncit.com/>
<https://products.duncit.com/>
<https://marketing.duncit.com/>

9. Any .tsx file should not exceed 200 lines. If a file grows beyond 200 lines, create a folder with the same component name and refactor it into multiple smaller components/modules inside that folder using an index-based structure. Ensure the refactor introduces no breaking changes and preserves all existing functionality, imports, exports, and behavior.

10. Before creating any form, first create a dedicated folder with the form name. Inside it, keep these 4 files: (form-name).form.tsx for the form implementation using React hook form + Zod with proper hints, validations, and error handling, (form-name).form.cy.tsx for Cypress test cases covering validations and user flows, (form-name).types.tsx for codegen-based shared/common types, and index.tsx to export all required components, types, and utilities from a single entry point. this should be follow in mWeb and Admin both. strictlly use MUI only no HTML Componentss for date and time use MUIX Core date and time. this is for Mobile app and mWeb and Portal migrate from Formik & Yup to React hook form + Zod

11. For Date and time use Data FNS and make sure it should be sync based on setting in admin panel. For date and time input use MUIX Core date and time pickers. Always ensure that the date and time are displayed in the user's local timezone and format, which can be configured in the admin panel. Avoid hardcoding any date or time formats; instead, use dynamic formatting based on user settings.

12. No Alert box, Confirm box and Prompt box html/JS Code Use MUI Confirmation/ Alert Only

13. Use GraphQL and GraphQL Code Generator for all API interactions. Ensure that all queries and mutations are properly typed and that the generated code is used throughout the project for type safety and consistency.

14. After completing all changes, make sure to verify the build, check types, run lint checks, apply code formatting, and only then push the code to the repository. Ensure that all GitHub CI checks pass successfully and that the application is fully functional across all environments (<https://duncit.com>, <https://server.duncit.com/>, <https://admin.duncit.com/>, <https://mweb.duncit.com/>, <https://partners.duncit.com/>, <https://partners-app.duncit.com/>, <https://ads.duncit.com/>, <https://crm.duncit.com/>, <https://finance.duncit.com/>, <https://tech.duncit.com/>, <https://support.duncit.com/>, <https://website.duncit.com/>, <https://legal.duncit.com/>, <https://ai.duncit.com/>, <https://products.duncit.com/>, <https://marketing.duncit.com/>).

15. Performance, Security, Accessbility, SEO, Best Practices, Code Quality, Scalability, and Maintainability should be the top priority while writing code. Always follow industry best practices and guidelines to ensure that the codebase remains robust, secure, and maintainable in the long run. Regularly review and refactor code to improve performance, enhance security, and ensure accessibility compliance.

16. Don't overengineer: Simple beats complex
17. No fallbacks: One correct path, no alternatives
18. Separation of concerns: Each function should have a single responsibility
19. Proper Error Handling and Logging: Always handle errors gracefully and log them appropriately for debugging and monitoring purposes.
20. Consistent Code Style: Follow a consistent code style and formatting guidelines to improve readability and maintainability across the codebase.
21. Regular Code Reviews: Conduct regular code reviews to ensure code quality, share knowledge, and maintain coding standards across the team.
22. Write Tests: Ensure that all new features and critical code paths are covered by unit tests, integration tests, and end-to-end tests to maintain code quality and prevent regressions.
23. Documentation: Document your code, especially complex logic and public APIs, to improve maintainability and help other developers understand the codebase quickly.
24. Use TypeScript: Leverage TypeScript for type safety and improved developer experience. Ensure that all code is properly typed and that type definitions are maintained and updated as needed.
25. All test-related files under the __tests__ directory and organize them into separate e2e and unit-tests folders. All existing tests should be moved into their respective folders accordingly.

26. Code-quality rules (SonarQube clean-code). Write code that does NOT trip these — they are enforced by SonarQube on every push.

26a. React / TSX —

- Mark component props read-only: type the props parameter as `Readonly<Props>` (or `({ a, b }: Readonly<{ a: string }>)` for inline types). (S6759)
- Never use an array index as a React `key`; use a stable unique id from the item. Always provide a `key` for elements rendered in an array/`.map`. (S6479, S6477)
- Do not define a component inside another component; hoist it to module scope and pass data via props. (S6478)
- Only use ARIA attributes valid for the element's role (e.g. `aria-selected` needs role `tab`/`option`, not `button`). (S6811)
- Remove unused PropTypes and unused imports. (S6767, S1128)

26b. Conditionals & expressions —

- No nested ternaries: extract the inner ternary into a named `const` or an `if/else` above the expression. (S3358)
- No negated condition with an `else`: write `if (x) { B } else { A }` instead of `if (!x) { A } else { B }`. (S7735)
- Prefer optional chaining `a?.b?.c` over `a && a.b && a.b.c` (only when operands are object-nullables, not 0/""/false). (S6582)
- Prefer nullish coalescing: `a ?? b` instead of `a != null ? a : b` or `a ? a : b`. (S6606, S6644)
- Add `{ }` braces around multi-line `if`/`for` bodies — never rely on a single unbraced statement. (S2681)
- A conditional whose branches return the same value is a bug — make the branches differ or remove the condition. (S3923)

26c. Functions & complexity —

- Keep Cognitive Complexity ≤ 15: extract cohesive blocks into well-named helpers and use early-return guard clauses. (S3776)
- Do not nest functions more than 4 levels deep; extract inner functions to a higher scope. (S2004)

26d. Strings, numbers, modules (Node/TS) —

- Import Node builtins with the `node:` protocol: `from 'node:crypto'`, `require('node:fs')`. (S7772)
- Use `Number.parseInt` / `Number.parseFloat`, not the bare globals. (S7773)
- Use `str.startsWith(x)` / `str.endsWith(x)` instead of `indexOf(x) === 0` / `slice`/`lastIndexOf` checks. (S6557)
- Use `String.raw` for strings full of backslashes; never nest template literals (hoist the inner template to a const). (S7780, S4624)
- Use `replaceAll` only when a global replace is intended (`replace('x', y)` replaces only the first match). (S7781)
- Pass `String` directly to `.map(String)` instead of `x => String(x)`. (S7770)
- Prefer `globalThis` over `window` for truly-global access (keep `window` only for DOM-only APIs). (S7764)
- Batch `Array#push`: `a.push(x, y)` instead of consecutive `a.push(x); a.push(y);`. (S7778)
- Use a hoisted `Set` + `.has()` instead of `array.includes()` for membership lookups on constant lists. (S7776)
- Do not stringify objects that fall back to `[object Object]` — stringify a field or `JSON.stringify`. (S6551)
- `arr.sort()` mutates: use `arr.toSorted()` when you only need a sorted copy in an expression. A `sort` used purely for in-place mutation inside an arrow must be a statement body (`(l) => { l.sort(); }`), not an expression body. (S4043)
- For a single (non-global) match use `re.exec(str)`, not `str.match(re)`. (S6594)
- Prefer `String#codePointAt()` over `charCodeAt()` (handle the `number | undefined` result, e.g. `?? 0`). Only swap when full code points are intended (binary `atob` bytes are 0–255, so it's safe). (S7758)
- Don't spread a useless empty object: `{ ...(obj || {}) }` → `{ ...obj }` (spreading `null`/`undefined`/primitives in an object literal is already a no-op). (S7744)
- In ESM modules / `.mjs` scripts, prefer top-level `await` over a `main().then().catch().finally()` chain — wrap in `try/catch/finally` to keep the same error handling. (S7785)

26e. Types & fire-and-forget —

- Do not leave a useless `void` operator: a fire-and-forget promise must use `promise().catch((e) => log(e))` (never silently drop errors); `void 0` → `undefined`. (S3735)
- Remove type assertions (`as X`, non-null `!`) that don't change the type. (S4325)
- Mark class members that are never reassigned as `readonly`. (S2933)
- Extract a repeated union into a `type X = A | B` alias. (S4323)

26f. Security (NEVER hard-code) —

- No hard-coded passwords / secrets / credentials in source — read them from environment variables / config (`process.env`). This includes test credentials. (S2068)

26g. Refactoring to cut Cognitive Complexity (S3776) — keep behavior AND coverage identical —

- Prefer extracting a cohesive JSX block into a __hoisted, module-scope sub-component__ (e.g. a card/button/list) or a long branch into a named helper with early-return guards. Never define the component inside the parent (S6478). Mark every extracted prop type `Readonly<…>` (S6759).
- A deeply-nested ternary chain (`a ? : b ? : c ? : d`) costs more than the same logic as a sub-component using `if`/early-returns — pull the leaf branches out, or move a single inline `?:` into a top-level `const` so it sits at nesting 0.
- For a flagged value used in a JSX prop (e.g. `onDownloadTicket={podId ? … : undefined}`), hoist it to a `const` above the `return` — that drops its nesting increment without changing behavior.
- DO NOT duplicate a shared conditional value (like `const ink = mine ? '$onPrimary' : '$color'`) into multiple conditionally-rendered children: in a 100%-coverage package (duncit-mobile-app, threshold 100/100/100/100) that creates a new branch that only executes in the child's render path, so a test that exercises the value on only one side leaves it uncovered. Compute it __once in the parent__ and pass it as a prop (extract the repeated union into a `type` alias, S4323).
- After any mobile-app refactor run `npm run typecheck`, `npm run lint` (zero-warning gate, `lint:fix` auto-formats prettier) AND `npm run test:coverage` — a green typecheck is not enough; the branch threshold catches coverage regressions from extracted components.

27.Most important point mWeb and Mobile App need to be absolute identical
28. Do Not create mjml File in Local inside tech portal there is the option of /email-templates Usi se sabhi maintain karana hai
29. Use MUI for mWeb & Portal components and for Native Web and Native App use Tamagui components
30. Is mWeb, Native App, Portal, Native web use React Hooks Form and Zod
31. No UTF Icons For Native Icons use @expo/vector-icons and mWeb & Portals me @mui/icons-material Icon ka use karo
