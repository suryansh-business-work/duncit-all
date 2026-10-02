import { Box, ButtonBase, Dialog } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DuncitButton } from '@duncit/buttons';
import { useNavigate } from 'react-router';
import { formatDistanceToNowStrict } from 'date-fns';
import ReportContentDialog from '../../../components/content-report/ReportContentDialog';
import HomeStatusViewerDetails from '../HomeStatusViewerDetails';
import { useTranslation } from '../../../i18n/useTranslation';
import { MAX_VIDEO_SECONDS, SWIPE_THRESHOLD, slideTarget, statusRemainingLabel, viewerChrome } from './helpers';
import StatusViewerActions from './StatusViewerActions';
import StatusViewerHeader from './StatusViewerHeader';
import StatusViewerMedia from './StatusViewerMedia';
import type { HomeStatusViewerProps } from './types';
import { useStatusViewerPlayback } from './useStatusViewerPlayback';

export default function HomeStatusViewer({
  item,
  onClose,
  onNext,
  onPrev,
  onDelete,
  canReport = false,
  onViewers,
  onToggleLike,
  onRecordView,
  startIndex = 0,
}: Readonly<HomeStatusViewerProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    progress, setProgress, setPaused, index, setIndex, liked, setLiked, likeCount, setLikeCount,
    muted, setMuted, reporting, setReporting, pointerStartX, goNextStory, slides, current,
    videoSrc, isVideo, held, currentId, handleAutoplayBlocked,
  } = useStatusViewerPlayback({ item, startIndex, onNext, onClose, onRecordView });

  if (!item) return null;

  const goPrev = () => {
    if (index > 0) setIndex(index - 1);
    else onPrev?.();
  };
  const goNext = () => {
    if (index < slides.length - 1) setIndex(index + 1);
    else goNextStory();
  };

  // Swipe left → next follower, swipe right → previous (bug 2).
  const handleSwipeEnd = (clientX: number) => {
    const dx = clientX - pointerStartX.current;
    if (dx <= -SWIPE_THRESHOLD) goNextStory();
    else if (dx >= SWIPE_THRESHOLD) onPrev?.();
  };

  const handleVideoTime = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const cap = Math.min(video.duration || MAX_VIDEO_SECONDS, MAX_VIDEO_SECONDS);
    if (cap > 0) setProgress(Math.min(1, video.currentTime / cap));
    if (video.currentTime >= cap) goNext();
  };

  // A clip that cannot load must not park the story on a black frame: nothing
  // drives the progress bar for a video but the clip itself, so the slide would
  // sit there until the viewer closed it by hand.
  const handleVideoError = () => goNext();

  // Delete is the owner's and Report is everybody else's; a story that offers
  // neither (an ad, a pod, Duncit's own) has no menu to open.
  const onReport = canReport ? setReporting : undefined;
  const hasMenu = !!onDelete || canReport;
  const chrome = viewerChrome(item.kind);
  const target = slideTarget(item, current);
  const openTarget = () => {
    if (!target.url) return;
    onClose();
    if (target.internal) navigate(target.url);
    else window.open(target.url, '_blank', 'noreferrer');
  };

  // The header sits over the tap zones, so the name is a real target; the
  // viewer closes first or its dialog would sit over the profile it opened.
  const openAuthor = () => {
    if (!item.authorId) return;
    onClose();
    navigate(`/u/${item.authorId}`);
  };

  const toggleLike = () => {
    if (!currentId || !onToggleLike) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((value) => (next ? value + 1 : value - 1));
    onToggleLike(currentId);
  };

  const nextPeek = slides.slice(index + 1, index + 3);
  const agoLabel = current?.createdAt
    ? `${formatDistanceToNowStrict(new Date(current.createdAt))} ago`
    : null;
  // Countdown until the status is auto-removed (recomputed each slide tick).
  const remainingLabel = statusRemainingLabel(current?.expiresAt);
  const timeLabel = [agoLabel, remainingLabel].filter(Boolean).join(' · ') || null;

  return (
    <Dialog data-testid="home-status-viewer" open={!!item} fullScreen onClose={onClose} slotProps={{
      paper: { 'aria-label': item.label, sx: { bgcolor: '#08070b' } }
    }}>
      <Box
        data-testid={chrome.slideTestId}
        onPointerDown={(event) => {
          setPaused(true);
          pointerStartX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          setPaused(false);
          handleSwipeEnd(event.clientX);
        }}
        onPointerCancel={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        sx={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', color: '#fff', touchAction: 'none' }}
      >
        <StatusViewerMedia
          videoSrc={videoSrc}
          index={index}
          held={held}
          muted={muted}
          onBlocked={handleAutoplayBlocked}
          onTimeUpdate={handleVideoTime}
          onEnded={goNext}
          onError={handleVideoError}
          mediaUrl={current?.mediaUrl}
          label={item.label}
        />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.52) 0%, transparent 30%, rgba(0,0,0,0.82) 100%)' }} />

        {/* Tap zones — real buttons, so a keyboard and a screen reader can step
            through the slides too (2.1.1). */}
        <ButtonBase data-testid="status-prev" aria-label={t('mweb.a11y.previousStory')} disableRipple onClick={goPrev} sx={{ position: 'absolute', top: 64, bottom: 120, left: 0, width: '30%', zIndex: 2 }} />
        <ButtonBase data-testid="status-next" aria-label={t('mweb.a11y.nextStory')} disableRipple onClick={goNext} sx={{ position: 'absolute', top: 64, bottom: 120, right: 0, width: '40%', zIndex: 2 }} />
        <StatusViewerHeader
          item={item}
          slides={slides}
          index={index}
          progress={progress}
          current={current}
          timeLabel={timeLabel}
          openAuthor={openAuthor}
          actions={
            <StatusViewerActions
              isVideo={isVideo}
              muted={muted}
              onToggleMute={() => setMuted((value) => !value)}
              currentId={currentId}
              onToggleLike={onToggleLike}
              liked={liked}
              likeCount={likeCount}
              toggleLike={toggleLike}
              onViewers={onViewers}
              hasMenu={hasMenu}
              onDelete={onDelete}
              onReport={onReport}
              onClose={onClose}
            />
          }
        />

        {/* Bottom details + peek */}
        <HomeStatusViewerDetails
          current={current}
          timeLabel={timeLabel}
          nextPeek={nextPeek}
          index={index}
          onJumpTo={(i) => setIndex(i)}
          hasOpenButton={!!target.url}
          captionTestId={chrome.captionTestId}
        />
        {target.url && (
          <DuncitButton
            data-testid={chrome.linkTestId}
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={openTarget}
            size="large" sx={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(18px + env(safe-area-inset-bottom))' }}
          >
            {t(chrome.linkKey)}
          </DuncitButton>
        )}
      </Box>
      <ReportContentDialog kind="STORY" postId={reporting} onClose={() => setReporting(null)} />
    </Dialog>
  );
}
