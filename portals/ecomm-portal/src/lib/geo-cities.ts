/**
 * City names for a state, alphabetical. The country-state-city dataset is
 * imported on demand so it becomes its own chunk instead of bloating the main
 * bundle; it shares ISO 3166-2 state codes with `@duncit/geo`, so the State
 * picker's code maps straight onto it.
 */
export async function loadCityNames(countryCode: string, stateCode: string): Promise<string[]> {
  if (!countryCode || !stateCode) return [];
  const { City } = await import('country-state-city');
  return City.getCitiesOfState(countryCode, stateCode)
    .map((city) => city.name)
    .sort((a, b) => a.localeCompare(b));
}
