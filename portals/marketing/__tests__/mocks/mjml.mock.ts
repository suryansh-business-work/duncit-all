import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';

/**
 * `MjmlAiButton` defines its mutation inline (not exported), so this mirrors the
 * same document verbatim — `MockedProvider` matches on the printed query. The
 * `aiCreateOrUpdateMjml` field returns a `String` scalar, so the response needs
 * no `__typename`.
 */
export const AI_MJML = gql`
  mutation AiCreateOrUpdateMjml($input: AiMjmlTemplateInput!) {
    aiCreateOrUpdateMjml(input: $input)
  }
`;

export const aiMjmlMock = (
  over: { mjml?: string | null; throwMessage?: string; pending?: boolean } = {},
): MockedResponse => {
  if (over.throwMessage !== undefined) {
    return {
      request: { query: AI_MJML },
      variableMatcher: () => true,
      result: { errors: [{ message: over.throwMessage }] },
      maxUsageCount: 20,
    };
  }
  // Distinguish an explicit `null` (AI returned nothing) from an omitted value.
  const mjml = over.mjml === undefined ? '<mjml><mj-body/></mjml>' : over.mjml;
  return {
    request: { query: AI_MJML },
    variableMatcher: () => true,
    result: { data: { aiCreateOrUpdateMjml: mjml } },
    ...(over.pending ? { delay: Infinity } : {}),
    maxUsageCount: 20,
  };
};
