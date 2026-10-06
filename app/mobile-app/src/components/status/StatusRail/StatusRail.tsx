import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ScrollRail } from '@/components/ScrollRail';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AdCard } from '@/components/ads/AdCard';
import { openOfficialLink } from '@/components/status/statusRailActions';
import { StatusTile } from '@/components/status/StatusTile';
import { StatusVideoPreviewSheet } from '@/components/status/StatusVideoPreviewSheet';
import { StatusViewer } from '@/components/status/StatusViewer';
import { StoryViewersSheet } from '@/components/status/StoryViewersSheet';
import { ReportContentSheet } from '@/components/content-report/ReportContentSheet';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useTranslation } from '@/hooks/useTranslation';

import { OfficialStatusTile } from './OfficialStatusTile';
import { RailDoodle } from './RailDoodle';
import { isGroupSeen } from './railOrder';
import { useStatusRail } from './useStatusRail';

interface StatusRailProps {
  userName: string;
  userPhoto?: string | null;
}

/** Home status rail — Duncit's own pinned status first (when one is live), then
 * the "Your story" upload tile, the sponsored tile, and the followed clubs /
 * people ordered as [unseen (randomised)] → [seen, at the end]. The own tile
 * shows upload progress (Bug 1), and the viewer supports like (Bug 5), viewers
 * (Bug 4) and delete (Bug 7). */
export function StatusRail({ userPhoto }: Readonly<StatusRailProps>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const r = useStatusRail(t);
  const { mine, upload, ad, activeIsMine, standalone } = r;

  return (
    <>
      {/* The mock frames the story rail in its own card, with a decorative
       * paper-plane doodle trailing the tiles. */}
      <SurfaceCard marginHorizontal={16} paddingHorizontal={0} paddingVertical={12}>
        <ScrollRail
          testID="status-rail-scroll"
          gap={12}
          paddingHorizontal={14}
          alignItems="flex-start"
        >
          <OfficialStatusTile
            story={r.officialStory}
            seenIds={r.officialSeenIds}
            onPress={() => r.setOfficialOpen(true)}
          />
          <StatusTile
            testID="status-mine"
            label={upload.uploading ? 'Posting…' : 'Your story'}
            image={r.myCoverIsVideo ? userPhoto : (mine?.cover.imageUrl ?? userPhoto)}
            badge
            progress={upload.progress}
            onPress={() => {
              if (upload.uploading) return;
              if (mine) r.openAt(0);
              else fireAndForget(upload.pickAndUpload());
            }}
            onBadgePress={() => {
              if (!upload.uploading) fireAndForget(upload.pickAndUpload());
            }}
          />
          {/* The sponsored tile sits second, right after "Your story" (mock).
              Tapping it opens the ad as a story, never the advertiser's page. */}
          {ad ? (
            <AdCard
              ad={ad}
              variant="tile"
              testID="ad-slot-STATUS"
              onPress={() => r.setAdOpen(true)}
            />
          ) : null}
          {r.followed.map((item, itemIndex) => (
            <StatusTile
              key={item.key}
              testID={`status-${item.key}`}
              label={item.name}
              image={item.photo ?? item.cover.imageUrl}
              seen={isGroupSeen(item, r.seenIds)}
              onPress={() => r.openAt(mine ? itemIndex + 1 : itemIndex)}
            />
          ))}
          <RailDoodle accent={accent} />
        </ScrollRail>
      </SurfaceCard>
      {/* A pinned story — sponsored or Duncit's own — has no siblings to walk
          to, so it gets no next/prev: running past its end closes the viewer
          (which falls back to onClose). */}
      <StatusViewer
        status={r.viewerStatus}
        onClose={r.closeViewer}
        onNext={standalone ? undefined : r.goNext}
        onPrev={standalone ? undefined : r.goPrev}
        onOpenTarget={r.openTarget}
        onOpenLink={openOfficialLink}
        onDelete={activeIsMine ? r.setPendingDelete : undefined}
        onReport={r.canReport ? r.setReporting : undefined}
        onViewers={activeIsMine ? r.setViewersStoryId : undefined}
        onToggleLike={r.activeIsPerson ? r.toggleLike : undefined}
        onSlideSeen={r.slideSeen}
        authorUserId={activeIsMine ? mine?.authorId : undefined}
        onOpenAuthor={(userId) => r.openTarget({ kind: 'user', id: userId })}
      />
      <StatusVideoPreviewSheet
        video={
          upload.pendingVideo
            ? { uri: upload.pendingVideo.uri, durationSeconds: upload.pendingVideo.durationSeconds }
            : null
        }
        onCancel={upload.cancelVideo}
        onConfirm={(trim) => fireAndForget(upload.confirmVideo(trim))}
      />
      <StoryViewersSheet storyId={r.viewersStoryId} onClose={() => r.setViewersStoryId(null)} />
      <ReportContentSheet
        kind="STORY"
        targetId={r.reporting}
        onClose={() => r.setReporting(null)}
      />
      <ConfirmDialog
        testID="status-delete-confirm"
        open={r.pendingDelete !== null}
        title={t('mweb.common.deleteStory')}
        message="This story will be removed for everyone. This can't be undone."
        confirmLabel={t('mweb.common.delete')}
        destructive
        onConfirm={r.confirmDelete}
        onCancel={() => r.setPendingDelete(null)}
      />
    </>
  );
}
