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
     * duncit.com — the main marketing site's PAGES.
     *
     * The site's chrome already lives in `website.footer` / `website.nav`; this
     * is the editorial copy of each page under it. Long paragraphs are ONE key
     * each rather than a key per sentence: a translator needs the whole thought
     * to render it naturally, and splitting mid-paragraph is how word order
     * gets destroyed.
     *
     * Where a sentence contains a link, the sentence and the link's label are
     * separate keys — the same shape the newsletter consent line already uses.
     *
     * NOT here: the navigation and footer LINK labels (Website portal content),
     * hero image URLs, Font Awesome names, and helpline organisation names,
     * which are proper nouns.
     */
    main: {
      /**
       * The nav/footer FALLBACK labels.
       *
       * The Website portal's Navigation manager owns these links when it
       * answers; this is what renders when it does not. Rule 38 asks every
       * surface to ship a local fallback that reads correctly offline, so the
       * fallback is localized like any other — the portal's own labels still
       * win whenever they exist.
       */
      nav: {
        about: 'About',
        aboutUs: 'About us',
        newsroom: 'Newsroom',
        careers: 'Careers',
        contactUs: 'Contact us',
        community: 'Community',
        guidelines: 'Guidelines',
        blog: 'Blog',
        safetyHub: 'Safety Hub',
        ourApproach: 'Our approach',
        advice: 'Advice',
        safetyTools: 'Safety Tools',
        resources: 'Resources',
        support: 'Support',
        helpCenter: 'Help Center',
        faq: 'FAQ',
        emailSupport: 'Email support',
        menu: 'Menu',
        home: 'Home',
        contact: 'Contact',
      },
      layout: {
        siteDescription:
          'Duncit — the friendship platform that matches people by energy, not algorithms.',
      },
      home: {
        title: 'Duncit — Friends who match your energy',
        badge: 'Friendship, not algorithms',
        headingLine1: 'Find your people.',
        headingLine2Lead: 'Match your',
        headingLine2Accent: 'energy',
        intro:
          'Duncit is the friendship platform for real-life connections — built around what you actually love doing.',
        join: 'Join Duncit',
        signIn: 'Sign in',
        scroll: 'Scroll to explore',
        getApp: 'Get the app',
        // Rides the border of the hero banner on a loop.
        marquee:
          'Real people. Real energy.  Sports, live music, nightlife, the outdoors — see what happens when the right people match your energy.',
        earnEyebrow: 'Earn with Duncit',
        earnHeading: 'Turn gatherings into income',
        earnText:
          'Hosts, venues and sellers all earn from real local demand. Every path lives on Earn with Duncit — pick yours and start.',
        earnCta: 'Explore Earn with Duncit',
        earnStart: 'Start now',
        hostTitle: 'Host pods',
        hostText: 'Create pods, bring the right people together and earn from every gathering you run.',
        venueTitle: 'List your venue',
        venueText: 'Publish your space’s slots and get verified bookings from hosts near you.',
        sellTitle: 'Sell at gatherings',
        sellText: 'Bring your products to real meetups and reach buyers face to face.',
        vibesEyebrow: 'Real Energy',
        vibesNoBots: 'No bots.',
        vibesNoFakes: 'No fakes.',
        vibesJust: 'Just',
        vibesVibes: 'vibes.',
        vibesText:
          'Chatting effortless on Duncit. Discover what you share with new friends and dive right into laughs or real talk.',
        chipVerified: 'Verified people',
        chipMatched: 'Matched by energy',
        chipGatherings: 'Real gatherings',
        vibesImageAlt: 'Friends chatting',
        authentic: 'Authentic',
        flowHeadingLine1: 'Flow with the',
        flowHeadingLine2: 'moment',
        flowText:
          'Discover new friends without the pressure—see what you have in common, start fun or meaningful conversations, and connect naturally.',
      },
      notFound: {
        title: '404 — Lost in the Vibe | Duncit',
        lost: 'Lost?',
        offMap: 'Off the map',
        pageMissing: 'page missing',
        spookyEmpty: 'spooky empty',
        text: "This page took a wrong turn at the vibe check. Don't worry — the party is still on. Let's get you back home.",
        takeMeHome: 'Take me home',
        getHelp: 'Get help',
        tryAgain: 'Try again',
        weGotYou: 'We got you',
        tryOneOfThese: 'Try one of these',
        whereHeadingLead: 'Where do you want to',
        whereHeadingAccent: 'go?',
        homeText: 'The Duncit launch page',
        aboutText: "What we're building",
        communityText: 'Join the tribe',
        helpText: 'Find answers fast',
        contactText: 'Talk to a human',
        getAppTitle: 'Get the app',
        getAppText: 'Android & iOS',
      },
      appPhone: {
        alt: 'The Duncit app',
        tonight: 'Tonight',
        podsNearYou: '3 pods near you',
        podTitle: 'Sunset football, 6pm',
        podMeta: 'Turf 9 · 4 spots left',
        join: 'Join',
        chat1Name: 'Weekend crew',
        chat1Message: 'See you at 6! 🔥',
        chat2Name: 'Board game night',
        chat2Message: 'Anyone bringing snacks?',
      },
      network: {
        eyebrow: 'The Duncit network',
        heading: 'There is more than the app',
        text: 'Duncit is where people meet. These are the three ways to be on the other side of that.',
        earnEyebrow: 'For hosts, venues and clubs',
        earnTitle: 'Earn with Duncit',
        earnText:
          'Host pods, list your space or run a club — and get paid for the gatherings you make happen.',
        earnCta: 'See how much you could earn',
        adsEyebrow: 'For brands',
        adsTitle: 'Duncit Ads',
        adsText:
          'Put your brand in front of people who came out to do something. Nine placements, priced by the day.',
        adsCta: 'Price a campaign',
        partnersEyebrow: 'For partners',
        partnersTitle: 'Duncit Partners',
        partnersText:
          'Venues, e-commerce brands and clubs run their side of Duncit from the partner console.',
        partnersCta: 'Become a partner',
      },
      help: {
        title: 'Help Center',
        eyebrow: 'Support',
        heading: 'How can we help?',
        intro: "Browse topics or search for answers. Can't find it? Reach our team directly.",
        searchPlaceholder: 'Search help topics…',
        searchLabel: 'Search help topics',
        stillHeading: 'Still need help?',
        emailTitle: 'Email support',
        emailText: 'we usually reply within 24 hours.',
        callTitle: 'Call us',
        callText: 'for urgent safety issues.',
        formTitle: 'Contact form',
        formText: 'Send us a message — it lands straight with the team.',
        askTitle: 'Ask a question',
        askText: "Can't find it? Submit your question and we'll answer.",
        empty: 'No help topics published yet — reach us directly below.',
        error: 'Topics could not be loaded right now — reach us directly below.',
        general: 'General',
        questionOne: 'answered question',
        questionMany: 'answered questions',
      },
      careers: {
        title: 'Careers',
        eyebrow: "We're hiring",
        heading: 'Build Duncit with us',
        intro:
          'Join a small, mission-driven team building the friendship platform that matches people by energy.',
        whyHeading: 'Why Duncit?',
        why1Label: 'Real impact.',
        why1Text: 'Everything you ship goes straight into how people meet, host and earn together.',
        why2Label: 'Small team, big ownership.',
        why2Text: "You'll own whole surfaces — apps, portals, the platform itself.",
        why3Label: 'Energy over ego.',
        why3Text: 'The same vibe-first culture we build for our community, inside the team.',
        openHeading: 'Open roles',
        noRoleHeading: "Don't see your role?",
        noRoleText: 'We love hearing from talented people. Send us a note at',
        noRoleTextAfter: "and tell us what you'd build.",
      },
      contact: {
        title: 'Contact us',
        eyebrow: 'Say hi',
        heading: 'Get in touch',
        intro:
          "Questions, partnerships, press, or just a friendly hello — we'd love to hear from you.",
        emailUs: 'Email us',
        callUs: 'Call us',
        helpCenter: 'Help Center',
        helpCenterText: 'Browse answered topics',
        formHeading: 'Send us a message',
        namePlaceholder: 'Your name',
        emailPlaceholder: 'Your email',
        subjectPlaceholder: 'Subject (optional)',
        messagePlaceholder: "What's on your mind?",
        send: 'Send',
        sending: 'Sending',
        sent: 'Message sent!',
        failed: 'Could not send. Try again.',
        failedRetry: 'Could not send. Please try again.',
      },
      faq: {
        title: 'FAQ',
        eyebrow: 'Support',
        heading: 'Frequently Asked',
        intro: 'Quick answers to the questions we hear most.',
        askHeading: "Didn't find your answer?",
        askText: "Ask us directly — if it's a common one, we'll add it to this page.",
        questionPlaceholder: 'Type your question…',
        emailPlaceholder: 'Email for a reply',
        ask: 'Ask',
        orEmail: 'Or email',
        empty: "No FAQs published yet — ask your question below and we'll answer.",
        error: 'FAQs could not be loaded right now. Please try again later.',
        tooShort: 'Please type a longer question.',
        needEmail: 'Please enter your email.',
        sending: 'Sending',
        gotIt: 'Got it!',
        failed: 'Could not send. Try again.',
        failedRetry: 'Could not send. Please try again.',
      },
      policies: {
        title: 'Policy Hub',
        eyebrow: 'Policy Hub',
        heading: 'Duncit policies',
        intro:
          'Every policy that governs Duncit, published live from our Legal team — always the current version.',
        searchLabel: 'Search policies',
        searchPlaceholder: 'Search policies…',
        readCurrent: 'Read the current version',
        showAll: 'Show all policies',
        empty: 'No policies are published yet — check back soon.',
        error: 'Policies could not be loaded right now. Please try again later.',
        // The live filter, whose counts are assembled in the browser.
        matchOne: 'policy matches',
        matchMany: 'policies match',
        nothingMatches: 'Nothing matches',
      },
      policyRedirect: {
        moved: 'Policies moved to their own addresses.',
        seeAll: 'See all policies',
      },
      policyDetail: {
        // Stands in when a policy page is opened before its title is known.
        fallbackTitle: 'Policy',
        eyebrow: 'Policy Hub',
        intro: 'Published live from the Duncit Legal team.',
        notFound: 'This policy could not be found. It may have been renamed or retired.',
        empty: 'No content published yet.',
        error: 'The policy could not be loaded right now. Please try again later.',
      },
      blog: {
        title: 'Blog',
        eyebrow: 'Notes & stories',
        heading: 'The Duncit Blog',
        intro: 'Product updates, design notes, friendship research, and the occasional rant.',
        subscribe: 'Subscribe',
        subscribeText: 'Get one short email a week. No spam, just the good stuff.',
        joinList: 'Join the list →',
      },
      blogPost: {
        title: 'Blog',
        eyebrow: 'Duncit Blog',
        story: 'Story',
        intro: 'Stories, updates and energy from the Duncit community.',
        suggested: 'Suggested posts',
        related: 'Related posts',
        archive: 'Archive',
        notFound: 'This post could not be found. It may have been unpublished.',
        error: 'The post could not be loaded right now. Please try again later.',
      },
      newsroom: {
        title: 'Newsroom',
        eyebrow: 'Press & updates',
        heading: 'Duncit Newsroom',
        intro: 'The latest announcements, product news, and stories from the Duncit team.',
        latest: 'Latest stories',
        press: 'Press inquiries',
        pressText: 'For interviews, assets, or quotes, reach our team at',
        pressTextAfter: 'We aim to respond within 24 hours.',
      },
      contentList: {
        close: 'Close',
        fullName: 'Full name *',
        email: 'Email *',
        phone: 'Phone (digits, optional +)',
        resume: 'Resume / CV link (Drive, LinkedIn…)',
        portfolio: 'Portfolio link (optional)',
        why: 'Why you? (optional)',
        applyFor: 'Apply for',
        empty: 'No published items yet.',
        error: 'Content is temporarily unavailable.',
      },
      /** This site's words on the shared @duncit/brand download band. Same
       * shape as `website.partners.download` and `website.earn.download`. */
      download: {
        headingLead: 'One app,',
        headingAccent: 'many communities',
        text: 'Match with people by energy, then go and do the thing — real plans, real places, real people.',
        googlePlayEyebrow: 'Get it on',
        googlePlayName: 'Google Play',
        appStoreEyebrow: 'Download on the',
        appStoreName: 'App Store',
        perk1: 'Match by energy, in seconds',
        perk2: 'Real chats, no pressure',
        perk3: 'Verified profiles',
      },
      about: {
        title: 'About us',
        eyebrow: 'Our story',
        heading: 'About Duncit',
        intro: "We're building the friendliest place on the internet — where energy meets connection.",
        whyHeading: 'Why we exist',
        whyText:
          'Modern social apps are loud, lonely, and full of strangers performing for strangers. Duncit flips the script. We help you discover people who actually match your vibe — locally, instantly, and without the pressure of dating apps or the noise of mega platforms.',
        believeHeading: 'What we believe',
        believe1Label: 'Real over polished.',
        believe1Text: 'Authenticity beats algorithms.',
        believe2Label: 'Energy over ego.',
        believe2Text: 'The right vibe matters more than the right filter.',
        believe3Label: 'Safety first.',
        believe3Text: 'Always, no exceptions.',
        believe4Label: 'Joy is the metric.',
        believe4Text: "If you didn't smile today, we failed.",
        goingHeading: "Where we're going",
        goingText:
          "Duncit launches in 2026 with mobile-first apps for iOS and Android. We're starting small — a handful of cities — and scaling with the community, not at it. Want in early?",
        goingLink: 'Get the app',
        teamHeading: 'The team',
        teamText:
          'A tiny crew of designers, engineers, and community builders spread across three continents, united by one belief: friendship is a feature worth fighting for.',
      },
      community: {
        title: 'Community',
        eyebrow: 'Tribe vibes',
        heading: 'The Duncit Community',
        intro: 'A growing crew of vibe-seekers, builders, hosts, and friends-of-friends.',
        vibeHeading: "What's the vibe?",
        vibeText:
          'The Duncit community is welcoming, curious, and a little bit weird (in the best way). We celebrate the awkward small talk that becomes real friendship, the random meetups that turn into traditions, and the late-night DMs that change someone’s week.',
        plugHeading: 'Ways to plug in',
        plug1Label: 'Discord.',
        plug1Text: 'Hang out, share memes, and meet the team in real time.',
        plug2Label: 'Beta program.',
        plug2Text: 'Get early access and shape the app.',
        plug3Label: 'Local hosts.',
        plug3Text: "Run small meetups in your city — we'll help.",
        plug4Label: 'Creator collective.',
        plug4Text: 'If you make stuff and want to collaborate, hi.',
        getAppTitle: 'Get the app',
        getAppText: 'Match by energy on Android & iOS',
        sayHiTitle: 'Say hi',
        sayHiText: 'Hosts, creators & collaborators welcome',
        rulesHeading: 'Read the rules',
        rulesText: 'Before posting, please skim the',
        rulesLink: 'community guidelines',
        rulesTextAfter: "They're short and mostly common sense, but they keep the vibe right.",
      },
      guidelines: {
        title: 'Community Guidelines',
        eyebrow: 'House rules',
        heading: 'Community Guidelines',
        intro: 'Short, sweet, and meant to keep Duncit a place worth being.',
        rule1Heading: '1. Be kind',
        rule1Text:
          "Treat people the way you'd want to be treated on your worst Monday. Hate, harassment, or threats of any kind earn an instant exit.",
        rule2Heading: '2. Be real',
        rule2Text:
          'Use a real photo and a name people can call you. Catfishing, impersonation, and bots are removed on sight.',
        rule3Heading: '3. Keep it safe',
        rule3Text:
          'No nudity, no doxxing, no sharing private info without consent. If a chat feels off, hit the report button — a human will respond.',
        rule4Heading: "4. Don't sell, don't spam",
        rule4Text:
          "Duncit isn't a marketplace or an MLM funnel. Promo links and recruitment messages get filtered.",
        rule5Heading: '5. Respect privacy',
        rule5Text: "What's shared in chat stays in chat. Screenshots without permission are not the move.",
        rule6Heading: '6. Use the tools',
        rule6Text: "Block, mute, and report exist for a reason. Use them freely — and we'll back you up.",
        wrongHeading: 'If something goes wrong',
        wrongText: 'Reach out to',
        wrongTextAfter:
          'or use the in-app report flow. Our Trust & Safety team reviews every report, every time.',
      },
      safetyAdvice: {
        title: 'Safety Advice',
        eyebrow: 'Safety Hub',
        heading: 'Stay safe, stay you',
        intro: 'Practical tips for making the most of Duncit without compromising your safety.',
        beforeHeading: 'Before you connect',
        before1: "Use a recent photo and a name you're comfortable with.",
        before2: "Don't share your home address, workplace, or financial info.",
        before3: 'Trust your gut — if something feels off, it probably is.',
        meetHeading: 'Meeting up IRL',
        meet1: 'Pick a public place for first meets — a café, a park, a busy spot.',
        meet2: "Tell a friend where you're going and when you'll check in.",
        meet3: "Arrange your own transport. Don't rely on the other person.",
        meet4: 'Stay sober enough to leave whenever you want.',
        flagsHeading: 'Red flags',
        flag1: 'Someone asking for money, gifts, or financial help.',
        flag2: 'Pressure to move off Duncit to another platform too quickly.',
        flag3: 'Inconsistent stories or refusing to video chat.',
        flag4: 'Anyone making you uncomfortable — block, report, move on.',
        helpHeading: 'Need help?',
        helpText: 'Visit',
        helpLink: 'our resources page',
        helpTextAfter: 'for crisis hotlines, or email',
      },
      safetyApproach: {
        title: 'Our Safety Approach',
        eyebrow: 'Safety Hub',
        heading: 'Our approach to safety',
        intro: "Safety isn't a feature we bolted on — it's the foundation we built on.",
        principlesHeading: 'Our principles',
        principle1Label: 'Prevention over reaction.',
        principle1Text: 'Smart defaults, smart limits, smart matching.',
        principle2Label: 'Humans in the loop.',
        principle2Text: 'Every report goes to a real person, fast.',
        principle3Label: 'Transparency.',
        principle3Text: 'Clear rules, clear consequences, no shadow bans.',
        principle4Label: 'User control.',
        principle4Text: 'You decide who sees you, what you share, and when.',
        howHeading: 'How we do it',
        howText:
          'We combine machine learning for pattern detection with a 24/7 human review team trained in trauma-informed care. We partner with leading non-profits and report transparently every quarter.',
        readHeading: 'Read more',
        readAdvice: 'Safety advice for users',
        readTools: 'In-app safety tools',
        readResources: 'Crisis resources',
      },
      safetyTools: {
        title: 'Safety Tools',
        eyebrow: 'Safety Hub',
        heading: 'Tools to stay safe',
        intro: 'Every Duncit user gets these tools, free, from day one.',
        blockTitle: 'Block',
        blockText: "Instantly remove someone from your world. They won't know.",
        muteTitle: 'Mute',
        muteText: 'Silence notifications without blocking them.',
        reportTitle: 'Report',
        reportText: 'Send a flag to our T&S team. Reviewed within hours.',
        hideTitle: 'Hide profile',
        hideText: 'Pause discoverability without deleting your account.',
        verifyTitle: 'Photo verify',
        verifyText: "Optional selfie verification to prove you're you.",
        twoFactorTitle: 'Two-factor',
        twoFactorText: 'Lock your account with SMS or authenticator codes.',
        reportsHeading: 'How reports work',
        reportsText:
          'When you report, our team gets a notification immediately. Most reports are reviewed within a few hours. Serious reports (harassment, threats, illegal content) get priority and are actioned in under an hour, 24/7.',
      },
      safetyResources: {
        title: 'Crisis Resources',
        eyebrow: 'Safety Hub',
        heading: 'Help is here',
        intro: 'If you or someone you know is struggling, these free resources are available 24/7.',
        emergencyText: "If you're in immediate danger, call your local emergency number first.",
        helplinesHeading: 'Helplines',
        // Organisation names stay as they are — they are proper nouns, and a
        // translated helpline name is a helpline nobody can find.
        regionUs: 'United States',
        regionUk: 'United Kingdom',
        regionEu: 'EU',
        regionIndia: 'India',
        regionWorldwide: 'Worldwide',
        crisisTextLineContact: 'Text HOME to 741741',
        lifelineContact: 'Call or text 988',
        samaritansContact: 'Call 116 123 (free)',
        mheContact: 'mhe-sme.org/helplines',
        icallContact: '+91 9152987821 (Mon–Sat, 8a–10p)',
        findAHelplineContact: 'findahelpline.com',
        supportHeading: 'On-platform support',
        supportText: 'For Duncit-specific issues, contact',
        supportTextAfter: "We don't replace professional help, but we'll listen and act on what we can.",
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
