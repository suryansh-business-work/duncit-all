# Occasion icons (bundled)

One folder per occasion **slug**, each containing `icon.png`. The folder name
must match the `slug` set in Admin → Branding → Occasional icons *exactly*
(lowercase, hyphenated) — the server lowercases and trims slugs on save so the
two always line up.

```
assets/occasions/<slug>/icon.png
```

The native app prefers this bundled copy over the admin's `icon_url`, so the
festive icon appears instantly with no network round-trip and works offline.

## Adding an occasion

1. Drop `assets/occasions/<slug>/icon.png` here.
2. Register it in `src/assets/occasion-icons.ts` — Metro **cannot** resolve a
   dynamic `require(\`./\${slug}/icon.png\`)`, so the map has to be static. A
   `require` of a missing file is a Metro bundling error, which means a typo in
   the map fails the build rather than shipping a broken icon.
3. Create the matching window in Admin → Branding → Occasional icons.

An occasion configured in Admin but missing here still works — the app falls
back to the admin's `icon_url`.

The placeholder art currently checked in is the Duncit logo; replace each with
the real festive artwork.
