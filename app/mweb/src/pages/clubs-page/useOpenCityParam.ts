import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';

/** The city opened from the Clubs city cards, kept in `?city=` so a reload stays
 * in it. Setting '' returns to the city cards. A change of the header location
 * closes it, so the list always follows the header. */
export function useOpenCityParam(headerLocationId: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const openCityId = searchParams.get('city') ?? '';
  const setOpenCityId = useCallback(
    (cityId: string) =>
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (cityId) {
          next.set('city', cityId);
        } else {
          next.delete('city');
        }
        return next;
      }),
    [setSearchParams],
  );

  const lastHeaderLocationId = useRef(headerLocationId);
  useEffect(() => {
    if (lastHeaderLocationId.current === headerLocationId) return;
    lastHeaderLocationId.current = headerLocationId;
    if (openCityId) setOpenCityId('');
  }, [headerLocationId, openCityId, setOpenCityId]);

  return [openCityId, setOpenCityId] as const;
}
