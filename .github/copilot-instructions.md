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