import { apply } from "./e.mjs";

// The data helpers only need the endpoint, not the copy — and pulling the
// translator in here would make every fetch wait on the catalogue.
apply("website/ads-website/src/lib/site-data.ts", [
  [
    "import { siteContent } from '../config/site-config';\n\nconst siteConfig = await siteContent();\n",
    "import { siteUrls } from '../config/site-config';\n",
  ],
  ["      const res = await fetch(siteConfig.graphqlUrl, {", "      const res = await fetch(siteUrls.graphqlUrl, {"],
]);

// The attribution snippet runs in the BROWSER: it must not import the
// build-time translator, only the endpoint.
apply("website/ads-website/src/layouts/Layout.astro", [
  [
    "    import { siteContent } from '../config/site-config';\n\nconst siteConfig = await siteContent();\n    captureShortLinkAttribution({",
    "    import { siteUrls } from '../config/site-config';\n    captureShortLinkAttribution({",
  ],
  ["      serverUrl: siteConfig.graphqlUrl.replace('/graphql', ''),", "      serverUrl: siteUrls.graphqlUrl.replace('/graphql', ''),"],
  [
    "import { siteContent } from '../config/site-config';\n\nconst siteConfig = await siteContent();\nimport { fetchBranding } from '../lib/site-data';\nimport '../styles/global.css';\n\nconst { title, description = siteConfig.brand.description } = Astro.props;",
    "import { siteContent } from '../config/site-config';\nimport { fetchBranding } from '../lib/site-data';\nimport '../styles/global.css';\n\nconst siteConfig = await siteContent();\nconst { title, description = siteConfig.brand.description } = Astro.props;",
  ],
]);
