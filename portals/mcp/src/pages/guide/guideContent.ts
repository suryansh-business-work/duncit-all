/**
 * The Guide's reference lists. The names are the protocol's own identifiers
 * (server: mcp.constants META_*, server/prompts.ts MCP_PROMPTS) and are shown as
 * code; what each one means is copy, in the `mcp.guide` namespace.
 */

export interface GuideTerm {
  name: string;
  descriptionKey: string;
}

/** The parameters every tool takes on top of its own. */
export const META_PARAMS: readonly GuideTerm[] = [
  { name: 'mcp_reason', descriptionKey: 'mcp.guide.metaReason' },
  { name: 'mcp_guard', descriptionKey: 'mcp.guide.metaGuard' },
  { name: 'mcp_confirm', descriptionKey: 'mcp.guide.metaConfirm' },
];

/** The ready-made prompts an AI app lists as commands. */
export const PROMPTS: readonly GuideTerm[] = [
  { name: 'audit_tools', descriptionKey: 'mcp.guide.promptAuditTools' },
  { name: 'list_all_tools', descriptionKey: 'mcp.guide.promptListAllTools' },
  { name: 'audit_pod_timings', descriptionKey: 'mcp.guide.promptAuditPodTimings' },
  { name: 'create_pod', descriptionKey: 'mcp.guide.promptCreatePod' },
  { name: 'join_free_pod', descriptionKey: 'mcp.guide.promptJoinFreePod' },
  { name: 'my_activity', descriptionKey: 'mcp.guide.promptMyActivity' },
  { name: 'run_self_test', descriptionKey: 'mcp.guide.promptRunSelfTest' },
  { name: 'find_tool', descriptionKey: 'mcp.guide.promptFindTool' },
];

/** Things to ask an AI app once it is connected. */
export const ASK_KEYS: readonly string[] = [
  'mcp.guide.askAuditTools',
  'mcp.guide.askListTools',
  'mcp.guide.askCreatePod',
  'mcp.guide.askPodTimings',
  'mcp.guide.askSelfTest',
];

/** Why connecting an AI app is safe. */
export const SAFETY_KEYS: readonly string[] = [
  'mcp.guide.safetyApprove',
  'mcp.guide.safetyRevoke',
  'mcp.guide.safetyRecord',
  'mcp.guide.safetyInjection',
];
