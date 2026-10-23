import FoodSection from '../register-venue-page/sections/food/FoodSection';
import VenueSetupEditor from './VenueSetupEditor';
import VenueSetupPage from './VenueSetupPage';

/**
 * Food > Food Settings: whether the venue serves food, its licences, QR
 * ordering and the Razorpay account guests pay, the invoice GST number and its
 * tables. An approved venue's dishes are edited on Food > Menu; a venue still
 * on its way to approval sets its menu up here too.
 */
export default function FoodSettingsPage() {
  return (
    <VenueSetupPage
      titleKey="mweb.studioOptions.foodSettings"
      hintKey="mweb.studioOptions.foodSettingsHint"
      testId="venue-food-settings-page"
    >
      {(venue) => (
        <VenueSetupEditor key={venue.id} venueId={venue.id} section="food" testId="venue-food-settings">
          {({ form, config, mode, venue: record }) => (
            <FoodSection
              form={form}
              config={config}
              mode={mode}
              venueId={venue.id}
              savedGstin={record?.gstin ?? ''}
              venueName={record?.venue_name ?? undefined}
              hasSavedTables={(record?.food_tables?.length ?? 0) > 0}
              showMenu={mode !== 'edit-approved'}
            />
          )}
        </VenueSetupEditor>
      )}
    </VenueSetupPage>
  );
}
