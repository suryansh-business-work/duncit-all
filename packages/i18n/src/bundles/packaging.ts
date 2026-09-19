import type { NestedCatalogue } from '../catalogue';

/**
 * The "Shipping & packaging" section every product form shares
 * (`PackagingFields` in @duncit/forms): the Products portal, the Partners app
 * and the E-commerce portal's bulk edit. Each of those portals layers this
 * bundle into its `i18nFallback`.
 */
export const PACKAGING_BUNDLE: NestedCatalogue = {
  packaging: {
    title: 'Shipping & packaging',
    intro: 'The packed parcel of one unit, box included — ShipRocket rates and bills these numbers.',
    presets: 'Quick fill',
    weight: 'Packed weight (kg)',
    length: 'Length (cm)',
    breadth: 'Breadth (cm)',
    height: 'Height (cm)',
    chargeable: 'Chargeable weight: {kg} kg',
    boxHeavier: "Box is too big for the weight — you'll pay for {kg} kg",
    packageType: 'Package type',
    type: {
      BOX: 'Box',
      POLYBAG: 'Polybag',
      ENVELOPE: 'Envelope',
      OTHER: 'Other',
    },
    hsn: 'HSN code',
    hsnHint: 'For the GST invoice — pet food 2309, toys 9503',
    fragile: 'Fragile',
    liquid: 'Contains liquid',
    shelfLife: 'Shelf life (days)',
    shelfLifeHint: "Food and medicine — leave blank if it doesn't expire",
    missing: 'Missing packaging',
    preset: {
      smallPouch: 'Small pouch',
      treatBox: 'Treat box',
      foodBag3: 'Food bag 3 kg',
      foodBag10: 'Food bag 10 kg',
      toyBox: 'Toy box',
      bedLarge: 'Bed / large',
    },
  },
};
