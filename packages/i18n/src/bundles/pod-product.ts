import type { NestedCatalogue } from '../catalogue';

/**
 * The pod product picker's copy — a namespace of its own, like the media
 * picker's and the grievance form's.
 *
 * The SAME full-page picker opens from four places: the native Create-a-Pod
 * stepper, mWeb's, the admin portal's pod form and the Club Admin one in
 * partners-app. Its sentences therefore belong to no single surface — MWEB_BUNDLE
 * plus SHELL_BUNDLE would be two hand-kept copies of the same dialog, which is
 * exactly the drift rules 27 and 40 exist to stop. One namespace, compiled into
 * whichever build imports it.
 */
export const POD_PRODUCT_BUNDLE: NestedCatalogue = {
  podProduct: {
    // The Step 4 entry point. The old "Attach products to this pod" switch is
    // gone: attaching IS adding a product now, so the button is the only door.
    addButton: 'Add a Product',
    attachedTitle: 'Products attached to this pod',
    attachedEmpty: 'No products attached yet.',
    // The full-page dialog chrome.
    dialogTitle: 'Add a product',
    dialogSubtitle: 'Products approved for this pod’s category.',
    close: 'Close',
    searchPlaceholder: 'Search products, brands or SKU',
    clearFilters: 'Clear filters',
    activeFilters: '{count} active',
    brand: 'Brand',
    allBrands: 'All brands',
    sort: 'Sort',
    sortName: 'Name (A–Z)',
    sortPriceLow: 'Price: low to high',
    sortPriceHigh: 'Price: high to low',
    sortStock: 'Availability',
    inStockOnly: 'In stock only',
    resultCount: '{count} products',
    // Empty states. The list arrives already narrowed to the pod's Super + Sub
    // category, so "none" means "none in this category", never "none at all".
    emptyCategory: 'No products available for this category.',
    emptySearch: 'No products match your search.',
    // The product card + detail pane.
    perUnit: '{cost} / unit',
    unitsLeft: '{count} left',
    outOfStock: 'Out of stock',
    alreadyAdded: 'Added',
    details: 'Product details',
    noDescription: 'No description provided.',
    sku: 'SKU',
    unitType: 'Unit',
    weightVolume: 'Weight / volume',
    // Quantity — disabled until a product is picked, and reset when the pick
    // changes so a quantity can never outlive the product it was chosen for.
    quantity: 'Quantity',
    quantityHint: 'Select a product to set a quantity.',
    decreaseQty: 'Decrease quantity',
    increaseQty: 'Increase quantity',
    maxQtyHint: 'Only {count} available.',
    lineTotal: 'Total: {amount}',
    addToPod: 'Add to pod',
    // Validation. The picker makes an empty row impossible and clamps quantity
    // to stock, so this is the only message the flow can still produce.
    selectFirst: 'Please select a product to continue.',
    // The attached list on Step 4.
    removeProduct: 'Remove product',
    productTotal: 'Total: {amount}',
  },
};
