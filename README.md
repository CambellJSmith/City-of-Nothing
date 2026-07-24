# city of nothing

**city of nothing** is a self-contained, top-down zombie-survival game built for the browser. It generates a large abandoned city from a fixed seed, lets every generated building be entered, and keeps the player's discoveries and changes in local browser storage.

The entire game is plain HTML, CSS, and JavaScript. There is no build step, package manager, server, database, account system, or API key.

## features

- A deterministic 128 × 128 city made from 16,384 streamed blocks
- Seven districts with different building mixes and infected density
- Enterable houses, apartments, shops, offices, hospitals, civic buildings, factories, warehouses, schools, diners, and police stations
- Varied four-way building exteriors with entrances and interiors rotated toward the closest road
- Procedural multi-floor interiors selected from 371 connected base templates, including upper floors and basements
- Melee weapons, firearms, armor, food, medicine, ammunition, tools, and materials
- Walker, runner, and brute infected variants
- Autonomous human survivors who roam, manage supplies, fight infected, converse, and can join the player
- Persistent companion groups that travel through streets, buildings, and floors in formation
- Nearby group voice orders for attacking, following, looting containers, and holding ground
- A 58-piece furniture catalog spanning storage, comfort, workshops, supply production, defences, power, command, and lighting
- Functional beds and seating, medical and recovery stations, water and food production, rally/map tools, three turrets, traps, fences, alarms, and sensors
- Fourteen light-emitting furnishings with distinct sizes, intensities, circular ranges, wide cones, narrow long throws, power requirements, colors, and flicker
- Radio-designated team bases whose complete buildings remain loaded and active off screen
- Radio assignments for exploring, collecting specific supplies, returning, and changing individual combat engagement
- A fully connected city-wide sewer network with street and basement access, tunnels, chambers, infected, and cross-building travel
- Fixed practical recipes available from player-built crafting benches
- Persistent inventory, equipment, companions, encountered survivors, looted containers, defeated infected, location, time, and statistics
- Desktop mouse and keyboard controls plus touch controls for coarse-pointer devices
- Canvas rendering, a local minimap, a day/night overlay, synthesized sound, and a responsive HUD

## play locally

Open `index.html` directly in a modern browser, or serve the repository with any static file server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

> Saves belong to the page origin. A save created by opening `index.html` as a local file is separate from one created through `http://localhost:8080`.

## controls

| Input | Action |
| --- | --- |
| `WASD` or arrow keys | Move |
| `Shift` | Sprint |
| Mouse | Aim |
| Left click or `Space` | Attack |
| `E` | Interact, talk, recruit, enter, exit, search, use stairs, or place furniture |
| `Q` | Shout a tactical order to nearby companions |
| `I` or `Tab` | Open or close inventory |
| `B` | Open furniture construction |
| `R` | Rotate furniture while placing |
| `1` | Equip the strongest carried weapon |
| `2` | Eat the best carried edible food |
| `Esc` | Close the active panel |

On touch devices, use the virtual movement stick and the **use**, **attack**, and **orders** buttons. The player faces the movement direction when no mouse aim is available.

## project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Canvas, HUD, menus, inventory, construction, workbench, radio, loot, guide, death screen, and touch-control markup |
| `styles.css` | Visual system, responsive layouts, overlays, HUD components, touch controls, and animation |
| `game.js` | Data definitions, procedural generation, simulation, construction, bases, sewers, AI, combat, inventory, persistence, audio, and rendering |
| `tests.mjs` | Dependency-free Node regression tests, including full-city sewer access and exhaustive template connectivity |
| [`docs/architecture.md`](docs/architecture.md) | Runtime design, state ownership, generation, rendering, persistence, and performance |
| [`docs/gameplay-reference.md`](docs/gameplay-reference.md) | Current mechanics, districts, combat, infected, loot, construction, bases, sewers, and saves |
| [`docs/development.md`](docs/development.md) | Local workflow, extension points, debugging tools, validation, and deployment |

## technical overview

`Game` owns the runtime and animation loop. It composes three focused systems:

- `World` deterministically generates and caches blocks, buildings, interiors, sewer access, furniture, containers, and district assignments.
- `Inventory` owns items, equipment, consumption, and inventory UI rendering.
- `Sound` creates short effects with the Web Audio API.

`Game` also owns infected and human-survivor AI. Independent survivors roam nearby blocks, use personal inventories, fight with usable weapons, and can be recruited into a formation that follows the player across world transitions. Recruited survivors retain individual tactical orders and can divide nearby container-looting work without duplicating targets.

Only the area around the player is normally simulated and rendered. A radio-designated base is the exception: all of its floors are pinned and continue simulating while the player is elsewhere. Generic defence definitions keep standard, heavy, and shotgun turrets plus contact traps active through the same bounded base update. Light cutouts are composited only for visible sources in the current location. Sewer geometry is generated locally from a globally connected plan, so the underground network covers the city without being stored as one enormous map.

See the [architecture documentation](docs/architecture.md) for the full runtime model.

## saves

Progress is stored as JSON in `localStorage` under `city_of_nothing_save_v1`. Autosaves are rate-limited during play and forced at important transitions such as starting, building, issuing radio orders, entering a building, leaving a building, and closing the page.

The save contains:

- Player position and survival values
- Current street, interior floor, or sewer position
- Inventory and equipped item IDs
- World time and play time
- Kill, loot, and construction statistics
- Looted container IDs and remaining generated container contents
- Defeated infected IDs
- Recruited companions, their inventories, health, hunger, kill counts, and current orders
- Built furniture, stored contents, the designated base, radio missions, and engagement rules
- Encountered independent survivors and permanently lost survivor IDs

Starting a new run removes the current save. Death does not overwrite it, so **return to last save** restores the most recent surviving state.

## publish with github pages

1. Open the repository's **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select the `main` branch and `/ (root)`.

GitHub Pages can serve the three source files directly; no build workflow is required.
