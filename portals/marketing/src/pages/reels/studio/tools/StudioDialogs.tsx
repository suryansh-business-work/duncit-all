import type { ReelProject } from '../../types';
import type { ReelActions } from '../useReelActions';
import AnalyticsDrawer from './AnalyticsDrawer';
import HistoryDrawer from './HistoryDrawer';
import ValidateDialog from './ValidateDialog';
import VariantsDialog from './VariantsDialog';
import type { StudioTools } from './useStudioTools';

interface Props {
  tools: StudioTools;
  project: ReelProject;
  actions: ReelActions;
}

/**
 * The toolbar's four tools, mounted only while open: each reads or asks the
 * server for something on opening, and none of that should happen on a
 * visit that never opens it.
 */
export default function StudioDialogs({ tools, project, actions }: Readonly<Props>) {
  return (
    <>
      {tools.dialog === 'validate' && (
        <ValidateDialog open onClose={tools.close} projectId={project.id} lastChecks={project.checks} onResult={tools.setChecks} />
      )}
      {tools.dialog === 'variants' && <VariantsDialog open onClose={tools.close} project={project} onUse={tools.useVariant} />}
      {tools.dialog === 'history' && <HistoryDrawer open onClose={tools.close} messages={project.messages} onRestore={actions.restoreVersion} />}
      {tools.dialog === 'analytics' && <AnalyticsDrawer open onClose={tools.close} projectId={project.id} />}
    </>
  );
}
