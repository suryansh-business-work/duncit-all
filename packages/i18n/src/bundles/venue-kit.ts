import type { NestedCatalogue } from '../catalogue';

/**
 * The Duncit Venue Kit — coming soon, annual plan only.
 *
 * One namespace for both places it renders: the duncit.com/venue-kit page and
 * the Venues console's Venue Kit section. The plan, the seven features and the
 * interest form read the same sentences on both, so they are kept once here
 * rather than as two hand-kept copies (the grievance form's precedent).
 *
 * Numbers are never written into the copy: `{price}`, `{labels}` and the rest
 * come from the server's `venueKitOffer` through `venueKitCopyVars`.
 */
export const VENUE_KIT_BUNDLE: NestedCatalogue = {
  venueKit: {
    comingSoon: 'Coming soon',
    annualOnly: 'Annual plan only',
    perYear: '/ year',
    plan: {
      kicker: 'The plan',
      heading: 'One plan. One year. Everything in the box.',
      price: '{price}',
      priceLabel: '{price} per year',
      note: 'Only the annual plan is available. There is no monthly option.',
      comingSoonNote: 'The Venue Kit is not on sale yet. Register your interest and we will tell you the moment it launches.',
    },
    features: {
      kicker: 'What is in the kit',
      heading: 'Seven things your venue gets',
      tableLabels: {
        title: 'Table QR labels',
        text: 'QR labels for up to {labels} tables, so guests scan to order and pay from their seat. Extra labels are {extraLabelPrice} each.',
        sticker: 'Up to {labels} tables',
      },
      counterStandee: {
        title: 'Counter QR standee',
        text: 'A standee for your counter that opens digital ordering in one scan, for walk-ins and takeaway.',
        sticker: 'Scan to order',
      },
      smartPos: {
        title: 'Smart POS system',
        text: 'Works on a touchscreen, a desktop or a phone. The kit includes a {posMonths}-month activation coupon.',
        sticker: '{posMonths}-month coupon',
      },
      freeGiftCards: {
        title: 'Free gift cards',
        text: '{giftCards} Duncit gift cards of {giftCardValue} each, {giftCardTotal} of value to hand to your guests.',
        sticker: 'Worth {giftCardTotal}',
      },
      collabGiftCards: {
        title: 'Venue collaboration gift cards',
        text: 'Order more co-branded Duncit × your venue gift cards at a {collabDiscount} discount.',
        sticker: '{collabDiscount} off',
      },
      razorpay: {
        title: 'Razorpay integration',
        text: 'Help connecting your own Razorpay account, with step-by-step documentation, so guest payments reach you directly.',
        sticker: 'Setup support',
      },
      orderBenefit: {
        title: '{orderBenefit} order benefit',
        text: 'Duncit funds {orderBenefit} back on every order, with WhatsApp order updates and automated invoicing included.',
        sticker: 'Funded by Duncit',
      },
    },
    form: {
      kicker: 'Interested?',
      heading: 'Register your interest',
      intro: 'Tell us who you are and verify your email. Verifying your mobile is optional.',
      nameLabel: 'Name',
      nameHint: 'Your name or your venue’s name',
      emailLabel: 'Email address',
      phoneLabel: 'Mobile number',
      phoneHint: 'Indian mobile numbers only',
      dialCode: '+91',
      codeLabel: '6-digit code',
      sendEmailCode: 'Send email code',
      verifyEmail: 'Verify email',
      emailCodeSent: 'We sent a 6-digit code to {email}. It expires in {minutes} minutes.',
      emailVerified: 'Email verified',
      changeEmail: 'Change email',
      verifyPhoneToggle: 'Also verify my mobile number by SMS (optional)',
      sendPhoneCode: 'Send SMS code',
      verifyPhone: 'Verify mobile',
      phoneCodeSent: 'We sent a 6-digit code to +91 {phone}. It expires in {minutes} minutes.',
      phoneVerified: 'Mobile verified',
      testCode: 'No provider is set up on this server yet. Use the code {code}.',
      resend: 'Send a new code',
      submit: 'Register interest',
      working: 'Please wait…',
      doneTitle: 'You are on the list',
      doneText: 'Thanks, {name}. We will contact you at {email} as soon as the Venue Kit launches.',
      doneUpdated: 'You were already on the list, so we updated your details.',
      failed: 'Something went wrong. Please try again.',
      nameRequired: 'Enter your name',
      emailInvalid: 'Enter a valid email address',
      phoneInvalid: 'Enter a valid 10-digit Indian mobile number',
      codeInvalid: 'Enter the 6-digit code',
    },
    page: {
      metaDescription:
        'The Duncit Venue Kit is coming soon: table QR labels, a counter standee, a Smart POS, gift cards, Razorpay setup and a Duncit-funded order benefit, on one annual plan.',
      eyebrow: 'Coming soon',
      heading: 'Duncit Venue Kit',
      intro: 'Everything a venue needs to take orders, look after guests and grow with Duncit, in one box on one annual plan.',
      planCta: 'Register interest',
      stepsKicker: 'How it works',
      stepsHeading: 'Get on the list in a minute',
      steps: {
        details: { title: 'Tell us who you are', text: 'Your name, email address and mobile number.' },
        email: { title: 'Verify your email', text: 'We email you a 6-digit code to confirm the address.' },
        phone: { title: 'Verify your mobile (optional)', text: 'Confirm your +91 number by SMS, or skip this step.' },
        launch: { title: 'Hear first at launch', text: 'Interested venues are contacted first when the kit goes on sale.' },
      },
      ctaKicker: 'Coming soon',
      ctaHeading: 'Questions about the Venue Kit?',
      ctaText: 'Write to us and the venues team will get back to you.',
      ctaButton: 'Contact us',
    },
    console: {
      title: 'Venue Kit',
      subtitle: 'The Venue Kit plan, coming soon, and every venue that asked to hear about it.',
      registerHeading: 'Register a venue’s interest',
      registerIntro: 'For a venue that calls or writes in. The code goes to the venue’s own email, so ask them to read it out.',
      interestsHeading: 'Interested venues',
      total: 'Interested',
      phoneVerified: 'Mobile verified',
      editPlan: 'Edit plan',
      planUpdated: 'Venue Kit plan updated',
      planDialogTitle: 'Edit the Venue Kit plan',
      planDialogIntro: 'Every amount is in rupees. The website shows the new plan from its next build.',
      fields: {
        annualPrice: 'Annual price (₹)',
        includedLabels: 'Table labels included',
        extraLabelPrice: 'Price per extra label (₹)',
        posMonths: 'POS activation coupon (months)',
        giftCardCount: 'Free gift cards',
        giftCardValue: 'Value of each gift card (₹)',
        collabDiscount: 'Collaboration gift card discount (%)',
        orderBenefit: 'Order benefit (%)',
      },
      fieldInvalid: 'Enter a number from 0 to {max}',
      save: 'Save plan',
      columns: {
        name: 'Name',
        email: 'Email',
        phone: 'Mobile',
        phoneVerified: 'Mobile verified',
        source: 'Source',
        status: 'Status',
        submissions: 'Submissions',
        created: 'Registered',
        lastSubmitted: 'Last submitted',
      },
      sources: { WEBSITE: 'Website', VENUES_PORTAL: 'Venues console' },
      statuses: { NEW: 'New', CONTACTED: 'Contacted', CONVERTED: 'Converted', NOT_INTERESTED: 'Not interested' },
      search: 'Search name, email or mobile',
      empty: 'No venue has registered interest yet.',
      statusUpdated: 'Status updated',
    },
  },
};
