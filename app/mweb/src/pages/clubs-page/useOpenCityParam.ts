import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** The city opened from the Clubs city cards, kept in `?city=` so a reload stays
 * in it. Setting '' returns to the city cards. */
export function useOpenCityParam() {
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
  return [openCityId, setOpenCityId] as const;
}
