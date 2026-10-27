import { auditToolsTool } from './meta/audit.tool';
import { callToolTool } from './meta/call.tool';
import { describeToolTool, listToolsTool, searchToolsTool } from './meta/catalog.tools';
import { selfTestTool } from './meta/self-test.tool';
import { myUsageTool } from './meta/usage.tool';
import { whoamiTool } from './meta/whoami.tool';
import { podTimingAuditTool } from './pods/pod-timing.tool';
import type { CuratedTool } from './tool.types';

/** Every hand-written tool. The rest of the catalog is derived from the API (catalog/build.ts). */
export const CURATED_TOOLS: readonly CuratedTool[] = [
  whoamiTool,
  listToolsTool,
  searchToolsTool,
  describeToolTool,
  auditToolsTool,
  callToolTool,
  myUsageTool,
  selfTestTool,
  podTimingAuditTool,
];
