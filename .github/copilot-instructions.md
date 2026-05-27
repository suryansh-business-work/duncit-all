Follow these strict coding guidelines for the project:

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
https://duncit.com
https://server.duncit.com/
https://admin.duncit.com/
https://mweb.duncit.com/
https://partners.duncit.com
https://partners-app.duncit.com
https://ads.duncit.com/
https://crm.duncit.com/
https://track.duncit.com/
https://tech.duncit.com/

9. Any .tsx file should not exceed 200 lines. If a file grows beyond 200 lines, create a folder with the same component name and refactor it into multiple smaller components/modules inside that folder using an index-based structure. Ensure the refactor introduces no breaking changes and preserves all existing functionality, imports, exports, and behavior.

10. Before creating any form, first create a dedicated folder with the form name. Inside it, keep these 4 files: <form-name>.form.tsx for the form implementation using Formik and Yup with proper hints, validations, and error handling, <form-name>.form.cy.tsx for Cypress test cases covering validations and user flows, <form-name>.types.tsx for codegen-based shared/common types, and index.tsx to export all required components, types, and utilities from a single entry point. this should be follow in mWeb and Admin both. strictlly use MUI only no HTML Componentss for date and time use MUIX Core date and time 

11. For Date and time use Data FNS and make sure it should be sync based on setting in admin panel. For date and time input use MUIX Core date and time pickers. Always ensure that the date and time are displayed in the user's local timezone and format, which can be configured in the admin panel. Avoid hardcoding any date or time formats; instead, use dynamic formatting based on user settings.

12. No Alert box, Confirm box and Prompt box html/JS Code Use MUI Confirmation/ Alert Only

13. Use GraphQL and GraphQL Code Generator for all API interactions. Ensure that all queries and mutations are properly typed and that the generated code is used throughout the project for type safety and consistency.

14. After completing all changes, make sure to verify the build, check types, run lint checks, apply code formatting, and only then push the code to the repository. Ensure that all GitHub CI checks pass successfully and that the application is fully functional across all environments (https://duncit.com, https://server.duncit.com/, https://admin.duncit.com/, https://mweb.duncit.com/, https://partners.duncit.com, https://partners-app.duncit.com, https://ads.duncit.com/, https://crm.duncit.com/, https://track.duncit.com/, https://tech.duncit.com/).

15. Performance, Security, Accessbility, SEO, Best Practices, Code Quality, Scalability, and Maintainability should be the top priority while writing code. Always follow industry best practices and guidelines to ensure that the codebase remains robust, secure, and maintainable in the long run. Regularly review and refactor code to improve performance, enhance security, and ensure accessibility compliance.