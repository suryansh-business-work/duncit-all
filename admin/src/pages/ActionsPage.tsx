import { gql } from '@apollo/client';
import { KeyEntityCrudPage } from './rbac/KeyEntityCrudPage';

const ACTIONS = gql`
  query Actions {
    actions {
      id
      key
      name
      description
      is_system
    }
  }
`;
const CREATE = gql`
  mutation CreateAction($input: CreateActionInput!) {
    createAction(input: $input) {
      id
    }
  }
`;
const UPDATE = gql`
  mutation UpdateAction($action_id: ID!, $input: UpdateActionInput!) {
    updateAction(action_id: $action_id, input: $input) {
      id
    }
  }
`;
const DELETE = gql`
  mutation DeleteAction($action_id: ID!) {
    deleteAction(action_id: $action_id)
  }
`;

export default function ActionsPage() {
  return (
    <KeyEntityCrudPage
      title="Actions"
      subtitle="Verbs that can be performed on resources."
      listQuery={ACTIONS}
      listKey="actions"
      createMutation={CREATE}
      updateMutation={UPDATE}
      deleteMutation={DELETE}
      argName="action"
      keyHelperText="Lowercase, e.g. read, create, manage"
    />
  );
}
