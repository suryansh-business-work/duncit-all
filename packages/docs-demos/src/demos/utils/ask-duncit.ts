import {
  acceptTurn,
  addOptimisticQuestion,
  applyActionEvent,
  applyDelta,
  applyFinal,
  applyToolEvent,
  canDecide,
  emptyThread,
  pageContextFromPath,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface AskDuncitMock {
  question: string;
  /** The streamed answer, split into frames by "|". */
  frames: string;
  /** Set to propose a change mid-answer. */
  proposeTool: string;
  /** The status the proposal ends at. */
  actionStatus: string;
  path: string;
  blocked: boolean;
}

export const askDuncitDemos: PackageDemo[] = [
  defineDemo<AskDuncitMock>({
    id: 'ask-duncit',
    title: 'ask-duncit — one Ask Duncit turn, folded the way both apps fold it',
    note:
      'Edit frames to change how the answer streams; the final content is the frames joined. Set blocked and the answer is complete at once with INJECTION_BLOCKED and nothing streams. Name a proposeTool and a pending change appears on the answer; set actionStatus to EXECUTED and it updates in place (canDecide turns false). Change path to /club/yoga or /venues/v1 and the page context follows.',
    mock: {
      question: 'Follow the yoga pod for me',
      frames: 'Sure — |I found the pod. |Approve the change below.',
      proposeTool: 'Follow pod',
      actionStatus: 'PENDING',
      path: '/pod/6650abc',
      blocked: false,
    },
    compute: ({ question, frames, proposeTool, actionStatus, path, blocked }) => {
      let thread = addOptimisticQuestion(emptyThread(), 'tmp', question);
      thread = acceptTurn(thread, 'tmp', { conversation_id: 'c1', user_message_id: 'u1', message_id: 'a1', status: blocked ? 'BLOCKED' : 'STREAMING' });
      if (!blocked) {
        thread = applyToolEvent(thread, { message_id: 'a1', name: 'find_tools', status: 'RUNNING' });
        thread = applyToolEvent(thread, { message_id: 'a1', name: 'find_tools', status: 'OK' });
        for (const text of frames.split('|')) thread = applyDelta(thread, { message_id: 'a1', text });
      }
      const action = { id: 'x1', tool: 'pods_follow_pod', tool_title: proposeTool, risk: 'WRITE', args_preview: '{"pod_id":"6650abc"}', status: actionStatus, error_message: '', can_rollback: actionStatus === 'EXECUTED', expires_at: '2099-01-01T00:00:00.000Z' };
      if (proposeTool && !blocked) thread = applyActionEvent(thread, action);
      const answer = thread.messages.find((m) => m.id === 'a1');
      if (answer && !blocked) thread = applyFinal(thread, { ...answer, status: 'COMPLETE' });
      return {
        thread,
        canDecide: proposeTool && !blocked ? canDecide(action) : null,
        page: pageContextFromPath(path),
      };
    },
  }),
];
