import { useCallback } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import {
  MANUAL_TEST_BOARD,
  MOVE_MANUAL_CASE,
  type BoardData,
  type BoardVariables,
  type MoveData,
  type MoveVariables,
} from '../shared/board.queries';
import { isConflict, manualErrorText } from '../shared/errors';
import type { ManualCard } from '../shared/types';
import { applyMove } from './boardCache';
import type { MovePlan } from './dndItems';

const WHERE = { page: '/manual/board', component: 'useMoveCase' };

/**
 * Move a card: the board changes at once (written straight into Apollo's
 * cache), the server is told, and on a refusal the board is put back exactly
 * as it was — then reloaded when the refusal was "someone changed it first".
 */
export function useMoveCase(variables: BoardVariables, reload: () => void) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [move] = useMutation<MoveData, MoveVariables>(MOVE_MANUAL_CASE);

  return useCallback(
    async (plan: MovePlan, card: ManualCard) => {
      const snapshot = client.readQuery<BoardData, BoardVariables>({ query: MANUAL_TEST_BOARD, variables });
      if (snapshot) {
        client.writeQuery<BoardData, BoardVariables>({
          query: MANUAL_TEST_BOARD,
          variables,
          data: applyMove(snapshot, plan),
        });
      }
      try {
        await move({
          variables: {
            id: plan.cardId,
            column_id: plan.toColumnId,
            after_id: plan.afterId,
            before_id: plan.beforeId,
            expected_updated_at: card.updated_at ?? null,
          },
        });
      } catch (err) {
        if (snapshot) client.writeQuery<BoardData, BoardVariables>({ query: MANUAL_TEST_BOARD, variables, data: snapshot });
        notifyError(manualErrorText(t, err, t('testsManual.board.moveFailed', { vars: { key: card.key } }), WHERE));
        if (isConflict(err)) reload();
      }
    },
    [client, move, reload, t, variables]
  );
}
