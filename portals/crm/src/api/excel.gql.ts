import { gql } from '@apollo/client';

export const CRM_EXCEL_TEMPLATE = gql`
  query CrmExcelTemplate($entity: CrmAiEntity!) {
    crmExcelTemplate(entity: $entity) {
      filename
      content_base64
    }
  }
`;

export const CRM_EXCEL_EXPORT = gql`
  query CrmExcelExport($entity: CrmAiEntity!) {
    crmExcelExport(entity: $entity) {
      filename
      content_base64
    }
  }
`;
