# 002 – Paper-cutout avatar

Status: **ready** · created 2026-10-26

## Goal

The girl the child walks with is the last hand-written SVG in the zoo (task 001 turned props,
plants, icons and the ground into paper cutouts). Bring her into the same style.

## Current state

- SVG rig in `src/zoo/art/avatar.ts`: parts rotating around pivots (`game/rig.ts`), walk cycle,
  arm raise for feeding and watering in `game/player.ts`. Held items (`fx:can`, food) are already
  pictures and sit in the front arm's container.
- Hair, outfit and skin colours are chosen per profile in `ProfileEditor` and stored as
  `avatar: { hair, outfit, skin }`. `Avatar` previews in the UI use `rigPreview` (`ui/bits.tsx`).

## Decision needed first (ask the parent, do not guess)

In task 001 the parent chose to keep the SVG avatar for now. The options were:

- a) a set of ~6 generated girls (different hair and outfits) to pick from in the profile editor
  instead of colour swatches; best quality, simplest; animated like the animals (hop/lean walk,
  a small jump or lean instead of the arm raise when feeding/watering). Existing profiles need a
  migration that maps `{ hair, outfit, skin }` to the closest variant.
- b) keep colour customisation by generating separate layers (hair, outfit, skin) in neutral grey
  and tinting them in Phaser; much more work, fragile.

## Done when

- The avatar matches the paper-cutout style at default, fully zoomed-out and zoomed-in views.
- Profile editor, home screen and profile list show the new avatar.
- Walking, feeding and watering still read clearly; old profiles load without losing anything.
- Pictures are listed in `docs/art-pipeline.md`; `npm run build` passes; changes committed.
