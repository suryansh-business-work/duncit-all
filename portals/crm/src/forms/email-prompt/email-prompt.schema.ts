/**
 * The CRM email AI prompt rules, shared with the Duncit CRM app through
 * @duncit/forms/schemas so both refuse the same prompt with the same sentence.
 */
export {
  EMAIL_PROMPT_MAX,
  emailPromptPlaceholders as placeholdersIn,
  makeEmailPromptSchema as emailPromptSchema,
  type EmailPromptValues as EmailPromptFormValues,
} from '@duncit/forms/schemas';
