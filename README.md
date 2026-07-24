# City of Nothing

A self-contained HTML, CSS and JavaScript zombie-survival game for GitHub Pages.

## Publish

1. Put `index.html`, `styles.css` and `game.js` in the root of a GitHub repository.
2. Open the repository's **Settings → Pages**.
3. Choose **Deploy from a branch**, select your main branch and `/ (root)`.

No server, database, API key, package installation or build command is required. Saves use the browser's local storage.

## Play locally

Double-click `index.html` to launch the game directly in a browser.

You can also serve the folder locally:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/city-of-nothing/`.

## Controls

- `WASD` or arrow keys — move
- `Shift` — sprint
- Mouse — aim
- Left click or `Space` — attack
- `E` — interact, enter, exit, search or use stairs
- `I` or `Tab` — inventory
- `C` — crafting
- `1` — equip strongest weapon
- `2` — eat best food
- `Esc` — close panel

The deterministic city contains 16,384 streamed blocks across residential, commercial, industrial, civic, medical, park and outskirts districts. Buildings have distinct types, layouts, upper floors and basements. Loot, defeated infected, equipment and crafted items persist locally.
