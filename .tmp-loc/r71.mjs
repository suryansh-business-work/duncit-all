import { apply } from "./e.mjs";

apply("packages/host-pod-actions/src/index.ts", [["  podEditSchema,", "  buildPodEditSchema,"]]);

apply("packages/host-pod-actions/src/PodEditDialog.tsx", [
  ["  podEditSchema,", "  buildPodEditSchema,"],
  ["    resolver: zodResolver(podEditSchema),", "    resolver: zodResolver(buildPodEditSchema(labels)),"],
]);
