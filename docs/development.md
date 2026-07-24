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
- Location, vitals, weapon, group, threat, and quick-action HUD
- Interaction prompt and toast stack
- Inventory, construction, workbench, radio, container, and survivor-conversation overlays
- Start, guide, and death screens
- Touch controls

The JavaScript builds a `dom` object from every element with an `id`. Treat those IDs as an interface with `game.js`.

### `styles.css`

Defines the color tokens, HUD panels, menus, inventory, construction, workbench, radio components, start/death screens, responsive behavior, touch controls, and animations.

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
5. Check the inventory card, inspector action, equipment behavior, recipe or construction use, weight, and save/restore.

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
- `interior_room_kinds`
- `interior_template_families`
- `World.building_types()`
- Floor and basement rules in `World.make_buildings()`
- Interior family compatibility, dimensions, room roles, and wall layout
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

### add furniture or a workbench recipe

Furniture is data-driven through `furniture_catalog`. Add its dimensions, exact item-name cost, and behavior flags, then handle any new action in `use_furniture()` and its presentation in `draw_built_furniture()`. Placement must continue to reject walls, generated fixtures, protected passages, transition clearances, characters, and existing construction.

Fixed recipes belong in `workbench_recipes`; arbitrary two-item combination is intentionally unsupported. Every cost and result name must exist in `item_catalog`.

Radio centers are special: `designate_base()` must unpin the previous base, pin every floor in the new building, and initialize its enemy caches. Any new remote simulation must remain bounded and must not use the player's current layout for collision.

### change the sewer

Keep street and basement access positions inside `World.sewer_point_open()`. The present geometry guarantees full connectivity by joining block-edge tunnels, central cross-tunnels, and a chamber in every block. A new chamber or tunnel variant must retain an open route to that shared grid and must be generated from stable coordinates rather than mutable traversal order.

### change survivor behavior

Human survivor state is owned by `Game`, not `World`. Keep these responsibilities aligned:

- `survivors_outside()` must remain deterministic for unseen blocks.
- Recruited and lost IDs must be excluded from regenerated outdoor populations.
- `update_survivors()` owns needs, target selection, roaming, following, and combat.
- `survivor_target()` must preserve the different engagement limits for follow, attack, loot, and hold orders.
- `issue_group_order()` must only affect living companions inside the hearing radius.
- Companion container looting must use `container_inventory()` so player and NPC searches share deterministic contents and save state.
- `place_companions()` must run after every world or floor transition.
- Scene-local loot and hold tasks must reset during transitions; follow and attack may continue.
- Survivor-generated dialogue and loadout markup must escape runtime text.
- New persistent survivor fields need tolerant defaults in `restore_survivor()` and explicit output in `serialise_survivor()`.

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
city_of_nothing_test.group_orders
city_of_nothing_test.furniture_catalog
city_of_nothing_test.workbench_recipes
city_of_nothing_test.radio_missions
city_of_nothing_test.engagement_rules
city_of_nothing_test.sewer_geometry
city_of_nothing_test.survivor_ai
```

Create an isolated item record:

```js
city_of_nothing_test.make_item("hammer");
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

The `killed` list is truncated to the most recent 4,000 IDs, and saved outdoor survivor zones are truncated to the most recent 80 map entries. Recruited companions and lost survivor IDs are serialized separately so they cannot be regenerated when an older outdoor zone is omitted.

## validation checklist

Run the dependency-free automated suite before merging:

```bash
node tests.mjs
```

The suite checks startup, persistence, fixed recipes, every requested furniture definition, construction placement and storage, radio missions and engagement, base-floor pinning and remote simulation, every street grate across the 128 × 128 city, basement sewer links, connected tunnel geometry, sewer transitions and enemy placement, survivor AI, all group orders, all building types, every base interior template at minimum dimensions, deterministic regeneration, four-way road-facing exteriors, interior connectivity, full doorway passages, clear transitions, safe infected placement, and blocked legacy-save recovery. Also manually check the affected systems and at least this smoke path:

1. Load the start screen with no console errors.
2. Begin a new run and move with both WASD and arrow keys.
3. Sprint until stamina drains, then confirm recovery.
4. Aim and attack with mouse and keyboard.
5. Enter several building types, confirm every room is reachable, use stairs when present, and leave.
6. Search a container and take one item, then take all.
7. Filter inventory, inspect an item, equip or consume it, and drop an item.
8. Build, rotate, and place each furniture type; move items into and out of all three storage types.
9. Use a bed, cooker, crafting bench, generator, turret, and campfire; verify fixed recipes and powered behavior.
10. Place a radio center, leave the building, and verify every floor stays active.
11. Meet a survivor, recruit them, and use the radio to send them on each assignment, recall them, and change engagement.
12. Press `Q`, issue every group order, and verify only nearby non-remote teammates respond.
13. Enter a street sewer grate, travel through tunnels and chambers, fight, and emerge through another street and a basement.
14. Order multiple companions to loot and verify they divide containers, carry the contents, and return when clear.
15. Reload and verify the same construction, stored items, base, sewer position, companions, radio state, inventory, loot, and kills.
16. Resize below both responsive breakpoints.
17. Test a coarse-pointer device or browser emulation for the movement stick, use, attack, and orders buttons.
18. Confirm the console contains no uncaught exceptions.

For deterministic systems, repeat the same action after a clean save and confirm the same block, building, interior, infected, and loot results appear.

## deploy

The repository root is already the deployable artifact.

For GitHub Pages:

1. Open **Settings → Pages**.
2. Select **Deploy from a branch**.
3. Choose `main` and `/ (root)`.

The stylesheet and game script URLs in `index.html` share a version query. Increment both versions together whenever either asset changes so browsers and static hosts cannot keep serving stale gameplay code after a deployment.

For another static host, upload `index.html`, `styles.css`, and `game.js` together while preserving their names and relative paths.

## contribution flow

Make changes on a topic branch and open a pull request into `main`. Keep content, behavior, and documentation changes scoped clearly so deterministic-generation and save-compatibility effects can be reviewed before merge.
