import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("./game.js", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    for (const name of names) this.values.add(name);
  }
  remove(...names) {
    for (const name of names) this.values.delete(name);
  }
  toggle(name, force) {
    const enabled = force ?? !this.values.has(name);
    if (enabled) this.values.add(name);
    else this.values.delete(name);
    return enabled;
  }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.listeners = new Map();
    this.hidden = false;
    this.style = {};
    this.dataset = {};
    this.classList = new FakeClassList();
    this.children = [];
    this._innerHTML = "";
    this.textContent = "";
    this.disabled = false;
    this.width = id === "minimap_canvas" ? 220 : 1280;
    this.height = id === "minimap_canvas" ? 220 : 720;
  }

  set innerHTML(value) {
    this._innerHTML = value;
    this.children = [...value.matchAll(/<button\b([^>]*)>/g)].map((match) => {
      const child = new FakeElement();
      for (const attribute of match[1].matchAll(/\bdata-([a-z0-9-]+)="([^"]*)"/g)) {
        const name = attribute[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        child.dataset[name] = attribute[2];
      }
      return child;
    });
  }
  get innerHTML() { return this._innerHTML; }
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
  querySelectorAll(selector) {
    const match = selector.match(/^\[data-([a-z0-9-]+)\]$/);
    if (!match) return [];
    const name = match[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return this.children.filter((child) => Object.hasOwn(child.dataset, name));
  }
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

function assert_passage_clear(layout, passage, label) {
  const radius = 18;
  const step = 12;
  for (let y = passage.y + radius; y <= passage.y + passage.h - radius; y += step) {
    for (let x = passage.x + radius; x <= passage.x + passage.w - radius; x += step) {
      const blocking_wall = layout.walls.find((wall) => {
        const nearest_x = Math.max(wall.x, Math.min(x, wall.x + wall.w));
        const nearest_y = Math.max(wall.y, Math.min(y, wall.y + wall.h));
        return (x - nearest_x) ** 2 + (y - nearest_y) ** 2 < radius ** 2;
      });
      assert.ok(!blocking_wall, `${label} ${passage.kind} passage ${JSON.stringify(passage)} is clear at ${Math.round(x)},${Math.round(y)}; wall ${JSON.stringify(blocking_wall)}`);
    }
  }
  for (const fixture of layout.furniture) {
    const overlaps = fixture.x < passage.x + passage.w && fixture.x + fixture.w > passage.x && fixture.y < passage.y + passage.h && fixture.y + fixture.h > passage.y;
    assert.equal(overlaps, false, `${label} ${passage.kind} passage has no furniture`);
  }
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
  const stair_transitions = [[layout.up, layout.up_arrival], [layout.down, layout.down_arrival]];
  for (const [stairs, arrival] of stair_transitions) if (stairs) assert.ok(point_is_walkable(layout, arrival?.x ?? stairs.x, arrival?.y ?? stairs.y + 58), `${label} stair arrival is clear`);
  for (const door of layout.doors) assert.ok(door.width >= 120, `${label} doorway is comfortably wide`);
  for (const passage of layout.passages) assert_passage_clear(layout, passage, label);
  if (layout.entry) assert.ok(layout.passages.some((passage) => passage.kind === "entry"), `${label} has a protected entry route`);
}

function interior_geometry_fingerprint(layout) {
  const walls = layout.walls.map((wall) => [wall.x, wall.y, wall.w, wall.h].map((value) => Math.round(value)).join(",")).join(";");
  return `${layout.width}x${layout.height}:${walls}`;
}

function assert_building_faces_nearest_road(building) {
  const { cell, road } = api.city_geometry;
  const block_left = building.block_x * cell + road * .5;
  const block_top = building.block_y * cell + road * .5;
  const block_right = (building.block_x + 1) * cell - road * .5;
  const block_bottom = (building.block_y + 1) * cell - road * .5;
  const distances = {
    north: building.y - block_top,
    east: block_right - building.x - building.w,
    south: block_bottom - building.y - building.h,
    west: building.x - block_left,
  };
  const nearest = Math.min(...Object.values(distances));
  assert.ok(Math.abs(distances[building.road_side] - nearest) < .001, `${building.id} faces its closest road`);
  assert.equal(building.quarter_turns, { south: 0, west: 1, north: 2, east: 3 }[building.road_side], `${building.id} uses the matching rotation`);
  assert.ok(building.exterior_variant >= 0 && building.exterior_variant < api.exterior_roof_patterns.length, `${building.id} has a valid exterior`);
  if (building.road_side === "north") {
    assert.equal(building.door_y, building.y - 4, `${building.id} has a north door`);
    assert.ok(building.door_x > building.x && building.door_x < building.x + building.w, `${building.id} north door is on its façade`);
  } else if (building.road_side === "east") {
    assert.equal(building.door_x, building.x + building.w + 4, `${building.id} has an east door`);
    assert.ok(building.door_y > building.y && building.door_y < building.y + building.h, `${building.id} east door is on its façade`);
  } else if (building.road_side === "west") {
    assert.equal(building.door_x, building.x - 4, `${building.id} has a west door`);
    assert.ok(building.door_y > building.y && building.door_y < building.y + building.h, `${building.id} west door is on its façade`);
  } else {
    assert.equal(building.door_y, building.y + building.h + 4, `${building.id} has a south door`);
    assert.ok(building.door_x > building.x && building.door_x < building.x + building.w, `${building.id} south door is on its façade`);
  }
  const direction = { north: { x: 0, y: -1 }, east: { x: 1, y: 0 }, south: { x: 0, y: 1 }, west: { x: -1, y: 0 } }[building.road_side];
  const exit_x = building.door_x + direction.x * 48;
  const exit_y = building.door_y + direction.y * 48;
  const nearest_x = Math.max(building.x, Math.min(exit_x, building.x + building.w));
  const nearest_y = Math.max(building.y, Math.min(exit_y, building.y + building.h));
  assert.ok((exit_x - nearest_x) ** 2 + (exit_y - nearest_y) ** 2 > 18 ** 2, `${building.id} exterior arrival clears the wall`);
}

function assert_ground_floor_orientation(layout, building) {
  const expected = {
    north: { entry: { axis: "y", value: 90 }, exit: { axis: "y", value: 38 } },
    east: { entry: { axis: "x", value: layout.width - 90 }, exit: { axis: "x", value: layout.width - 38 } },
    south: { entry: { axis: "y", value: layout.height - 90 }, exit: { axis: "y", value: layout.height - 38 } },
    west: { entry: { axis: "x", value: 90 }, exit: { axis: "x", value: 38 } },
  }[building.road_side];
  assert.ok(Math.abs(layout.entry[expected.entry.axis] - expected.entry.value) < .001, `${building.id} interior entry faces ${building.road_side}`);
  assert.ok(Math.abs(layout.exit[expected.exit.axis] - expected.exit.value) < .001, `${building.id} interior exit faces ${building.road_side}`);
}

assert.ok(game, "game initializes");
assert.equal(ids.length, new Set(ids).size, "HTML ids are unique");
const script_version = html.match(/<script src="game\.js\?v=([^"]+)"><\/script>/)?.[1];
const style_version = html.match(/<link rel="stylesheet" href="styles\.css\?v=([^"]+)">/)?.[1];
assert.ok(script_version, "game script uses a versioned URL and supports direct local launch");
assert.equal(style_version, script_version, "game and stylesheet share the asset version");
assert.doesNotMatch(html, /<script type="module"/, "local launch does not depend on module loading");
assert.doesNotMatch(`${html}\n${source}`, /\bdata_[a-z0-9_-]+/, "interactive data attributes use browser dataset syntax");
assert.match(styles, /@media \(max-width: 620px\), \(pointer: coarse\)/, "touch layout is included");
assert.match(source, /floor_label\(this\.inside\.floor\)\.toUpperCase\(\)\}`, 10, 14\)/, "building and floor label stays inside the upper-left outer wall");
const dom_references = [...source.matchAll(/\bdom\.([a-z_]+)/g)].map((match) => match[1]);
for (const id of new Set(dom_references)) assert.ok(ids.includes(id), `DOM reference #${id} exists`);
for (const table of Object.values(api.loot_tables)) {
  for (const item_name of table) assert.ok(api.item_catalog[item_name], `loot item ${item_name} exists`);
}
const interior_templates = Object.values(api.interior_template_catalog).flat();
assert.ok(interior_templates.length >= 350, "the interior catalog contains hundreds of base templates");
assert.equal(new Set(interior_templates.map((template) => template.id)).size, interior_templates.length, "interior template ids are unique");
for (const [type, families] of Object.entries(api.interior_template_families)) {
  const available_templates = families.reduce((count, family) => count + api.interior_template_catalog[family].length, 0);
  assert.ok(available_templates >= 240, `${type} can select from a large template pool`);
}

elements.get("new_game_button").click();
assert.equal(game.started, true, "new game starts");
assert.equal(elements.get("start_screen").hidden, true, "new game button closes the start screen");
assert.equal(game.inventory.items.length, 5, "starter inventory is created");
assert.equal(game.inventory.equipped("weapon").name, "baseball bat", "starter weapon is equipped");
assert.ok(storage.has("city_of_nothing_save_v1"), "new game saves locally");

const original_active_enemies = game.active_enemies;
const original_move_enemy = game.move_enemy;
const original_damage_player = game.damage_player;
const original_player_state = { ...game.player };
const original_inside = game.inside;
const melee_enemy = { id: "infected:test:melee", x: 260, y: 0, angle: Math.PI, health: 50, speed: 60, radius: 18, attack: 0, melee_time: 0, wander: 0, wander_angle: 0, alerted: true, dead: false, variant: "walker" };
let infected_attacks = 0;
game.inside = null;
game.player.x = 0;
game.player.y = 0;
game.active_enemies = () => [melee_enemy];
game.move_enemy = (enemy, dx, dy) => { enemy.x += dx; enemy.y += dy; return true; };
game.damage_player = () => { infected_attacks += 1; };
game.update_enemies(1);
assert.ok(melee_enemy.x < 260, "alerted infected approaches a distant player");
assert.equal(infected_attacks, 0, "infected does not deal contact damage while approaching");
game.update_enemies(10);
const expected_melee_distance = melee_enemy.radius + api.infected_combat.player_radius + api.infected_combat.melee_reach;
assert.ok(Math.abs(Math.hypot(melee_enemy.x - game.player.x, melee_enemy.y - game.player.y) - expected_melee_distance) < .001, "infected stops at melee reach instead of entering the player");
assert.equal(infected_attacks, 1, "infected performs a melee attack after reaching range");
game.update_enemies(.1);
assert.equal(infected_attacks, 1, "infected melee attacks respect their cooldown");
melee_enemy.x = 4;
melee_enemy.y = 0;
melee_enemy.attack = 0;
game.update_enemies(1);
assert.ok(Math.hypot(melee_enemy.x - game.player.x, melee_enemy.y - game.player.y) >= melee_enemy.radius + api.infected_combat.player_radius, "overlapping infected backs out of the player's collision space");
assert.equal(infected_attacks, 1, "overlapping infected retreats before attacking");
game.active_enemies = original_active_enemies;
game.move_enemy = original_move_enemy;
game.damage_player = original_damage_player;
Object.assign(game.player, original_player_state);
game.inside = original_inside;

const family_test_types = {
  vertical_spine: "office",
  horizontal_gallery: "shop",
  cross_hall: "civic",
  front_suites: "house",
  industrial_bays: "warehouse",
};
for (const template of interior_templates) {
  const type = family_test_types[template.family];
  const width = template.family === "industrial_bays" ? 1040 : 840;
  const height = template.family === "industrial_bays" ? 680 : 640;
  const layout = {
    width,
    height,
    template_id: template.id,
    template_family: template.family,
    room_kind_offset: 0,
    walls: [],
    doors: [],
    passages: [],
    rooms: [],
    clearances: [],
    furniture: [],
    containers: [],
    up: { x: width - 105, y: 95 },
    down: { x: 105, y: 95 },
    exit: { x: width * .5, y: height - 38 },
    entry: { x: width * .5, y: height - 90 },
  };
  game.world.make_interior_floor_plan(layout, type, template, () => .5);
  assert.ok(layout.rooms.length >= 3, `${template.id} has purposeful rooms`);
  assert_interior_connected(layout, `catalog template ${template.id}`);
}

storage_locked = true;
game.started = false;
assert.doesNotThrow(() => elements.get("new_game_button").click(), "new game starts when local storage is restricted");
assert.equal(game.started, true, "storage restrictions do not block a new run");
storage_locked = false;

game.inventory.craft_ids = [];
game.inventory.render_crafting();
let craft_buttons = elements.get("craft_inventory").querySelectorAll("[data-item]");
assert.ok(craft_buttons.length >= 2, "crafting renders selectable inventory cards");
craft_buttons[0].click();
craft_buttons = elements.get("craft_inventory").querySelectorAll("[data-item]");
craft_buttons[1].click();
assert.deepEqual([...game.inventory.craft_ids], [game.inventory.items[0].id, game.inventory.items[1].id], "two different crafting items can be selected");
assert.equal(elements.get("craft_button").disabled, false, "crafting enables after two items are selected");
game.inventory.craft_ids = [];
game.inventory.render_crafting();

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
const generated_template_ids = new Map();
const generated_template_families = new Map();
const generated_geometries = new Map();
const generated_dimensions = new Map();
const generated_road_sides = new Set();
const generated_exterior_variants = new Set();
let determinism_checked = false;
for (let y = -64; y < 64; y += 1) {
  for (let x = -64; x < 64; x += 1) {
    for (const generated of game.world.block(x, y).buildings) {
      building_types.add(generated.type);
      generated_road_sides.add(generated.road_side);
      generated_exterior_variants.add(generated.exterior_variant);
      assert_building_faces_nearest_road(generated);
      assert.ok(generated.w >= 140 && generated.h >= 140, `${generated.id} retains a useful exterior footprint`);
      for (const fixture of api.exterior_roof_patterns[generated.exterior_variant]) {
        const oriented = game.oriented_exterior_rect(generated, fixture);
        assert.ok(oriented.x >= generated.x && oriented.y >= generated.y && oriented.x + oriented.w <= generated.x + generated.w && oriented.y + oriented.h <= generated.y + generated.h, `${generated.id} roof fixture stays inside its rotated exterior`);
      }
      if (!representative_buildings.has(generated.type)) representative_buildings.set(generated.type, []);
      if (representative_buildings.get(generated.type).length < 12) representative_buildings.get(generated.type).push(generated);
    }
  }
}
assert.equal(building_types.size, 11, "the city contains every building type");
assert.deepEqual([...generated_road_sides].sort(), ["east", "north", "south", "west"], "buildings face roads in every direction");
assert.equal(generated_exterior_variants.size, api.exterior_roof_patterns.length, "the city uses every exterior roof pattern");
for (const [type, buildings] of representative_buildings) {
  for (const generated of buildings) {
    for (let floor = -generated.basements; floor < generated.floors; floor += 1) {
      const label = `${type} ${generated.id} floor ${floor}`;
      const layout = game.world.interior(generated, floor);
      const template_label = `${label} template ${layout.template_id}`;
      if (!generated_template_ids.has(type)) generated_template_ids.set(type, new Set());
      if (!generated_template_families.has(type)) generated_template_families.set(type, new Set());
      if (!generated_geometries.has(type)) generated_geometries.set(type, new Set());
      if (!generated_dimensions.has(type)) generated_dimensions.set(type, new Set());
      generated_template_ids.get(type).add(layout.template_id);
      generated_template_families.get(type).add(layout.template_family);
      generated_geometries.get(type).add(interior_geometry_fingerprint(layout));
      generated_dimensions.get(type).add(`${layout.width}x${layout.height}`);
      assert.ok(layout.rooms.length >= 3, `${label} has purposeful rooms`);
      assert.ok(layout.containers.length >= 5, `${label} retains useful searchable loot`);
      assert_interior_connected(layout, template_label);
      if (floor === 0) assert_ground_floor_orientation(layout, generated);
      if (!determinism_checked) {
        const first_generation = JSON.stringify(layout);
        game.world.interiors.delete(layout.key);
        assert.equal(JSON.stringify(game.world.interior(generated, floor)), first_generation, "interior generation is deterministic after cache eviction");
        determinism_checked = true;
      }
      const enemies = game.enemies_inside(generated, floor);
      for (const enemy of enemies) {
        assert.ok(point_is_walkable(layout, enemy.x, enemy.y, enemy.radius), `${label} infected spawns in open floor space`);
        assert.ok(layout.clearances.every((clearance) => Math.hypot(enemy.x - clearance.x, enemy.y - clearance.y) >= enemy.radius + clearance.radius + 24), `${label} infected spawns away from transitions`);
      }
    }
  }
}
for (const type of building_types) {
  assert.ok(generated_template_ids.get(type).size >= 8, `${type} samples use many different templates`);
  assert.ok(generated_template_families.get(type).size >= 3, `${type} samples span several structural families`);
  assert.ok(generated_geometries.get(type).size >= 10, `${type} samples have varied wall geometry`);
  assert.ok(generated_dimensions.get(type).size >= 4, `${type} samples use varied interior dimensions`);
}

console.log("All City of Nothing tests passed.");
