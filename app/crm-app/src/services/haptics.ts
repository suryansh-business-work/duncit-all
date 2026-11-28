import * as Haptics from 'expo-haptics';
import { fireAndForget, logs } from '@duncit/logs';

const SCOPE = 'crm-app/haptics';

/**
 * The app's three touches of haptic feedback. A failed buzz never matters to
 * the person, so each one is fire-and-forget (logged, never thrown).
 */
export const haptics = {
  /** A light tick: a tab, a chip, a quick action. */
  tap(): void {
    fireAndForget(Haptics.selectionAsync(), logs.mobileApp, SCOPE, 'tap');
  },
  /** Something was saved or sent. */
  success(): void {
    fireAndForget(
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      logs.mobileApp,
      SCOPE,
      'success',
    );
  },
  /** Something failed or was refused. */
  error(): void {
    fireAndForget(
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
      logs.mobileApp,
      SCOPE,
      'error',
    );
  },
  /** A long press opened a menu. */
  heavy(): void {
    fireAndForget(
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      logs.mobileApp,
      SCOPE,
      'heavy',
    );
  },
};
