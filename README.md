# city of nothing

**city of nothing** is a self-contained, top-down zombie-survival game built for the browser. It generates a large abandoned city from a fixed seed, lets every generated building be entered, and keeps the player's discoveries and changes in local browser storage.

The entire game is plain HTML, CSS, and JavaScript. There is no build step, package manager, server, database, account system, or API key.

## features

- A deterministic 128 × 128 city made from 16,384 streamed blocks
- Seven districts with different building mixes and infected density
- Enterable houses, apartments, shops, offices, hospitals, civic buildings, factories, warehouses, schools, diners, and police stations
- Procedural multi-floor interiors, including upper floors and basements
- Melee weapons, firearms, armor, food, medicine, ammunition, tools, and materials
- Walker, runner, and brute infected variants
- Free-form crafting that combines any two items
- Persistent inventory, equipment, looted containers, defeated infected, location, time, and statistics
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
| `E` | Interact, enter, exit, search, or use stairs |
| `I` or `Tab` | Open or close inventory |
| `C` | Open or close crafting |
| `1` | Equip the strongest carried weapon |
| `2` | Eat the best carried edible food |
| `Esc` | Close the active panel |

On touch devices, use the virtual movement stick and the **use** and **attack** buttons. The player faces the movement direction when no mouse aim is available.

## project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Canvas, HUD, menus, inventory, crafting, loot, guide, death screen, and touch-control markup |
| `styles.css` | Visual system, responsive layouts, overlays, HUD components, touch controls, and animation |
| `game.js` | Data definitions, procedural generation, simulation, input, combat, inventory, crafting, persistence, audio, and rendering |
| `tests.mjs` | Dependency-free Node regression tests, including generated-interior connectivity and transition safety |
| [`docs/architecture.md`](docs/architecture.md) | Runtime design, state ownership, generation, rendering, persistence, and performance |
| [`docs/gameplay-reference.md`](docs/gameplay-reference.md) | Current mechanics, districts, combat, infected, loot, crafting, and saves |
| [`docs/development.md`](docs/development.md) | Local workflow, extension points, debugging tools, validation, and deployment |

## technical overview

`Game` owns the runtime and animation loop. It composes three focused systems:

- `World` deterministically generates and caches blocks, buildings, interiors, furniture, containers, and district assignments.
- `Inventory` owns items, equipment, consumption, crafting, and inventory UI rendering.
- `Sound` creates short effects with the Web Audio API.

Only the area around the player is simulated and rendered. Generated world data is recreated from stable IDs and the fixed seed, while player-made changes are recorded separately. This keeps the world large without storing every block or interior.

See the [architecture documentation](docs/architecture.md) for the full runtime model.

## saves

Progress is stored as JSON in `localStorage` under `city_of_nothing_save_v1`. Autosaves are rate-limited during play and forced at important transitions such as starting, crafting, entering a building, leaving a building, and closing the page.

The save contains:

- Player position and survival values
- Current interior and floor
- Inventory and equipped item IDs
- World time and play time
- Kill, loot, and crafting statistics
- Looted container IDs and remaining generated container contents
- Defeated infected IDs

Starting a new run removes the current save. Death does not overwrite it, so **return to last save** restores the most recent surviving state.

## publish with github pages

1. Open the repository's **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select the `main` branch and `/ (root)`.

GitHub Pages can serve the three source files directly; no build workflow is required.
