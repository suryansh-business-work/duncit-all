import type { AutomationChannel, AutomationOptions, NodeData } from '../../types';

/** What every step's settings component receives. */
export interface ConfigProps {
  nodeId: string;
  channel: AutomationChannel;
  config: NodeData;
  options: AutomationOptions;
  onChange: (config: NodeData) => void;
}
