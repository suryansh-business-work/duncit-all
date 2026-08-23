import { apply } from "./e.mjs";

apply("packages/shell/src/staff-chat/EmojiPicker.tsx", [
  [
    "/** `titleKey` is a literal so the build gate can see it; `title` stays the\n *  stable English name the React key and the `:` search use. */\nconst GROUPS: Array<{ title: string; titleKey: string; emoji: string[] }> = [\n  {\n    title: 'Reactions',",
    "/** `titleKey` is a literal so the build gate can see it; `name` stays the\n *  stable English identifier the React key and the `:` search use — it is never\n *  rendered, so it is not copy. */\nconst GROUPS: Array<{ name: string; titleKey: string; emoji: string[] }> = [\n  {\n    name: 'Reactions',",
  ],
  ["    title: 'Faces',", "    name: 'Faces',"],
  ["    title: 'Work',", "    name: 'Work',"],
  ["<Box key={group.title}>", "<Box key={group.name}>"],
]);
