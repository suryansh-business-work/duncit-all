import { gql } from '@apollo/client';

/**
 * One directory record's change history, through the shared table engine.
 *
 * ONE query for all five entities — the server stores every entity's trail in
 * one append-only collection and takes the type as an argument, so a console
 * added later reads its history without a query of its own (rule 34).
 */
export const ENTITY_CHANGE_LOGS_TABLE = gql`
  query EntityChangeLogsTable(
    $entity_type: EntityAuditType!
    $entity_id: ID!
    $query: TableQueryInput
  ) {
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

/** Every change across every record of one entity — the console-wide feed. */
export const ENTITY_CHANGE_FEED_TABLE = gql`
  query EntityChangeFeedTable($entity_type: EntityAuditType!, $query: TableQueryInput) {
    entityChangeFeedTable(entity_type: $entity_type, query: $query) {
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

/** The entities that carry a change log — the server's `EntityAuditType`. */
export type EntityAuditType = 'VENUE' | 'HOST' | 'CLUB' | 'CLUB_ADMIN' | 'REGION';

export type EntityChangeAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityChangeActorType = 'OWNER' | 'ADMIN' | 'SYSTEM';
export type EntityChangeSource = 'NATIVE' | 'MWEB' | 'ADMIN_PORTAL' | 'PORTAL' | 'SERVER';

export interface EntityChangeLogRow {
  id: string;
  entity_type: EntityAuditType;
  entity_id: string;
  entity_label: string;
  field: string;
  field_label: string;
  old_value: string;
  new_value: string;
  action: EntityChangeAction;
  actor_type: EntityChangeActorType;
  actor_user_id: string | null;
  actor_name: string;
  source: EntityChangeSource;
  created_at: string;
}
