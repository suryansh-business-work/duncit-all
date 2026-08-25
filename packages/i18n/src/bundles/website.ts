import type { NestedCatalogue } from '../catalogue';

/**
 * The marketing websites' own chrome. Navigation and footer LINK labels are
 * not here — those are content from the Website portal's Navigation manager,
 * and duplicating them as translation keys would give the same text two
 * owners.
 */
export const WEBSITE_BUNDLE: NestedCatalogue = {
  website: {
    footer: {
      newsletterTitle: 'Get Duncit updates',
      emailPlaceholder: 'Email address',
      notify: 'Notify',
      sending: 'Sending',
      subscribed: 'Subscribed!',
      tryAgain: 'Try again',
      policyHub: 'Policy Hub',
      allPolicies: 'All policies',
      rights: 'All Rights Reserved',
      // The social column's heading. The link labels beneath it are brand
      // names (Instagram, Facebook…) and stay untranslated by design.
      followUs: 'Follow Duncit',
    },
    nav: {
      closeMenu: 'Close menu',
      theme: 'Switch between light and dark',
      menu: 'Menu',
    },

    /**
     * partners.duncit.com — the venue-and-host marketing site.
     *
     * Its own section, not the Partners CONSOLE's `partners.*` namespace: this
     * is what convinces somebody to apply, that is what they read once they
     * have.
     */
    partners: {
      brand: {
        word: 'Partners',
        title: 'Duncit Partners — Host and venue growth',
        description: 'Duncit Partners helps hosts and venues create real social moments.',
        footerName: 'Duncit Partners',
      },
      nav: {
        how: 'How it works',
        listVenue: 'List your venue',
        becomeHost: 'Become a host',
        getApp: 'Get the app',
        login: 'Partner login',
        join: 'Become a partner',
        brandAria: 'Duncit',
      },
      hero: {
        badge: 'For venues & hosts',
        heading: 'Fill the room. Host the moment.',
        text: "A focused partner entry point for venues and hosts who want real groups, clean operations, and Duncit's trust layer behind every plan.",
        venueCta: 'Register your venue',
        hostCta: 'Be a host',
        imageAlt: 'Venue partners planning an event',
        cardBadge: 'Launch partners',
        cardImageAlt: 'Partners reviewing bookings',
      },
      /** The three cards under the hero, and the numbers beside them. */
      ways: {
        eyebrow: 'One partner funnel',
        heading: 'Two ways into the same growth engine.',
        text: 'Way of Earnings with Duncit: register your venue so Duncit can bring you party bookings, or become a host and earn by creating memorable gatherings.',
        venueTitle: 'Register your venue',
        venueText:
          'Host the party at your venue. Duncit brings verified bookings and helps fill your empty slots.',
        hostTitle: 'Be a Host',
        hostText:
          'Become a Duncit host, create real moments, and earn from curated community experiences.',
        earningsTitle: 'Track earnings',
        earningsText:
          'Applications, approvals, bookings, and earning readiness live in one responsive partner console.',
        statReview: 'review target',
        statFee: 'launch-period platform fee',
        statPaths: 'partner paths',
      },
      /** The shared app-download band, in this site's words. */
      download: {
        heading: 'Your partners,',
        headingAccent: 'in their pocket',
        text: 'Members book your venue and join your pods from the Duncit app on Android and iOS.',
        googlePlayEyebrow: 'Get it on',
        googlePlayName: 'Google Play',
        appStoreEyebrow: 'Download on the',
        appStoreName: 'App Store',
        perkBookings: 'Real bookings',
        perkOps: 'Clean operations',
        perkTrust: "Duncit's trust layer",
      },
      footer: {
        duncitGroup: 'Duncit',
        newsletterHeading: 'Partner updates',
        policyHub: 'Policy Hub',
        blurb: "Real bookings for venues and hosts, backed by Duncit's trust layer.",
        newsletterText: 'New venue tools, payout changes and what is working for hosts.',
        rights: '© {year} Duncit. All rights reserved.',
        mainSite: 'duncit.com',
        support: 'Support',
      },
    },
    /**
     * ads.duncit.com — the advertiser's marketing site.
     *
     * Its own section rather than the Ads PORTAL's `ads.*` namespace: the
     * portal's copy is what an advertiser reads after signing in, this is what
     * convinces them to. The two are read by different people and change for
     * different reasons.
     */
    ads: {
      brand: {
        name: 'Duncit Ads',
        title: 'Duncit Ads — advertise where your audience actually shows up',
        description:
          'Put your brand in front of people who came out to do something. Pick your placements, pick your days, see the price before you sign in.',
      },
      nav: {
        placements: 'Placements',
        pricing: 'Pricing',
        design: 'We design your ads',
        how: 'How it works',
        why: 'Why Duncit',
        login: 'Sign in',
        signup: 'Start advertising',
      },
      hero: {
        eyebrow: 'Duncit Ads',
        heading: 'Reach the crowd that already showed up.',
        subheading:
          'Duncit is where people book the evening they are actually going to. Put your brand in that moment — on the home feed, in stories, beside the pod they just joined.',
        primaryCta: 'Start advertising',
        secondaryCta: 'See what it costs',
        imageAlt: 'A brand team planning a campaign',
      },
      /** Numbers that describe the network, not any one campaign. */
      proof: {
        placementsLabel: 'placements',
        placementsHint: 'From the home feed to pod detail pages.',
        daysLabel: 'days max',
        daysHint: 'Book a day or a month — you choose.',
        liveLabel: 'to go live',
        liveHint: 'Once Marketing approves your creative.',
      },
      features: {
        heading: 'Everything you need to run ads',
        text: 'One console for the full campaign lifecycle.',
        campaignsTitle: 'Campaigns',
        campaignsText: 'Create, schedule and manage ad campaigns across every placement.',
        creativesTitle: 'Creatives',
        creativesText: 'Upload image or video creatives and swap them without re-booking.',
        performanceTitle: 'Performance',
        performanceText: 'Track impressions, clicks and spend while the campaign is running.',
        audiencesTitle: 'Audiences',
        audiencesText: 'Target the placement your audience is already looking at.',
      },
      placements: {
        eyebrow: 'Where your ad lives',
        heading: 'Nine places to be seen',
        text: 'Every placement is priced per day and bookable on its own. The prices below are the live rate card — the same one the Ads console quotes.',
        rateCardCaption: 'Duncit advertising rate card, per placement per day',
        /** Copy for the placements the rate card returns. A placement with no
         * note still renders — the server owns the list, this only enriches it. */
        auto: 'Rotates through every placement below.',
        homeBottom: 'The feed everyone opens the app on.',
        sidebar: 'Alongside browsing, on every screen.',
        exploreScroll: 'In the scroll where people are looking for something to do.',
        status: 'Full-screen, between the stories people are already watching.',
        venueList: 'While they are choosing where to go.',
        clubList: 'While they are choosing who to go with.',
        podList: 'While they are choosing what to do.',
        podDetails: 'On the page where they decide to book.',
      },
      /** The phone mock beside the rate card, labelled zone by zone. */
      preview: {
        stories: 'Stories',
        exploreScroll: 'Explore scroll',
        podListings: 'Pod listings',
        venueListings: 'Venue listings',
        clubListings: 'Club listings',
        podDetails: 'Pod details',
        sidebar: 'Sidebar',
        homeFeed: 'Home feed',
        caption: 'Tick a placement to see where it lands.',
      },
      /**
       * Creative services. The most common reason a small brand never books an
       * ad is that it has nothing to run — so this answers that before the
       * price does.
       */
      design: {
        eyebrow: 'No creative? No problem',
        heading: 'We design your ads',
        text: 'Send us your logo, a photo and what you want to say. Our team builds the creative to the exact size each placement needs — image or video — and you approve it before anything goes live.',
        imageAlt: 'A designer working on an ad creative',
        builtTitle: 'Built to the placement',
        builtText: 'Every slot has its own size and safe area. We cut for the ones you booked.',
        formatTitle: 'Image or video',
        formatText:
          'A still for the feed, a short vertical for stories — whatever the placement takes.',
        roundsTitle: 'Two rounds of changes',
        roundsText: 'You see it before it runs, and you say what to change.',
        swapTitle: 'Swap it mid-campaign',
        swapText: 'A new creative on a running campaign, without re-booking the slot.',
        cta: 'Ask for a creative',
        note: 'Design is quoted separately with your campaign — tell us what you need when you submit it.',
      },
      calculator: {
        eyebrow: 'What it costs',
        heading: 'Price your campaign before you sign up',
        text: 'Tick the placements you want and choose how long to run. These are live rates from Duncit — not a brochure figure.',
        placementsLabel: 'Placements',
        placementsHint: 'Pick as many as you like. Each one is booked and billed on its own.',
        daysLabel: 'How many days',
        daysHint: 'The same window applies to every placement you picked.',
        totalLabel: 'Campaign total',
        perDaySuffix: '/day',
        emptyNote: 'Pick at least one placement to see a price.',
        note: 'Live rates, straight from Duncit. The final cost is confirmed when Marketing approves your creative.',
        failedNote:
          'The rate card could not be loaded right now. The prices come from Duncit itself, so nothing is shown rather than a guess — please try again shortly.',
        disclaimer:
          'This is an estimate at today’s published rates. Rates can change, and the cost is frozen at the figure quoted when your campaign is approved.',
        cta: 'Book this campaign',
      },
      steps: {
        eyebrow: 'How it works',
        heading: 'Four steps to live',
        accountTitle: 'Create an account',
        accountText: 'Sign in to the Ads console — no sales call, no minimum spend.',
        creativeTitle: 'Upload your creative',
        creativeText: 'An image or a video, a headline, and where the tap should go.',
        bookTitle: 'Pick placement and dates',
        bookText: 'The console quotes the same price you saw here.',
        liveTitle: 'Go live',
        liveText: 'Marketing reviews it, and your ad starts on the day you chose.',
      },
      why: {
        heading: 'Why advertise on Duncit',
        text: 'Not another feed of strangers scrolling. People on Duncit are deciding what to do this weekend — and paying for it.',
        intent: 'An audience with intent, not just impressions',
        pricing: 'Per-day pricing with no minimum spend',
        placements: 'Nine placements, bookable one at a time',
        speed: 'Live within a day of approval',
        metrics: 'Impressions and clicks while it runs',
        stop: 'Stop a campaign early, whenever you want',
      },
      cta: {
        heading: 'Ready to launch your first campaign?',
        text: 'Sign in to the Ads console and go live in minutes.',
        button: 'Get started',
      },
      newsletter: {
        heading: 'What is working on Duncit',
        text: 'Which placements are performing, and what advertisers are doing with them.',
        /**
         * Consent is taken before the address is sent, not assumed from typing
         * one in — and it names what is being agreed to.
         */
        consent: 'I agree to receive emails from Duncit and accept the',
      },
      footer: {
        tagline: 'Advertising for the Duncit network.',
        rights: '© {year} Duncit. All rights reserved.',
        note: 'Advertising on the Duncit network.',
        advertiseGroup: 'Advertise',
        adsConsole: 'Ads console',
        duncitGroup: 'Duncit',
        duncit: 'Duncit',
        earnWithDuncit: 'Earn with Duncit',
        support: 'Support',
      },
      notFound: {
        heading: 'This page wandered off.',
        text: 'The page you’re looking for doesn’t exist or has moved.',
      },
      /** The shared app-download band, in this site's words. */
      download: {
        heading: 'Your audience',
        headingAccent: 'lives in the app',
        text: 'Every placement you book runs here — the feed people open when they are deciding what to do.',
        perkPlacements: 'Nine placements',
        perkSpeed: 'Live within a day',
        perkMetrics: 'Impressions and clicks',
        googlePlayEyebrow: 'Get it on',
        googlePlayName: 'Google Play',
        appStoreEyebrow: 'Download on the',
        appStoreName: 'App Store',
      },
      header: {
        wordmarkAds: 'Ads',
        themeToggle: 'Switch between light and dark',
      },
    },
    /**
     * earnwith.duncit.com — the "Earn with Duncit" marketing site.
     *
     * Its own section beside `partners` and `ads`, for the same reason: this is
     * what persuades somebody to start earning, not what they read once they
     * have. The four paths deep-link into the app's survey gates, so these
     * titles and the Earn screen's must say the same thing.
     *
     * NOT here, on purpose: the Font Awesome `icon` names, the role `key` /
     * `field` / `rows` identifiers the calculator reads off the server's
     * waterfall, the PDF file name, the `₹` symbol, and the social account
     * names — none of them is copy a translator has anything to do with.
     */
    earn: {
      brand: {
        name: 'Earn with Duncit',
        title: 'Earn with Duncit — host, list your venue, run a club or sell your brand',
        description:
          'Turn your network into income on Duncit. Host experiences, list your venue, manage a club or put your brand in front of engaged communities.',
      },
      nav: {
        aboutUs: 'About Us',
        howItWorks: 'How It Works',
        earnWithDuncit: 'Earn With Duncit',
        resources: 'Resources',
        blog: 'Blog',
        login: 'Log In',
        signup: 'Sign Up',
      },
      hero: {
        eyebrow: 'Earn With Duncit',
        heading: 'Turn Your Network Into Income',
        paragraph1: 'Join a community of hosts, venues, clubs and brands earning together.',
        paragraph2: 'Create experiences. Build connections. Earn on your terms.',
        primaryCta: 'Start Earning',
        secondaryCta: 'Explore Opportunities',
        imageAlt: 'People meeting over drinks at a Duncit pod',
        // Rides the 3D band under the banner, scrolling past on a loop.
        ribbon1: 'Build Communities',
        ribbon2: 'Create Experiences',
        ribbon3: 'Earn Together',
        ribbon4: 'Grow Your Business',
        ribbon5: 'Repeat',
      },
      paths: {
        // The section's own heading. `headingLead` + `headingAccent` are one
        // sentence split so the accent word can be coloured — a translator may
        // need to reorder them, which is why neither half is a fragment.
        sectionEyebrow: 'Earn with Duncit',
        sectionHeadingLead: 'Four Ways To',
        sectionHeadingAccent: 'Earn',
        venueTitle: 'Register Your Venue',
        venueText: 'List your venue, manage your availability and receive booking requests from hosts.',
        venueImageAlt: 'A venue courtyard set up for an event',
        venueCta: 'Become Venue Partner',
        hostTitle: 'Become a Host',
        hostText: 'Host events, workshops, sports meets or parties and earn from every booking.',
        hostImageAlt: 'A host welcoming guests',
        hostCta: 'Become Host',
        clubTitle: 'Club Admin',
        clubText: 'Build and manage your club or community and earn through memberships and events.',
        clubImageAlt: 'A club admin working on a laptop',
        clubCta: 'Become Club Admin',
        brandTitle: 'List Your Brand',
        brandText: 'Promote your brand, sponsor events and connect with highly engaged communities.',
        brandImageAlt: 'A brand owner at their store',
        brandCta: 'Partner With Us',
      },
      why: {
        eyebrow: 'Why choose Duncit?',
        item1: 'Easy & Free To Get Started',
        item2: 'Direct Payments',
        item3: 'Trusted Community',
        item4: 'Smart Matching',
        item5: 'Marketing Support',
      },
      steps: {
        eyebrow: 'How it works',
        heading: 'Start Earning in 5 Simple Steps',
        registerTitle: 'Register',
        registerText: 'Create your free Duncit account.',
        verificationTitle: 'Verification',
        verificationText: 'Submit details and get verified.',
        approvedTitle: 'Get Approved',
        approvedText: 'We review and approve your profile.',
        bookingsTitle: 'Receive Bookings',
        bookingsText: 'Get booking requests from real users.',
        earnTitle: 'Earn',
        earnText: 'Provide great experiences and earn every month.',
      },
      calculator: {
        eyebrow: 'Estimate your earnings',
        heading: 'What would a pod pay you?',
        text: 'Move the sliders and see what reaches you after GST, the platform fee and what the venue charges. Your own seat is free, so a pod bills every spot but yours.',
        rowGross: 'Tickets collected a month',
        rowGst: 'GST',
        rowPlatform: 'Platform fee',
        rowVenue: 'Venue charges',
        rowClubAdmin: 'Club admin share',
        rowHostCommission: 'Duncit host commission',
        rowPerPod: 'Your share, per pod',
        rowPods: 'Pods a month',
        hostLabel: 'As a host',
        // The role named on its own, for the PDF heading. A separate key, NOT
        // the tab label with "As " stripped off — that strip is English grammar
        // and does nothing in a translated build.
        hostName: 'a host',
        hostTakeHome: 'A host takes home a month',
        hostDutiesTitle: 'What a host does',
        hostDuty1: 'Bring the people together and fill the pod',
        hostDuty2: 'Plan the pod and keep the experience good',
        hostDuty3: 'Be there on the day and host it properly',
        hostDuty4: 'Settle the venue and keep the details honest',
        clubAdminLabel: 'As a club admin',
        clubAdminName: 'a club admin',
        clubAdminTakeHome: 'A club admin takes home a month',
        clubAdminDutiesTitle: 'What a club admin does',
        clubAdminDuty1: 'Manage the club and grow its members',
        clubAdminDuty2: 'Manage the hosts and the pods they run',
        clubAdminDuty3: 'Be the one point of support for the club',
        note: 'An estimate at standard rates. Your own rate, and a venue’s own price, are set when you create the pod.',
        pdfButton: 'Download PDF',
        pdfPreparing: 'Preparing…',
        pdfError: 'The PDF could not be prepared right now — please try again.',
        pdfTitle: 'Earnings estimate',
        pdfInputsTitle: 'What this assumes',
        pdfBreakdownTitle: 'Where the money goes',
        pdfFooter: 'Estimated on duncit.com — figures come from Duncit at standard rates.',
        shortfallNote:
          'At this ticket price the pod does not cover its costs — raise the price, add spots, or find a cheaper slot.',
        noShareNote:
          'Duncit has not published a standard club-admin share yet, so there is nothing to estimate here. Your club’s share is agreed with Duncit when the club is set up.',
        disclaimer:
          'This calculation is an estimate. The real number can vary with the rate agreed for your account, the venue’s own price, how many spots actually sell, refunds and taxes.',
        ticketLabel: 'Average ticket price per spot',
        ticketHint: 'What each guest pays.',
        spotsLabel: 'Average total spots',
        spotsHint: 'Including your own seat, which is free.',
        venueLabel: 'Average venue charge',
        venueHint: 'What the venue bills for the slot.',
        podsLabel: 'Pods a month',
        podsHint: 'Both sides earn per pod, so the month is that many times over.',
        // Names the host / club-admin tab strip for a screen reader.
        rolesAriaLabel: 'Whose earnings',
      },
      screenshots: {
        eyebrow: 'Inside Duncit',
        heading: 'What earning looks like',
        text: 'Your bookings, your payouts and what each pod made — the screens you will actually live in.',
      },
      newsletter: {
        heading: 'Earning tips',
        text: 'What is working for hosts, venues and clubs on Duncit.',
        placeholder: 'you@example.com',
        button: 'Subscribe',
        consent: 'I agree to receive emails from Duncit and accept the',
        consentLinkLabel: 'privacy policy',
      },
      platform: {
        // Three parts of ONE sentence — "India's Community Earning Platform" —
        // split because the middle word is coloured and the tail is on its own
        // line. Kept as whole words, not fragments, so a translator can reorder.
        headingLead: "India's",
        headingAccent: 'Community',
        headingTail: 'Earning Platform',
        text: 'Duncit helps people, venues, clubs and brands come together and grow together.',
        button: 'Join Duncit Today',
        imageAlt: 'Friends looking at the Duncit app together',
      },
      /** The shared @duncit/brand download band, in this site's words. Same
       * shape as `website.partners.download` — the store names are keyed there
       * too, so the two bands stay one convention. */
      download: {
        heading: 'Run your pods',
        headingAccent: 'from your pocket',
        text: 'Create a pod, fill it, check people in and watch the money land — all from the app.',
        googlePlayEyebrow: 'Get it on',
        googlePlayName: 'Google Play',
        appStoreEyebrow: 'Download on the',
        appStoreName: 'App Store',
        perk1: 'Create and fill pods',
        perk2: 'Check guests in',
        perk3: 'Track your earnings',
      },
      footer: {
        tagline: 'Building communities. Creating opportunities. Earning together.',
        rights: 'All rights reserved.',
        builtFor: 'Built for communities in India.',
        groupProduct: 'Product',
        groupCommunity: 'Community',
        groupSupport: 'Support',
        groupCompany: 'Company',
        earnWithUs: 'Earn With Us',
        howItWorks: 'How It Works',
        earningsEstimator: 'Earnings estimator',
        resources: 'Resources',
        blog: 'Blog',
        forHosts: 'For Hosts',
        forVenues: 'For Venues',
        forClubs: 'For Clubs',
        forBrands: 'For Brands',
        community: 'Community',
        helpCenter: 'Help Center',
        contactUs: 'Contact Us',
        faq: 'FAQ',
        safety: 'Safety',
        guidelines: 'Guidelines',
        aboutUs: 'About Us',
        careers: 'Careers',
        newsroom: 'Newsroom',
        login: 'Log In',
        signup: 'Sign Up',
      },
      notFound: {
        title: 'Page not found',
        heading: 'This page wandered off.',
        text: 'The page you’re looking for doesn’t exist or has moved.',
        cta: 'Back home',
      },
    },
    /**
     * The shared Astro chrome in @duncit/brand, rendered by all four sites.
     *
     * Account names in the social row are NOT here: Instagram and LinkedIn are
     * proper nouns, and a translator has nothing to do with them.
     */
    brand: {
      /**
       * The illustrated phone on the marketing heroes.
       *
       * It draws the app's own layout rather than a screenshot, so the sample
       * pod and the sample chat are copy a visitor reads — in a Hindi build
       * they should be Hindi, like everything around them.
       */
      appPhone: {
        alt: 'The Duncit app',
        tonight: 'Tonight',
        nearYou: '3 pods near you',
        podTitle: 'Sunset football, 6pm',
        podMeta: 'Turf 9 · 4 spots left',
        join: 'Join',
        chatOne: 'Weekend crew',
        chatOneMessage: 'See you at 6! 🔥',
        chatTwo: 'Board game night',
        chatTwoMessage: 'Anyone bringing snacks?',
      },
      newsletter: {
        placeholder: 'you@example.com',
        button: 'Subscribe',
        consentLink: 'privacy policy',
        busy: 'Subscribing…',
        ok: 'You are on the list.',
        error: 'That did not go through — check your connection and try again.',
      },
      policyStrip: {
        heading: 'Policies',
      },
    },
  },
};
