import { useNavigate } from 'react-router';
import HomeRail from './HomeRail';
import PodCard from './PodCard';
import SeeAllCard from './SeeAllCard';
import { openPod } from '../../lib/open-pod';

interface HomeFeaturedPodsProps {
  pods: any[];
  /** Full "happening nearby" count — a trailing See-all card appears when the
   * rail is capped below it. */
  totalCount: number;
  /** True while a vibe chip / sheet filter narrows the rail: the full page is
   * unfiltered, so the card drops its count and its jump-to-index. */
  filtered: boolean;
  /** The category pill over the image (mock: "Sports"). */
  categoryLabelOf?: (pod: any) => string | null;
  /** Save state + toggle; omit to hide the save buttons (signed-out). */
  savedOf?: (podDocId: string) => boolean;
  /** True while THAT pod's toggle is in flight — its icon becomes a spinner. */
  savingOf?: (podDocId: string) => boolean;
  onToggleSave?: (podDocId: string) => void;
}

/** The "Happening nearby" rail — the same event card every other rail uses
 * (native twin: HomeFeaturedPods). */
export default function HomeFeaturedPods({
  pods,
  totalCount,
  filtered,
  categoryLabelOf,
  savedOf,
  savingOf,
  onToggleSave,
}: Readonly<HomeFeaturedPodsProps>) {
  const navigate = useNavigate();
  if (pods.length === 0) return null;

  return (
    <HomeRail>
      {pods.map((pod) => (
        <PodCard
          key={pod.id}
          pod={pod}
          showPlace={false}
          categoryLabel={categoryLabelOf?.(pod)}
          saved={savedOf?.(pod.id) ?? false}
          saving={savingOf?.(pod.id) ?? false}
          onToggleSave={onToggleSave ? () => onToggleSave(pod.id) : undefined}
          onOpen={() => openPod(navigate, pod)}
        />
      ))}
      {totalCount > pods.length && (
        <SeeAllCard
          count={filtered ? undefined : totalCount - pods.length}
          width={200}
          onClick={() =>
            navigate(filtered ? '/happening-nearby' : `/happening-nearby?from=${pods.length}`)
          }
        />
      )}
    </HomeRail>
  );
}
