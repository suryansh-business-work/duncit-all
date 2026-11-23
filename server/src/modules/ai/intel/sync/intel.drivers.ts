import type { IntelConnectorKind } from '../intel.constants';
import { githubDriver } from '../connectors/github/github.connector';
import { gmailDriver } from '../connectors/gmail/gmail.connector';
import type { ConnectorDriver } from '../connectors/intel.driver';
import { mcpDriver } from '../connectors/mcp/mcp.connector';
import { mongoDriver } from '../connectors/mongo/mongo.connector';
import { slackDriver } from '../connectors/slack/slack.connector';

/** The driver behind each connector kind. */
export const DRIVERS: Record<IntelConnectorKind, ConnectorDriver> = {
  MONGODB: mongoDriver,
  MCP: mcpDriver,
  SLACK: slackDriver,
  GMAIL: gmailDriver,
  GITHUB: githubDriver,
};
