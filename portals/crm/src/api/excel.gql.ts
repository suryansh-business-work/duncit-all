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

export function downloadBase64Xlsx(filename: string, base64: string): void {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.codePointAt(i) ?? 0;
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
