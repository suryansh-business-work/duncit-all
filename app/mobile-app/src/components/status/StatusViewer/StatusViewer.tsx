import { Modal } from 'react-native';

import { ModalSafeArea } from '@/components/ModalSafeArea';
import { XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { StatusViewerFooter } from '@/components/status/StatusViewerFooter';
import { ContentActionsMenu } from '@/components/content-report/ContentActionsMenu';
import { useTranslation } from '@/hooks/useTranslation';
import { statusRemainingLabel } from '@/utils/date-format';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { StatusProgressBars } from './StatusProgressBars';
import {
  StatusHeaderText,
  StatusMedia,
  StatusMuteButton,
  StatusRoundButton,
} from './StatusViewerParts';
import type { StatusViewerProps } from './types';
import { useStatusViewerState } from './useStatusViewerState';

/** Full-screen story viewer — multi-slide, auto-advancing (15s per image, video
 * to its end), with tap zones for manual prev/next and a close button. */
export function StatusViewer({
  status,
  onClose,
  onNext,
  onPrev,
  onOpenTarget,
  onDelete,
  onReport,
  onViewers,
  onToggleLike,
  onSlideSeen,
  onOpenLink,
  startIndex = 0,
  authorUserId,
  onOpenAuthor,
}: Readonly<StatusViewerProps>) {
  const { t } = useTranslation();
  const authorId = authorUserId ?? (status?.target?.kind === 'user' ? status.target.id : undefined);
  const openAuthor =
    authorId && onOpenAuthor
      ? () => {
          onClose();
          onOpenAuthor(authorId);
        }
      : undefined;
  const s = useStatusViewerState({
    status,
    onClose,
    onNext,
    onPrev,
    onSlideSeen,
    onToggleLike,
    startIndex,
  });
  const { current, isVideo, advanceRef } = s;
  // A rail that offers deletion at all passes `onDelete`; a rail whose slides
  // differ (the club page, where an admin may delete some and not others) also
  // marks each slide. Rails of the viewer's OWN stories mark nothing and every
  // slide stays deletable, which is what they meant.
  const canDeleteSlide = !!onDelete && (current?.canDelete ?? true);
  // The kebab exists for whichever action is available on THIS slide — a club
  // member gets Report alone, a club admin gets both.
  const hasMenu = canDeleteSlide || !!onReport;
  // Countdown until the status is auto-removed (recomputed per slide change).
  const remaining = statusRemainingLabel(current?.expiresAt);
  // Duncit's own pinned group, whose parts carry the official test ids.
  const official = status?.official === true;

  return (
    <Modal visible={!!status} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack testID="status-viewer" flex={1} backgroundColor="rgba(0,0,0,0.94)">
          <ModalSafeArea edges={['top', 'bottom']} style={{ flex: 1 }}>
            <StatusProgressBars slides={s.slides} index={s.index} progress={s.progress} />
            <XStack alignItems="center" justifyContent="space-between" padding={16}>
              <StatusHeaderText
                name={status?.name ?? ''}
                subLabel={status?.subLabel}
                remaining={remaining}
                onPress={openAuthor}
              />
              <StatusMuteButton
                visible={isVideo}
                muted={s.muted}
                onToggle={() => s.setMuted((value) => !value)}
              />
              {hasMenu && current ? (
                <StatusRoundButton
                  testID="status-viewer-kebab"
                  label={t('contentReport.menuLabel')}
                  icon="more-vert"
                  onPress={() => s.setMenuOpen((open) => !open)}
                  spaced
                />
              ) : null}
              <StatusRoundButton
                testID="status-viewer-close"
                label={t('mweb.common.closeStatus')}
                icon="close"
                onPress={onClose}
              />
            </XStack>
            {hasMenu && s.menuOpen && current ? (
              <ContentActionsMenu
                kind="STORY"
                canDelete={canDeleteSlide}
                canReport={!!onReport}
                onDelete={() => {
                  s.setMenuOpen(false);
                  onDelete?.(current.id);
                }}
                onReport={() => {
                  s.setMenuOpen(false);
                  onReport?.(current.id);
                }}
              />
            ) : null}
            <YStack
              flex={1}
              testID={official ? 'status-official-slide' : 'status-swipe'}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(event) => {
                s.swipeStartX.current = event.nativeEvent.pageX;
              }}
              onResponderRelease={(event) => s.onSwipeRelease(event.nativeEvent.pageX)}
            >
              <StatusMedia
                isVideo={isVideo}
                uri={current?.imageUrl}
                muted={s.muted}
                onEnded={() => advanceRef.current()}
              />
              <XStack position="absolute" top={0} bottom={0} left={0} right={0}>
                {/* Named buttons, so VoiceOver and a keyboard can step through
                    the slides as well as a tap can (2.1.1) — mWeb's twin zones. */}
                <YStack
                  pressStyle={PRESS_STYLE.surface}
                  testID="status-prev"
                  role="button"
                  aria-label={t('mweb.a11y.previousStory')}
                  tabIndex={0}
                  width="30%"
                  onPress={s.goPrev}
                />
                <YStack
                  pressStyle={PRESS_STYLE.surface}
                  flex={1}
                  testID="status-next"
                  role="button"
                  aria-label={t('mweb.a11y.nextStory')}
                  tabIndex={0}
                  onPress={() => advanceRef.current()}
                />
              </XStack>
            </YStack>
            <StatusViewerFooter
              slide={current}
              official={official}
              liked={s.liked}
              likeCount={s.likeCount}
              onToggleLike={onToggleLike ? s.toggleLike : undefined}
              onViewers={onViewers}
              target={status?.target}
              onOpenTarget={onOpenTarget}
              onOpenLink={onOpenLink}
            />
          </ModalSafeArea>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
