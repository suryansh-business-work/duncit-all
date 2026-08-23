import { readFileSync } from "node:fs";
import { apply } from "./e.mjs";
const block = readFileSync(".tmp-loc/ads-bundle.txt", "utf8").split("\r\n").join("\n");
const anchor = "    /**\n     * The shared Astro chrome in @duncit/brand";
apply("packages/i18n/src/bundles/website.ts", [[anchor, block + anchor]]);
