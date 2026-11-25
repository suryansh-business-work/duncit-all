import { gql } from '@/generated/graphql';

/**
 * CRM › AI Call Prompts › Static Content — the portal page's own operations:
 * the table page (search, newest first), one prompt, add, edit, delete.
 */
export const CrmAppCallPromptsDocument = gql(`
  query CrmAppCallPrompts($query: TableQueryInput) {
    crmCallPromptsTable(query: $query) {
      total
      rows { id name description language is_active updated_at }
    }
  }
`);

export const CrmAppCallPromptDocument = gql(`
  query CrmAppCallPrompt($id: ID!) {
    crmCallPrompt(id: $id) { id name description context language is_active }
  }
`);

export const CrmAppCreateCallPromptDocument = gql(`
  mutation CrmAppCreateCallPrompt($input: CreateCrmCallPromptInput!) {
    createCrmCallPrompt(input: $input) { id }
  }
`);

export const CrmAppUpdateCallPromptDocument = gql(`
  mutation CrmAppUpdateCallPrompt($id: ID!, $input: UpdateCrmCallPromptInput!) {
    updateCrmCallPrompt(id: $id, input: $input) { id }
  }
`);

export const CrmAppDeleteCallPromptDocument = gql(`
  mutation CrmAppDeleteCallPrompt($id: ID!) {
    deleteCrmCallPrompt(id: $id)
  }
`);
