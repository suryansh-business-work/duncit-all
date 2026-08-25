import { gql } from '@apollo/client';

/**
 * Written out in full in both documents rather than shared through a `${…}`
 * interpolation: the repo's schema gate skips any document it cannot resolve
 * statically, so an interpolated selection ships unvalidated.
 */
export const SHELL_WORKSPACE_STATE = gql`
  query ShellWorkspaceState {
    shellWorkspaceState {
      agent_edge
      agent_offset
      clock_zone
      clock_seconds
      minimised
    }
  }
`;

export const SAVE_SHELL_WORKSPACE_STATE = gql`
  mutation SaveShellWorkspaceState($input: ShellWorkspaceStateInput!) {
    saveShellWorkspaceState(input: $input) {
      agent_edge
      agent_offset
      clock_zone
      clock_seconds
      minimised
    }
  }
`;

/** The server's shape — snake_case, where the client says camelCase. */
export interface ShellWorkspaceStateDto {
  agent_edge: string;
  agent_offset: number;
  clock_zone: string;
  clock_seconds: boolean;
  minimised: string[];
}
