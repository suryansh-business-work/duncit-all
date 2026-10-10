import type { ComponentType } from 'react';

import { NoticeCard } from '@/components/attendance/NoticeCard';
import { useChallengeToolActions } from '@/hooks/useChallengeToolActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';

import { BuzzerPanel, PickPanel } from './BuzzerPanel';
import { ItemsPanel } from './ItemsPanel';
import { PollPanel } from './PollPanel';
import { QuizPanel } from './QuizPanel';
import { SubmissionPanel } from './SubmissionPanel';
import type { PanelProps } from './ToolCard';

/** The panel for each way a tool is run (the server's input_kind); scored-by-hand tools have none. */
const PANELS: Readonly<Record<string, ComponentType<PanelProps>>> = {
  POLL: PollPanel,
  QUIZ: QuizPanel,
  BUZZ: BuzzerPanel,
  PICK: PickPanel,
  CHECK: ItemsPanel,
  CHECKPOINT: ItemsPanel,
  SUBMIT: SubmissionPanel,
};

interface Props {
  challenge: PodChallengeView;
  onChanged: (next: PodChallengeView) => void;
  /** Show only the tools run these ways (all of them when omitted). */
  only?: readonly string[];
}

/**
 * Every run-rather-than-scored tool of a challenge, in the template's order —
 * the Tamagui twin of mWeb's ChallengeToolPanels (rule 27). The submission
 * panel shows a failure in its own card; for the others it is shown once here.
 */
export function ChallengeToolPanels({ challenge, onChanged, only }: Readonly<Props>) {
  const actions = useChallengeToolActions(challenge.id, onChanged);
  const shown = challenge.tools.flatMap((tool) => {
    const Panel = only && !only.includes(tool.input_kind) ? undefined : PANELS[tool.input_kind];
    return Panel ? [{ tool, Panel }] : [];
  });
  const ownsError = shown.some(({ tool }) => tool.input_kind === 'SUBMIT');
  return (
    <>
      {actions.error && !ownsError ? <NoticeCard tone="danger" title={actions.error} /> : null}
      {shown.map(({ tool, Panel }) => (
        <Panel key={tool.instance_id} challenge={challenge} tool={tool} actions={actions} />
      ))}
    </>
  );
}
