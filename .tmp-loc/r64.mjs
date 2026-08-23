import { apply } from "./e.mjs";
apply("packages/host-pod-actions/src/labels.ts", [
  [
    "export type HostPodTranslate = (\n  key: string,\n  options?: { vars?: Record<string, string | number> },\n) => string;",
    "export type HostPodTranslate = (\n  key: string,\n  options?: { count?: number; vars?: Record<string, string | number> },\n) => string;",
  ],
]);
