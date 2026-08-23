import type { NestedCatalogue } from '../catalogue';

/**
 * Everything @duncit/user-context renders — the portal login screen, the
 * maintenance / under-development gates, and the dialog shown when a signed-in
 * account's data will not load.
 *
 * Its own namespace, not a surface's, for the usual reason (rule 40): the gate
 * and the failure dialog render in mWeb AND in all seventeen portals, so a copy
 * in each bundle would be two hand-kept sets of the same sentences. mWeb and
 * the shell both layer this namespace over their own.
 */
export const SESSION_BUNDLE: NestedCatalogue = {
  session: {
    /** The shared portal login screen. */
    login: {
      heading: 'Log in',
      email: 'e-mail address',
      password: 'password',
      emailInvalid: 'Enter a valid e-mail address',
      emailRequired: 'E-mail address is required',
      passwordRequired: 'Password is required',
      togglePassword: 'Toggle password visibility',
      submit: 'Sign in',
      forgotPassword: 'Forgot password?',
      forgotPasswordHint: 'Contact your administrator to reset your password.',
      authorizedOnly:
        'Authorized personnel only. Sign in with your Duncit credentials to access the operations portal.',
      privacyPolicy: 'Privacy Policy',
      termsOfUse: 'Terms of Use',
      otherPortals: 'Other portals',
      supportPrefix: 'Trouble signing in? Email',
      supportSuffix: 'and our team will help you get back in.',
      switchToLight: 'Switch to light',
      switchToDark: 'Switch to dark',
      toggleColorMode: 'Toggle colour mode',
    },
    /** The "jump to another console" dialog behind the login card. */
    portals: {
      title: 'Other portals',
      subtitle: 'One Duncit account — jump to any console below.',
      search: 'Search portals…',
      all: 'All',
      noMatch: 'No portals match “{query}”.',
    },
    /** The right-hand promo card. */
    promo: {
      by: 'By {brand}',
      explore: 'Explore',
    },
    /** The two whole-screen gates a portal can be switched into from admin. */
    portalMode: {
      thisService: 'This service',
      maintenanceTitle: 'We’ll be back soon',
      maintenanceBody:
        '{app} is temporarily down for maintenance. Please check back in a little while.',
      developmentTitle: 'Under development',
      developmentBody: '{app} is being built and isn’t available yet. It will go live soon.',
    },
    /** Signed in, but the account payload never arrived. */
    notLoaded: {
      title: 'User data not loaded',
      body: 'Please reload the application so your latest account data can load correctly.',
      signOutHint:
        'If reloading does not help, sign out — this clears any stale session and lets you log back in.',
      logout: 'Logout',
      reload: 'Reload Application',
    },
  },
};
