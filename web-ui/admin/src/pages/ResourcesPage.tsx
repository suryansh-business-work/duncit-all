import { gql } from '@apollo/client';
import { KeyEntityCrudPage } from './rbac/KeyEntityCrudPage';

const RESOURCES = gql`
  query Resources {
    resources {
      id
      key
      name
      description
      is_system
    }
  }
`;
const CREATE = gql`
  mutation CreateResource($input: CreateResourceInput!) {
    createResource(input: $input) {
      id
    }
  }
`;
const UPDATE = gql`
  mutation UpdateResource($resource_id: ID!, $input: UpdateResourceInput!) {
    updateResource(resource_id: $resource_id, input: $input) {
      id
    }
  }
`;
const DELETE = gql`
  mutation DeleteResource($resource_id: ID!) {
    deleteResource(resource_id: $resource_id)
  }
`;

export default function ResourcesPage() {
  return (
    <KeyEntityCrudPage
      title="Resources"
      subtitle="Things in your system that can have actions performed on them."
      listQuery={RESOURCES}
      listKey="resources"
      createMutation={CREATE}
      updateMutation={UPDATE}
      deleteMutation={DELETE}
      argName="resource"
      keyHelperText="Lowercase, e.g. user, venue, pod"
    />
  );
}
