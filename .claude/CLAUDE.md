# Follow these strict coding guidelines for the project

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
- `arr.sort()` mutates: use `arr.toSorted()` when you only need a sorted copy in an expression. (S4043)

26e. Types & fire-and-forget —

- Do not leave a useless `void` operator: a fire-and-forget promise must use `promise().catch((e) => log(e))` (never silently drop errors); `void 0` → `undefined`. (S3735)
- Remove type assertions (`as X`, non-null `!`) that don't change the type. (S4325)
- Mark class members that are never reassigned as `readonly`. (S2933)
- Extract a repeated union into a `type X = A | B` alias. (S4323)

26f. Security (NEVER hard-code) —

- No hard-coded passwords / secrets / credentials in source — read them from environment variables / config (`process.env`). This includes test credentials. (S2068)
