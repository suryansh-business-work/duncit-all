import { gql } from '@apollo/client';
import type { Mutation, MutationAiImproveRichTextArgs } from '@duncit/gql-types';

export const IMPROVE_RICH_TEXT = gql`
  mutation ImproveDuncitRichText($input: AiRichTextImproveInput!) {
    aiImproveRichText(input: $input)
  }
`;

export type ImproveRichTextData = Pick<Mutation, 'aiImproveRichText'>;
export type ImproveRichTextVariables = MutationAiImproveRichTextArgs;
