import { Route, Routes } from 'react-router';
import { accountRoutes } from './accountRoutes';
import { coreRoutes } from './coreRoutes';
import { AddressBookPage, CartPage, ChatRoomPage, ChatsPage, CheckoutPage, ClubsPage, ContactsPage, ExplorePage, ForgotPasswordPage, HappeningNearbyPage, LoginPage, NotFoundPage, OrdersHistoryPage, PreviousPodsPage, ProductCheckoutPage, ProductDetailPage, RegisterPage, SavedItemsPage, SearchPage, ShopPage } from './lazyPages';
import { partnerRoutes } from './partnerRoutes';
import { redirectIfAuthed, withAuth, withProducts, type AppRoutesProps } from './routeGuards';

export default function AppRoutes({ superCategory, locationId, zoneName }: Readonly<AppRoutesProps>) {
  // The Suspense boundary for these lazy pages lives in App, ABOVE the keyed
  // page wrapper — see the note there.
  return (
      <Routes>
        {coreRoutes({ superCategory, locationId, zoneName })}
        {partnerRoutes({ locationId })}
        {accountRoutes()}
        <Route path="/checkout" element={withAuth(<CheckoutPage />)} />
        <Route path="/checkout/:podId" element={withAuth(<CheckoutPage />)} />
        <Route path="/product-checkout" element={withProducts(<ProductCheckoutPage />)} />
        <Route path="/cart" element={withProducts(<CartPage />)} />
        <Route path="/shop" element={withProducts(<ShopPage />)} />
        <Route path="/product/:productId" element={withProducts(<ProductDetailPage />)} />
        <Route path="/orders" element={withProducts(<OrdersHistoryPage />)} />
        <Route path="/address-book" element={withAuth(<AddressBookPage />)} />
        <Route
          path="/explore"
          element={withAuth(
            <ExplorePage
              superCategorySlug={superCategory}
              locationId={locationId}
              zoneName={zoneName}
            />,
          )}
        />
        <Route
          path="/previous-pods"
          element={withAuth(
            <PreviousPodsPage
              superCategorySlug={superCategory}
              locationId={locationId}
              zoneName={zoneName}
            />,
          )}
        />
        <Route
          path="/happening-nearby"
          element={withAuth(
            <HappeningNearbyPage
              superCategorySlug={superCategory}
              locationId={locationId}
              zoneName={zoneName}
            />,
          )}
        />
        <Route path="/search" element={withAuth(<SearchPage />)} />
        <Route path="/saved" element={withAuth(<SavedItemsPage />)} />
        <Route path="/contacts" element={withAuth(<ContactsPage />)} />
        <Route
          path="/clubs"
          element={withAuth(
            <ClubsPage superCategorySlug={superCategory} locationId={locationId} zoneName={zoneName} />,
          )}
        />
        <Route path="/chats" element={withAuth(<ChatsPage superCategorySlug={superCategory} />)} />
        <Route path="/chats/:id" element={withAuth(<ChatRoomPage />)} />
        <Route path="/register" element={redirectIfAuthed(<RegisterPage />)} />
        <Route path="/login" element={redirectIfAuthed(<LoginPage />)} />
        <Route path="/forgot-password" element={redirectIfAuthed(<ForgotPasswordPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
  );
}
