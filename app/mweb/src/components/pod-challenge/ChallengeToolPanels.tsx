import type { ComponentType } from 'react';
import ChallengeBuzzerPanel from './ChallengeBuzzerPanel';
import ChallengeItemsPanel from './ChallengeItemsPanel';
import ChallengePickPanel from './ChallengePickPanel';
import ChallengePollPanel from './ChallengePollPanel';
import ChallengeQuizPanel from './ChallengeQuizPanel';
import ChallengeSubmissionPanel from './ChallengeSubmissionPanel';
import type { PodChallengeView } from './queries';
import { useChallengeToolActions, type ChallengeToolActions } from './useChallengeToolActions';

export interface PanelProps {
  challenge: Pick<PodChallengeView, 'id' | 'status' | 'competitors' | 'viewer'>;
  tool: PodChallengeView['tools'][number];
  actions: ChallengeToolActions;
  /** False on a TV / projector: everything is shown, nothing can be tapped. */
  interactive: boolean;
}

/** The panel for each way a tool is run (the server's input_kind); scored-by-hand tools have none. */
const PANELS: Readonly<Record<string, ComponentType<PanelProps>>> = {
  POLL: ChallengePollPanel,
  QUIZ: ChallengeQuizPanel,
  BUZZ: ChallengeBuzzerPanel,
  PICK: ChallengePickPanel,
  CHECK: ChallengeItemsPanel,
  CHECKPOINT: ChallengeItemsPanel,
  SUBMIT: ChallengeSubmissionPanel,
};

interface Props {
  challenge: PanelProps['challenge'] & Pick<PodChallengeView, 'tools'>;
  interactive: boolean;
  /** Show only the tools run these ways (all of them when omitted). */
  only?: readonly string[];
}

/** Every run-rather-than-scored tool of a challenge, in the template's order. */
export default function ChallengeToolPanels({ challenge, interactive, only }: Readonly<Props>) {
  const actions = useChallengeToolActions(challenge.id);
  return (
    <>
      {challenge.tools.map((tool) => {
        const Panel = only && !only.includes(tool.input_kind) ? undefined : PANELS[tool.input_kind];
        return Panel ? <Panel key={tool.instance_id} challenge={challenge} tool={tool} actions={actions} interactive={interactive} /> : null;
      })}
    </>
  );
}
