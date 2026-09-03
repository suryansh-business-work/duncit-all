import { useMemo, useState } from 'react';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';
import { monthKeyOf, readVenueSettings } from '@duncit/slots';

import { StackScreen } from '@/components/StackScreen';
import { VenueSwitcher } from '@/components/studio';
import { AvailabilityCalendarCard } from '@/components/venue-availability/AvailabilityCalendarCard';
import {
  countSlotsByDay,
  dayKeyOf,
  lastPublishableDay,
  monthRange,
  slotsOnDay,
} from '@/components/venue-availability/availability-grid';
import { DaySheet } from '@/components/venue-availability/DaySheet';
import { RecurringSheet } from '@/components/venue-availability/recurring/RecurringSheet';
import { useOwnerVenueSlots } from '@/hooks/useOwnerVenueSlots';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenuesWithSettings } from '@/hooks/useVenuesWithSettings';
import { appNow } from '@/utils/app-formatter';

/**
 * Venue availability — the Tamagui twin of mWeb's /venues/availability, which
 * mounts `VenueAvailabilityEditor` from @duncit/availability-calendar (rule 27).
 *
 * The venue is picked from the same switcher as Venue Studio, and only an
 * APPROVED venue is editable: hosts can only see slots of an approved venue,
 * so publishing availability for any other status would be publishing into
 * the void. Every rule the calendar runs on — what a day shows, what a draft
 * may become, what a recurring run creates — is the shared `@duncit/slots`.
 */
export function VenueAvailabilityScreen() {
  const { t } = useTranslation();
  const { venues, venue, venueId, selectVenue, isLoading, refetch } = useVenuesWithSettings();
  const approved = venue?.status === 'APPROVED';
  const editableId = approved ? venueId : null;

  const now = appNow();
  const todayKey = dayKeyOf(now);
  const lastKey = lastPublishableDay(now);
  const [monthKey, setMonthKey] = useState(() => monthKeyOf(todayKey));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [recurringOpen, setRecurringOpen] = useState(false);

  const range = useMemo(() => monthRange(monthKey), [monthKey]);
  const slotsState = useOwnerVenueSlots(editableId, range);

  const settings = useMemo(() => readVenueSettings(venue?.settings), [venue?.settings]);
  const holidays = useMemo(() => new Set(settings.holidays), [settings.holidays]);
  const counts = useMemo(() => countSlotsByDay(slotsState.slots), [slotsState.slots]);
  // Memoised because the recurring sheet re-seeds its space rows whenever this
  // value changes — a fresh array every render would wipe typed prices.
  const spaces = useMemo(
    () =>
      (venue?.capacity_items ?? []).map((item) => ({ label: item.label, capacity: item.capacity })),
    [venue?.capacity_items],
  );
  const daySlots = useMemo(
    () => (selectedDay ? slotsOnDay(slotsState.slots, selectedDay) : []),
    [slotsState.slots, selectedDay],
  );

  return (
    <StackScreen title={t('mweb.venueAvailabilityPage.title')} testID="venue-availability-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={14} padding={16} paddingBottom={48}>
          {isLoading ? <Spinner testID="venue-availability-loading" color="$primary" /> : null}
          <VenueSwitcher venues={venues} venueId={venueId} onSelect={selectVenue} />
          <Text fontSize={12.5} color="$muted">
            {t('mweb.venueAvailabilityPage.subtitle')}
          </Text>
          {!isLoading && venues.length === 0 ? (
            <Text testID="venue-availability-empty" fontSize={13} color="$muted">
              {t('mweb.venueAvailabilityPage.noVenues')}
            </Text>
          ) : null}
          {venue && !approved ? (
            <Text testID="venue-availability-not-approved" fontSize={13} color="$warning">
              {t('mweb.venueAvailabilityPage.approvalRequired', {
                vars: { status: venue.status },
              })}
            </Text>
          ) : null}
          {editableId ? (
            <AvailabilityCalendarCard
              monthKey={monthKey}
              onMonthChange={setMonthKey}
              counts={counts}
              holidays={holidays}
              todayKey={todayKey}
              lastKey={lastKey}
              selectedDay={selectedDay}
              onPickDay={setSelectedDay}
              isLoading={slotsState.isLoading}
              error={slotsState.error}
              onRecurring={() => setRecurringOpen(true)}
            />
          ) : null}
        </YStack>
      </ScrollView>

      {venue && editableId ? (
        <>
          <DaySheet
            dayKey={selectedDay}
            slots={daySlots}
            isHoliday={!!selectedDay && holidays.has(selectedDay)}
            spaces={spaces}
            onClose={() => setSelectedDay(null)}
            onCreate={slotsState.create}
            onToggleBlock={slotsState.toggleBlock}
            onDelete={slotsState.remove}
          />
          <RecurringSheet
            open={recurringOpen}
            onClose={() => setRecurringOpen(false)}
            venueId={editableId}
            settings={venue.settings}
            capacityItems={spaces}
            venueCapacity={venue.capacity}
            onSlotsChanged={slotsState.refetch}
            onVenueChanged={refetch}
          />
        </>
      ) : null}
    </StackScreen>
  );
}
