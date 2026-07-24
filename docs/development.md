# development

## requirements

A modern browser is the only runtime dependency. The game uses:

- Canvas 2D
- Web Audio
- `requestAnimationFrame`
- Pointer events
- `localStorage`
- Optional `crypto.randomUUID`

There is no package manifest, dependency installation, transpilation, bundling, or build output.

## run locally

The fastest option is to open `index.html` directly. A local server gives the project a stable HTTP origin and behaves more like GitHub Pages:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/`.

Browser storage is isolated by origin. Changing between a `file:` URL, `localhost`, a different port, and GitHub Pages creates separate save locations.

## source map

### `index.html`

Contains all static UI structure:

- Main and minimap canvases
- Location, vitals, weapon, threat, and quick-action HUD
- Interaction prompt and toast stack
- Inventory, item inspector, crafting, and container overlays
- Start, guide, and death screens
- Touch controls

The JavaScript builds a `dom` object from every element with an `id`. Treat those IDs as an interface with `game.js`.

### `styles.css`

Defines the color tokens, HUD panels, menus, inventory and crafting components, start/death screens, responsive behavior, touch controls, and animations.

The responsive layers are:

- Default desktop layout
- Layout adjustments below 900 px
- Compact/coarse-pointer mode below 620 px or on touch-oriented devices

### `game.js`

The file is ordered by responsibility:

1. Constants and content data
2. Math, hashing, identity, escaping, and collision helpers
3. `Sound`
4. `Inventory`
5. `World`
6. `Game`
7. Runtime construction and debug exports

See [`architecture.md`](architecture.md) for system ownership and lifecycle details.

## common content changes

### add an item

1. Add a unique entry to `item_catalog`.
2. Set its `category`, numeric `stats`, `tags`, and `description`.
3. Add `slot` for wearable equipment or `ammo_type` for a firearm.
4. Add the item name to one or more `loot_tables`, unless it should only be created another way.
5. Check the inventory card, inspector action, equipment behavior, crafting category, weight, and save/restore.

Catalog names are used as component history and loot-table keys. Renaming one can affect generated content and compatibility assumptions.

### add a district

1. Add its data to `districts`, including a unique key and threat multiplier.
2. Return that key from `World.district()`.
3. Define its building mix in `World.building_types()`.
4. Confirm `World.make_buildings()` chooses the intended lot layout.
5. Validate exterior colors, minimap colors, infected density, and the HUD name.

### add a building type

Update all content and behavior that switches on building type:

- `building_names`
- `World.building_types()`
- Floor and basement rules in `World.make_buildings()`
- Interior dimensions and wall layout in `World.interior()`
- Container selection in `World.container_kind()`
- Loot context in `World.loot_table()`
- Exterior color in `Game.draw_building()`
- Interior color and furniture behavior in `Game.draw_interior()`

Generated identity and order matter. Inserting or reordering generation steps can change existing deterministic worlds.

### add or rename UI

1. Add the element to `index.html`.
2. Give it an `id` if JavaScript needs direct access.
3. Add responsive styling for both narrow screens and coarse pointers when appropriate.
4. Update every `dom.*` reference if an existing ID changes.
5. Test keyboard, mouse, and touch interactions.

Runtime text interpolated into `innerHTML` must pass through `safe()`.

## debug and test surface

Open browser developer tools while the game is running.

The live game is available as:

```js
city_of_nothing
```

Inspect core content data:

```js
city_of_nothing_test.districts
city_of_nothing_test.item_catalog
city_of_nothing_test.loot_tables
```

Create and combine isolated item records:

```js
const hammer = city_of_nothing_test.make_item("hammer");
const nails = city_of_nothing_test.make_item("nails");
city_of_nothing_test.combine_items(hammer, nails, true);
```

Inspect the current save without changing it:

```js
JSON.parse(localStorage.getItem("city_of_nothing_save_v1"));
```

Delete the current origin's save:

```js
localStorage.removeItem("city_of_nothing_save_v1");
```

Reload after deleting it to refresh the **continue** button state.

## save compatibility

The save object currently declares version 1, but there is no migration layer yet. When changing saved structures:

1. Keep reads tolerant of absent old fields.
2. Preserve stable generated IDs when possible.
3. Validate equipment IDs after inventory changes.
4. Avoid assuming every saved item still exists in `item_catalog`; saved items are full records.
5. Add an explicit migration before changing the meaning of an existing field.
6. Increment the version or storage key only with a deliberate compatibility plan.

The `killed` list is truncated to the most recent 4,000 IDs when serialized. Consider that cap when changing world scale or persistence expectations.

## validation checklist

There is no automated test suite in the repository yet. Before merging a change, manually check the affected systems and at least this smoke path:

1. Load the start screen with no console errors.
2. Begin a new run and move with both WASD and arrow keys.
3. Sprint until stamina drains, then confirm recovery.
4. Aim and attack with mouse and keyboard.
5. Enter a building, use stairs when present, and leave.
6. Search a container and take one item, then take all.
7. Filter inventory, inspect an item, equip or consume it, and drop an item.
8. Combine two items and confirm both inputs are consumed.
9. Reload and continue; verify position, inventory, equipment, loot, and kills.
10. Resize below both responsive breakpoints.
11. Test a coarse-pointer device or browser emulation for the movement stick and touch buttons.
12. Confirm the console contains no uncaught exceptions.

For deterministic systems, repeat the same action after a clean save and confirm the same block, building, interior, infected, and loot results appear.

## deploy

The repository root is already the deployable artifact.

For GitHub Pages:

1. Open **Settings → Pages**.
2. Select **Deploy from a branch**.
3. Choose `main` and `/ (root)`.

For another static host, upload `index.html`, `styles.css`, and `game.js` together while preserving their names and relative paths.

## contribution flow

Make changes on a topic branch and open a pull request into `main`. Keep content, behavior, and documentation changes scoped clearly so deterministic-generation and save-compatibility effects can be reviewed before merge.

