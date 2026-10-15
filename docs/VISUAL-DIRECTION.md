# Atelier 02 — Visual direction

The first implementation established functional state and UI controls, but its flat materials, distant overhead camera and sparse block geometry did not meet the user's Casa Serra reference. This revision improves the actual interactive scene, rather than placing a rendered image over it.

## Implemented in this revision
- Interior-height opening camera, smooth transitions to walkthrough, orbit and overhead plan.
- Original seeded wood, stone, plaster and linen maps; surface relief and roughness.
- Warm environment lighting, window shadows, selectable day / golden-hour / evening illumination.
- Real glazed openings, terrace planting, ceiling and concealed-light details.
- Hollow cupboard carcasses with animated hinged fronts and drawers, waterfall island, layered appliances, detailed stools, vessels and plants.
- Bathroom with curved hollow bathtub, floating vanity, reflective circular mirrors and glazed shower.
- Calmer editorial interface with a presentation mode; existing save/import/export/moodboard-reference controls retained.

## Boundaries
This is still an original procedural architectural concept, not a photorealistic model or the complete Casa Serra experience. It does not reproduce that source code or its assets. There is no floor-plan-to-building scroll narrative, whole-house navigation, arbitrary AI geometry generation or automatic moodboard interpretation yet. Palette buttons are curated presets. Uploaded moodboards remain local visual references. Dimensions are conceptual and not compliance-certified.

## Validation
Run `npm test`, `npm run build`, and `npx playwright test`. Browser tests capture actual kitchen, bathroom, evening, model and mobile screenshots. `STUDIO_URL` can target the published app for the same tests. No paid service or secret is needed.
