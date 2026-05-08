import { useEffect, useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
} from '@mui/material';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import ExplorePodCard from './explore-page/ExplorePodCard';

const EXPLORE_PODS = gql`
  query ExplorePods {
    me {
      user_id
      saved_pod_ids
    }
    pods(filter: { is_active: true }) {
      id
      pod_id
      pod_title
      pod_description
      pod_date_time
      pod_type
      pod_amount
      pod_attendees
      no_of_spots
      zone_name
      pod_images_and_videos { url type }
      club_id
      location_id
      like_count
      liked_by_me
      comment_count
    }
    clubs(filter: { is_active: true }) {
      id
      club_name
      super_category_id
      club_feature_images_and_videos { url type }
    }
    superCategories: categories(filter: { level: SUPER }) { id slug }
    locations { id location_name }
  }
`;

const TOGGLE_SAVED_POD = gql`
  mutation ToggleSavedPod($pod_doc_id: ID!) {
    toggleSavedPod(pod_doc_id: $pod_doc_id) {
      pod_id
      saved
      saved_pod_ids
    }
  }
`;

interface ExplorePageProps {
  superCategorySlug?: string;
}

export default function ExplorePage({ superCategorySlug }: ExplorePageProps) {
  const { data, loading, error } = useQuery(EXPLORE_PODS, {
    fetchPolicy: 'cache-and-network',
  });
  const [toggleSavedPod] = useMutation(TOGGLE_SAVED_POD);
  const [pendingSave, setPendingSave] = useState<Set<string>>(new Set());
  // Local optimistic overlay; merged with server saved_pod_ids.
  const [localSaved, setLocalSaved] = useState<Map<string, boolean>>(new Map());

  const serverSaved = useMemo<Set<string>>(
    () => new Set<string>(data?.me?.saved_pod_ids ?? []),
    [data?.me?.saved_pod_ids],
  );

  // Drop local overrides once server confirms the new state.
  useEffect(() => {
    if (localSaved.size === 0) return;
    setLocalSaved((prev) => {
      const next = new Map(prev);
      for (const [id, want] of prev) {
        if (pendingSave.has(id)) continue;
        if (serverSaved.has(id) === want) next.delete(id);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSaved, pendingSave]);

  const isSaved = (id: string) =>
    localSaved.has(id) ? !!localSaved.get(id) : serverSaved.has(id);

  const clubsById = useMemo(() => {
    const m = new Map<string, any>();
    (data?.clubs ?? []).forEach((c: any) => m.set(c.id, c));
    return m;
  }, [data]);
  const locById = useMemo(() => {
    const m = new Map<string, any>();
    (data?.locations ?? []).forEach((l: any) => m.set(l.id, l));
    return m;
  }, [data]);

  const pods = useMemo(() => {
    const list = (data?.pods ?? []).slice();
    const supers = data?.superCategories ?? [];
    const selectedSuperId = superCategorySlug
      ? supers.find((s: any) => s.slug === superCategorySlug)?.id
      : null;
    const filtered = selectedSuperId
      ? list.filter((p: any) => clubsById.get(p.club_id)?.super_category_id === selectedSuperId)
      : list;
    filtered.sort(
      (a: any, b: any) =>
        new Date(a.pod_date_time || 0).getTime() -
        new Date(b.pod_date_time || 0).getTime(),
    );
    return filtered;
  }, [data, clubsById, superCategorySlug]);

  const toggleSave = async (id: string) => {
    const want = !isSaved(id);
    setLocalSaved((prev) => new Map(prev).set(id, want));
    setPendingSave((prev) => new Set(prev).add(id));
    try {
      await toggleSavedPod({ variables: { pod_doc_id: id } });
    } catch {
      setLocalSaved((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    } finally {
      setPendingSave((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!pods.length) return <Alert severity="info">No pods to explore yet.</Alert>;

  return (
    <Box
      sx={{
        height: '100%',
        position: 'relative',
        '& .slick-slider, & .slick-list, & .slick-track': { height: '100%' },
        '& .slick-slide > div': { height: '100%' },
      }}
    >
      <Slider
        vertical
        verticalSwiping
        slidesToShow={1}
        slidesToScroll={1}
        arrows={false}
        infinite={false}
        speed={450}
        swipeToSlide
        touchThreshold={12}
        adaptiveHeight={false}
      >
        {pods.map((p: any) => (
          <Box key={p.id} sx={{ height: '100%' }}>
            <ExplorePodCard
              pod={p}
              club={clubsById.get(p.club_id)}
              location={locById.get(p.location_id)}
              saved={isSaved(p.id)}
              onToggleSave={() => toggleSave(p.id)}
              viewerId={data?.me?.user_id ?? null}
            />
          </Box>
        ))}
      </Slider>
    </Box>
  );
}
