import { gql } from '@apollo/client';

/**
 * One brand's change history, through the shared table engine. The server keeps
 * every entity's trail in one append-only collection and takes the entity type
 * as an argument; this panel always asks for `BRAND`.
 */
export const BRAND_CHANGE_LOGS_TABLE = gql`
  query BrandChangeLogsTable($entity_type: EntityAuditType!, $entity_id: ID!, $query: TableQueryInput) {
    entityChangeLogsTable(entity_type: $entity_type, entity_id: $entity_id, query: $query) {
      total
      page
      page_size
      rows {
        id
        entity_type
        entity_id
        entity_label
        field
        field_label
        old_value
        new_value
        action
        actor_type
        actor_user_id
        actor_name
        source
        created_at
      }
    }
  }
`;

export type BrandChangeAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type BrandChangeActorType = 'OWNER' | 'ADMIN' | 'SYSTEM';
export type BrandChangeSource = 'NATIVE' | 'MWEB' | 'ADMIN_PORTAL' | 'PORTAL' | 'SERVER';

export interface BrandChangeLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  field: string;
  field_label: string;
  old_value: string;
  new_value: string;
  action: BrandChangeAction;
  actor_type: BrandChangeActorType;
  actor_user_id: string | null;
  actor_name: string;
  source: BrandChangeSource;
  created_at: string;
}
