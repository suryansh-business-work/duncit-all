import { gql } from '@apollo/client';
import type { CmsCodeProblem } from '@duncit/gql-types';

/** Everything wrong with a piece of SCSS, JavaScript or Astro — the same check a save runs. */
export const CMS_VALIDATE_CODE = gql`
  query CmsValidateCode($language: CmsCodeLanguage!, $source: String!) {
    cmsValidateCode(language: $language, source: $source) {
      line
      column
      message
      severity
    }
  }
`;

export interface CmsValidateCodeData {
  cmsValidateCode: CmsCodeProblem[];
}
