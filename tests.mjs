import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("./game.js", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);

class FakeClassList {
  add() {}
  remove() {}
  toggle() {}
  contains() { return false; }
}

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.listeners = new Map();
    this.hidden = false;
    this.style = {};
    this.dataset = {};
    this.classList = new FakeClassList();
    this.innerHTML = "";
    this.textContent = "";
    this.width = id === "minimap_canvas" ? 220 : 1280;
    this.height = id === "minimap_canvas" ? 220 : 720;
  }

  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }
  click() {
    for (const callback of this.listeners.get("click") ?? []) callback({ target: this });
  }
  append() {}
  remove() {}
  setPointerCapture() {}
  hasPointerCapture() { return false; }
  querySelectorAll() { return []; }
  querySelector() { return new FakeElement(); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; }
  getContext() { return canvas_context; }
}

const canvas_context = new Proxy({}, {
  get(target, property) {
    if (!(property in target)) target[property] = () => {};
    return target[property];
  },
  set(target, property, value) {
    target[property] = value;
    return true;
  },
});

const elements = new Map(ids.map((id) => [id, new FakeElement(id)]));
const storage = new Map();
let storage_locked = false;
const document = {
  querySelectorAll(selector) {
    if (selector === "[id]") return [...elements.values()];
    return [];
  },
  addEventListener() {},
  createElement() { return new FakeElement(); },
};

const context = vm.createContext({
  console,
  document,
  localStorage: {
    getItem(key) {
      if (storage_locked) throw new Error("storage unavailable");
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      if (storage_locked) throw new Error("storage unavailable");
      storage.set(key, value);
    },
    removeItem(key) {
      if (storage_locked) throw new Error("storage unavailable");
      storage.delete(key);
    },
  },
  performance: { now: () => 1000 },
  requestAnimationFrame() {},
  setTimeout() {},
  matchMedia: () => ({ matches: false }),
  devicePixelRatio: 1,
  crypto: { randomUUID: () => `test-${Math.random()}` },
  addEventListener() {},
  AudioContext: null,
});
context.globalThis = context;

vm.runInContext(source, context, { filename: "game.js" });

const game = context.city_of_nothing;
const api = context.city_of_nothing_test;

function point_is_walkable(layout, x, y, radius = 18) {
  if (x < 36 + radius || y < 36 + radius || x > layout.width - 36 - radius || y > layout.height - 36 - radius) return false;
  return !layout.walls.some((wall) => {
    const nearest_x = Math.max(wall.x, Math.min(x, wall.x + wall.w));
    const nearest_y = Math.max(wall.y, Math.min(y, wall.y + wall.h));
    return (x - nearest_x) ** 2 + (y - nearest_y) ** 2 < radius ** 2;
  });
}

function assert_interior_connected(layout, label) {
  const step = 12;
  const columns = Math.floor((layout.width - 108) / step) + 1;
  const rows = Math.floor((layout.height - 108) / step) + 1;
  const walkable = new Uint8Array(columns * rows);
  let walkable_count = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      walkable[index] = Number(point_is_walkable(layout, 54 + column * step, 54 + row * step));
      walkable_count += walkable[index];
    }
  }
  const start = walkable.findIndex(Boolean);
  assert.ok(start >= 0, `${label} has walkable floor space`);
  const visited = new Uint8Array(walkable.length);
  const queue = new Int32Array(walkable.length);
  let queue_start = 0;
  let queue_end = 1;
  let visited_count = 0;
  queue[0] = start;
  visited[start] = 1;
  while (queue_start < queue_end) {
    const current = queue[queue_start++];
    visited_count += 1;
    const column = current % columns;
    const row = Math.floor(current / columns);
    const neighbors = [column > 0 ? current - 1 : -1, column < columns - 1 ? current + 1 : -1, row > 0 ? current - columns : -1, row < rows - 1 ? current + columns : -1];
    for (const neighbor of neighbors) {
      if (neighbor >= 0 && walkable[neighbor] && !visited[neighbor]) {
        visited[neighbor] = 1;
        queue[queue_end++] = neighbor;
      }
    }
  }
  assert.equal(visited_count, walkable_count, `${label} has no isolated rooms`);
  for (const room of layout.rooms) assert.ok(point_is_walkable(layout, room.x + room.w * .5, room.y + room.h * .5), `${label} room centre is usable`);
  for (const point of [layout.entry, layout.up, layout.down]) if (point) assert.ok(point_is_walkable(layout, point.x, point.y), `${label} transition is clear`);
  for (const stairs of [layout.up, layout.down]) if (stairs) assert.ok(point_is_walkable(layout, stairs.x, stairs.y + 58), `${label} stair arrival is clear`);
}

assert.ok(game, "game initializes");
assert.equal(ids.length, new Set(ids).size, "HTML ids are unique");
assert.match(html, /<script src="game\.js"><\/script>/, "game script supports direct local launch");
assert.doesNotMatch(html, /<script type="module"/, "local launch does not depend on module loading");
assert.match(styles, /@media \(max-width: 620px\), \(pointer: coarse\)/, "touch layout is included");
const dom_references = [...source.matchAll(/\bdom\.([a-z_]+)/g)].map((match) => match[1]);
for (const id of new Set(dom_references)) assert.ok(ids.includes(id), `DOM reference #${id} exists`);
for (const table of Object.values(api.loot_tables)) {
  for (const item_name of table) assert.ok(api.item_catalog[item_name], `loot item ${item_name} exists`);
}

elements.get("new_game_button").click();
assert.equal(game.started, true, "new game starts");
assert.equal(elements.get("start_screen").hidden, true, "new game button closes the start screen");
assert.equal(game.inventory.items.length, 5, "starter inventory is created");
assert.equal(game.inventory.equipped("weapon").name, "baseball bat", "starter weapon is equipped");
assert.ok(storage.has("city_of_nothing_save_v1"), "new game saves locally");

storage_locked = true;
game.started = false;
assert.doesNotThrow(() => elements.get("new_game_button").click(), "new game starts when local storage is restricted");
assert.equal(game.started, true, "storage restrictions do not block a new run");
storage_locked = false;

const soup_apple = api.combine_items(api.make_item("canned soup"), api.make_item("apple"), true);
assert.equal(soup_apple.name, "canned soup apple");
assert.equal(soup_apple.stats.food, 38);
assert.ok(soup_apple.tags.includes("food"));
assert.ok(!soup_apple.tags.includes("inedible"));

const hammer_bat = api.combine_items(api.make_item("hammer"), api.make_item("baseball bat"), true);
assert.equal(hammer_bat.name, "hammer baseball bat");
assert.equal(hammer_bat.stats.attack, 38);
assert.deepEqual([...hammer_bat.components], ["hammer", "baseball bat"]);

const three_part = api.combine_items(hammer_bat, api.make_item("kitchen knife"), true);
assert.equal(three_part.components.length, 3, "crafted components remain flat");
assert.equal(three_part.stats.attack, 52);

const gun_apple = api.combine_items(api.make_item("9mm pistol"), api.make_item("apple"), true);
assert.ok(gun_apple.tags.includes("inedible"), "inedible is inherited");
assert.equal(gun_apple.category, "weapon", "blocking weapon capability wins");

const poison_soup = api.combine_items(api.make_item("gasoline"), api.make_item("canned soup"), true);
assert.ok(poison_soup.tags.includes("poisoned"), "poisoned is inherited");
assert.ok(poison_soup.tags.includes("inedible"), "inedible remains permanent");

const first_block = game.world.nearby(-8000, 6000, 1).find((block) => block.buildings.length > 0);
assert.ok(first_block, "starting area has enterable buildings");
const repeated_block = game.world.block(first_block.x, first_block.y);
assert.equal(first_block, repeated_block, "world blocks are cached and deterministic");
assert.ok(first_block.buildings.every((building) => building.floors >= 1), "all buildings have floors");

const building = first_block.buildings[0];
game.enter(building);
assert.equal(game.inside.building.id, building.id, "building entry works");
assert.equal(game.inside.floor, 0, "entry begins on ground floor");
assert.ok(game.layout().containers.length > 0, "interiors have searchable containers");
assert.ok(game.layout().walls.length > 0 || ["warehouse", "factory"].includes(building.type), "interior layout is generated");
if (building.floors > 1) {
  game.change_floor(1);
  assert.equal(game.inside.floor, 1, "upper-floor stairs work");
}
game.render();
game.save(true);

const saved = JSON.parse(storage.get("city_of_nothing_save_v1"));
assert.ok(saved.inventory.items.length >= 5, "inventory persists");
assert.equal(saved.inside.building_id, building.id, "interior position persists");
game.player.health = 2;
game.continue();
assert.equal(game.player.health, saved.player.health, "continue restores the saved player");
const blocked_save = JSON.parse(JSON.stringify(saved));
const blocking_wall = game.layout().walls[0];
blocked_save.inside.x = blocking_wall.x + blocking_wall.w * .5;
blocked_save.inside.y = blocking_wall.y + blocking_wall.h * .5;
storage.set("city_of_nothing_save_v1", JSON.stringify(blocked_save));
game.continue();
assert.ok(point_is_walkable(game.layout(), game.player.x, game.player.y), "blocked legacy interior saves relocate the player safely");

const building_types = new Set();
const representative_buildings = new Map();
for (let y = -12; y <= 12; y += 1) {
  for (let x = -12; x <= 12; x += 1) {
    for (const generated of game.world.block(x, y).buildings) {
      building_types.add(generated.type);
      if (!representative_buildings.has(generated.type)) representative_buildings.set(generated.type, []);
      if (representative_buildings.get(generated.type).length < 4) representative_buildings.get(generated.type).push(generated);
    }
  }
}
assert.equal(building_types.size, 11, "the city contains every building type");
for (const [type, buildings] of representative_buildings) {
  for (const generated of buildings) {
    for (let floor = -generated.basements; floor < generated.floors; floor += 1) {
      const label = `${type} ${generated.id} floor ${floor}`;
      const layout = game.world.interior(generated, floor);
      assert.ok(layout.rooms.length >= 3, `${label} has purposeful rooms`);
      assert.ok(layout.containers.length >= 5, `${label} retains useful searchable loot`);
      assert_interior_connected(layout, label);
      const enemies = game.enemies_inside(generated, floor);
      for (const enemy of enemies) {
        assert.ok(point_is_walkable(layout, enemy.x, enemy.y, enemy.radius), `${label} infected spawns in open floor space`);
        assert.ok(layout.clearances.every((clearance) => Math.hypot(enemy.x - clearance.x, enemy.y - clearance.y) >= enemy.radius + clearance.radius + 24), `${label} infected spawns away from transitions`);
      }
    }
  }
}

console.log("All City of Nothing tests passed.");
