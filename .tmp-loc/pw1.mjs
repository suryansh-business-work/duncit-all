import { readFileSync, writeFileSync } from "node:fs";
import { apply } from "./e.mjs";

// Extra rows the components need beyond the first pass.
const block = readFileSync(".tmp-loc/partners-bundle.txt", "utf8")
  .split("\r\n")
  .join("\n")
  .replace(
    "        policyHub: 'Policy Hub',",
    "        policyHub: 'Policy Hub',\n        blurb: \"Real bookings for venues and hosts, backed by Duncit's trust layer.\",\n        newsletterText: 'New venue tools, payout changes and what is working for hosts.',\n        rights: '© {year} Duncit. All rights reserved.',\n        mainSite: 'duncit.com',\n        support: 'Support',",
  )
  .replace(
    "        appStoreName: 'App Store',",
    "        appStoreName: 'App Store',\n        perkBookings: 'Real bookings',\n        perkOps: 'Clean operations',\n        perkTrust: \"Duncit's trust layer\",",
  )
  .replace(
    "        text: 'Bookings, approvals and payouts follow you out of the office — the partner console is the same on a phone.',",
    "        text: 'Members book your venue and join your pods from the Duncit app on Android and iOS.',",
  );

apply("packages/i18n/src/bundles/website.ts", [
  ["    /**\n     * ads.duncit.com", block + "    /**\n     * ads.duncit.com"],
]);
