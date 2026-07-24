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
canvas_context.createRadialGradient = () => ({ addColorStop() {} });

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

function add_material_cost(cost) {
  for (const [name, count] of Object.entries(cost)) {
    for (let index = 0; index < count; index += 1) game.inventory.add(api.make_item(name), false);
  }
}

function place_test_furniture(type) {
  const definition = api.furniture_catalog[type];
  add_material_cost(definition.cost);
  game.build_type = type;
  game.build_rotation = 0;
  const layout = game.layout();
  for (let y = 90; y < layout.height - 90; y += 24) {
    for (let x = 90; x < layout.width - 90; x += 24) {
      game.player.x = x - api.construction.build_reach;
      game.player.y = y;
      game.player.angle = 0;
      const preview = game.build_preview();
      if (game.can_place_built_furniture(preview)) return game.place_built_furniture();
    }
  }
  assert.fail(`could not find construction space for ${type}`);
}

function remove_test_furniture(item) {
  const floor_items = game.built_at();
  floor_items.splice(floor_items.indexOf(item), 1);
  game.container_items.delete(item.id);
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
assert.ok(api.survivor_ai.names.length >= 20, "survivors use a varied deterministic name pool");
assert.match(html, /id="survivor_overlay"/, "survivor conversations have a dedicated interface");
assert.match(html, /invite to join your group/, "survivors can be invited from conversation");
assert.match(html, /id="orders_overlay"/, "group shouts have a dedicated command interface");
assert.match(html, /id="building_overlay"/, "furniture construction has a dedicated interface");
assert.match(html, /id="radio_overlay"/, "base radio commands have a dedicated interface");
assert.match(html, /id="workbench_overlay"/, "crafting benches use a fixed-recipe interface");
assert.doesNotMatch(`${html}\n${source}`, /combine_items|craft_ids|any two items|crafting_overlay/, "the infinite any-two-item crafting system is removed");
assert.match(html, /attack everything you can/, "the command interface includes an aggressive attack order");
assert.match(html, /stay with me/, "the command interface includes a close formation order");
assert.match(html, /loot all nearby containers/, "the command interface includes a container looting order");
assert.match(html, /hold this position/, "the command interface includes a defensive hold order");
assert.deepEqual(Object.keys(api.group_orders).sort(), ["attack", "follow", "hold", "loot"], "the survivor AI exposes every supported group order");
const original_furniture = ["bed", "campfire", "chest", "cooker", "crafting_bench", "cupboard", "generator", "radio_center", "shelf", "turret"];
assert.ok(original_furniture.every((type) => api.furniture_catalog[type]), "every original furniture type remains buildable");
assert.ok(Object.keys(api.furniture_catalog).length >= 55, "the construction catalog contains a massive furniture selection");
for (const category of ["storage", "comfort", "workshop", "defence", "power", "lighting"]) {
  assert.ok(Object.values(api.furniture_catalog).filter((definition) => definition.category === category).length >= 3, `${category} has a substantial furniture selection`);
}
const light_definitions = Object.values(api.furniture_catalog).filter((definition) => definition.light);
assert.ok(light_definitions.length >= 10, "the catalog includes many functional light sources");
assert.ok(new Set(light_definitions.map((definition) => definition.light.range)).size >= 8, "lights have many distinct illumination ranges");
assert.ok(light_definitions.some((definition) => !definition.light.cone), "lights include circular room illumination");
assert.ok(light_definitions.filter((definition) => definition.light.cone).length >= 3, "lights include several directional throws");
assert.ok(api.furniture_catalog.spotlight.light.range > api.furniture_catalog.floodlight.light.range, "spotlights throw farther than floodlights");
assert.ok(api.furniture_catalog.spotlight.light.cone < api.furniture_catalog.floodlight.light.cone, "spotlights are narrower than floodlights");
assert.ok(api.furniture_catalog.ceiling_light.light.range > api.furniture_catalog.table_lamp.light.range, "ceiling lights cover more space than table lamps");
assert.ok(light_definitions.some((definition) => definition.powered) && light_definitions.some((definition) => !definition.powered), "powered and independent lights are both available");
assert.deepEqual(Object.keys(api.radio_missions).sort(), ["explore", "food", "junk", "medicine", "return", "weapons"], "the radio supports every requested field assignment");
assert.deepEqual(Object.keys(api.engagement_rules).sort(), ["aggressive", "avoid", "defensive", "normal"], "radio engagement rules cover passive through aggressive behavior");
for (const definition of Object.values(api.furniture_catalog)) {
  for (const material of Object.keys(definition.cost)) assert.ok(api.item_catalog[material], `${definition.name} uses a real inventory material`);
}
for (const recipe of Object.values(api.workbench_recipes)) {
  assert.ok(api.item_catalog[recipe.result], `${recipe.name} produces a catalog item`);
  for (const material of Object.keys(recipe.cost)) assert.ok(api.item_catalog[material], `${recipe.name} uses a real inventory item`);
}
assert.ok(api.survivor_ai.shout_range > api.survivor_ai.notice_range, "voice commands reach a useful nearby group radius");
assert.ok(api.survivor_ai.carry_capacity >= 30, "survivors have a practical but finite personal carrying capacity");
assert.ok(api.survivor_ai.eat_threshold < api.survival.well_fed_threshold, "survivors eat before hunger becomes dangerous and can restore well-fed regeneration");
assert.equal(api.survival.well_fed_threshold, 75, "health regeneration requires hunger above seventy-five percent");
assert.ok(api.survival.health_regen_rate > 0 && api.survival.health_regen_rate < 1, "well-fed health regeneration is deliberately slow");
assert.ok(api.navigation.cell <= 40 && api.navigation.margin >= 120, "navigation uses a fine grid with room to route around obstacles");
assert.ok(api.navigation.avoidance_range > api.survivor_ai.radius * 3, "characters begin avoiding one another before contact");
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

const original_active_survivors = game.active_survivors;
const original_damage_survivor = game.damage_survivor;
const target_survivor = game.new_survivor("survivor:test:target", 0, 0, () => .5, "test");
const survivor_targeting_enemy = { id: "infected:test:survivor-target", x: 60, y: 0, angle: Math.PI, health: 50, speed: 60, radius: 18, attack: 0, melee_time: 0, wander: 0, wander_angle: 0, alerted: true, dead: false, variant: "walker" };
let survivor_hits = 0;
let player_hits = 0;
game.player.x = 800;
game.player.y = 0;
game.active_survivors = () => [target_survivor];
game.active_enemies = () => [survivor_targeting_enemy];
game.move_enemy = (enemy, dx, dy) => { enemy.x += dx; enemy.y += dy; return true; };
game.damage_survivor = (survivor) => { assert.equal(survivor, target_survivor); survivor_hits += 1; };
game.damage_player = () => { player_hits += 1; };
game.update_enemies(1);
assert.equal(survivor_hits, 1, "infected attacks the nearest survivor");
assert.equal(player_hits, 0, "infected does not ignore a closer human to chase the player");
game.active_survivors = original_active_survivors;
game.active_enemies = original_active_enemies;
game.move_enemy = original_move_enemy;
game.damage_survivor = original_damage_survivor;
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

game.inventory.add(api.make_item("cloth"), false);
const cloth_before_recipe = game.item_count("cloth");
assert.equal(game.craft_recipe("bandage"), true, "a fixed workbench recipe can be crafted");
assert.equal(game.item_count("cloth"), cloth_before_recipe - 2, "fixed recipes consume their listed materials");
assert.ok(game.inventory.items.some((item) => item.name === "bandage"), "fixed recipes produce their declared item");
assert.equal(api.combine_items, undefined, "the infinite item-combining function is no longer exposed");

const equipped_survivor = game.new_survivor("survivor:test:equipment", 0, 0, () => .5, "test");
equipped_survivor.items = [
  api.make_item("baseball bat", "survivor:test:equipment:bat"),
  api.make_item("9mm pistol", "survivor:test:equipment:pistol"),
  api.make_item("9mm rounds", "survivor:test:equipment:ammo"),
  api.make_item("pump shotgun", "survivor:test:equipment:shotgun"),
  api.make_item("shotgun shells", "survivor:test:equipment:shells"),
  api.make_item("leather jacket", "survivor:test:equipment:jacket"),
  api.make_item("ballistic vest", "survivor:test:equipment:vest"),
  api.make_item("work boots", "survivor:test:equipment:boots"),
];
equipped_survivor.weapon_id = equipped_survivor.items[0].id;
equipped_survivor.equipment = { weapon: equipped_survivor.weapon_id, head: null, torso: null, legs: null, feet: null };
game.survivor_equip_best_armor(equipped_survivor);
assert.equal(game.survivor_equipped(equipped_survivor, "torso").name, "ballistic vest", "survivors equip the best armor for each body slot");
assert.equal(game.survivor_equipped(equipped_survivor, "feet").name, "work boots", "survivors retain independently equipped armor slots");
assert.equal(game.survivor_armor(equipped_survivor), 22, "survivor protection only counts equipped armor");
const close_walker = { id: "infected:test:close-choice", x: 62, y: 0, radius: 18, variant: "walker", dead: false };
const distant_brute = { id: "infected:test:distant-choice", x: 430, y: 0, radius: 24, variant: "brute", dead: false };
assert.equal(game.survivor_weapon(equipped_survivor, close_walker, [close_walker]).name, "baseball bat", "survivors conserve ammunition and prefer melee against a close ordinary threat");
assert.equal(game.survivor_weapon(equipped_survivor, distant_brute, [distant_brute]).name, "9mm pistol", "survivors switch to ranged weapons for distant dangerous targets");
const clustered_walker = { id: "infected:test:clustered-choice", x: 78, y: 12, radius: 18, variant: "walker", dead: false };
assert.equal(game.survivor_weapon(equipped_survivor, close_walker, [close_walker, clustered_walker]).name, "pump shotgun", "survivors recognize a close infected cluster as a useful shotgun situation");
equipped_survivor.items.find((item) => item.name === "9mm rounds").stats.ammo = 0;
equipped_survivor.items.find((item) => item.name === "shotgun shells").stats.ammo = 0;
assert.equal(game.survivor_weapon(equipped_survivor, distant_brute, [distant_brute]).name, "baseball bat", "survivors immediately fall back when a firearm has no usable ammunition");

const hungry_survivor = game.new_survivor("survivor:test:smart-food", 0, 0, () => .5, "test");
hungry_survivor.items = [api.make_item("apple", "survivor:test:smart-food:apple"), api.make_item("canned soup", "survivor:test:smart-food:soup")];
hungry_survivor.equipment = { weapon: null, head: null, torso: null, legs: null, feet: null };
hungry_survivor.weapon_id = null;
hungry_survivor.health = 100;
hungry_survivor.hunger = 71;
game.survivor_use_supplies(hungry_survivor);
assert.equal(hungry_survivor.items.length, 1, "a hungry survivor consumes one safe food item");
assert.equal(hungry_survivor.items[0].name, "canned soup", "survivors preserve a larger meal when a smaller food covers the current need");
assert.ok(hungry_survivor.hunger > api.survival.well_fed_threshold, "smart eating restores the survivor to a well-fed state");

const loaded_survivor = game.new_survivor("survivor:test:capacity", 0, 0, () => .5, "test");
loaded_survivor.items = [];
loaded_survivor.equipment = { weapon: null, head: null, torso: null, legs: null, feet: null };
let rejected_item = null;
for (let index = 0; index < 40; index += 1) {
  const item = api.make_item("scrap metal", `survivor:test:capacity:${index}`);
  if (!game.survivor_add_item(loaded_survivor, item)) {
    rejected_item = item;
    break;
  }
}
assert.ok(rejected_item, "survivor inventories reject items beyond their carry capacity");
assert.ok(game.survivor_inventory_weight(loaded_survivor) <= api.survivor_ai.carry_capacity, "survivor inventory weight never exceeds its capacity");

const original_regen_player = { ...game.player };
game.player.health = 50;
game.player.hunger = 80;
game.player.hurt_time = 0;
game.regenerate_well_fed(game.player, 10);
assert.ok(game.player.health > 50 && game.player.health < 55, "a well-fed player slowly regenerates health");
const fed_survivor = game.new_survivor("survivor:test:regen", 0, 0, () => .5, "test");
fed_survivor.health = 50;
fed_survivor.hunger = 80;
fed_survivor.hurt_time = 0;
game.regenerate_well_fed(fed_survivor, 10);
assert.equal(fed_survivor.health, game.player.health, "well-fed players and survivors use the same slow regeneration rate");
fed_survivor.health = 50;
fed_survivor.hunger = api.survival.well_fed_threshold;
game.regenerate_well_fed(fed_survivor, 10);
assert.equal(fed_survivor.health, 50, "health does not regenerate at or below the fed threshold");
Object.assign(game.player, original_regen_player);

const supply_survivor = game.new_survivor("survivor:test:supplies", 0, 0, () => .5, "test");
supply_survivor.items = [api.make_item("baseball bat"), api.make_item("energy bar"), api.make_item("medical kit")];
supply_survivor.weapon_id = supply_survivor.items[0].id;
supply_survivor.health = 30;
supply_survivor.hunger = 20;
game.survivor_use_supplies(supply_survivor);
assert.ok(supply_survivor.health > 30, "survivors use medical items when injured");
assert.ok(supply_survivor.hunger > 20, "survivors eat safe food when hungry");
assert.equal(supply_survivor.items.length, 1, "consumed survivor supplies leave their inventory");

const original_move_survivor = game.move_survivor;
const original_hurt_enemy = game.hurt_enemy;
const combat_survivor = game.new_survivor("survivor:test:combat", 0, 0, () => .5, "test");
combat_survivor.items = [api.make_item("baseball bat", "survivor:test:bat")];
combat_survivor.weapon_id = combat_survivor.items[0].id;
combat_survivor.attack = 0;
const combat_enemy = { id: "infected:test:npc-combat", x: 200, y: 0, radius: 18, health: 50, alerted: false, dead: false };
let survivor_damage = 0;
game.move_survivor = (survivor, dx, dy) => { survivor.x += dx; survivor.y += dy; return true; };
game.hurt_enemy = (enemy, damage, attacker) => { assert.equal(attacker, combat_survivor); survivor_damage += damage; };
game.update_survivor_combat(combat_survivor, combat_enemy, 10);
assert.ok(combat_survivor.x > 0, "armed survivors approach infected");
assert.equal(survivor_damage, 0, "survivors do not attack before reaching weapon range");
game.update_survivor_combat(combat_survivor, combat_enemy, .1);
assert.equal(survivor_damage, 20, "survivors attack with their selected melee weapon");

const ranged_survivor = game.new_survivor("survivor:test:ranged", 0, 0, () => .5, "test");
ranged_survivor.items = [api.make_item("9mm pistol", "survivor:test:pistol"), api.make_item("9mm rounds", "survivor:test:rounds")];
ranged_survivor.weapon_id = ranged_survivor.items[0].id;
ranged_survivor.attack = 0;
survivor_damage = 0;
game.hurt_enemy = (enemy, damage, attacker) => { assert.equal(attacker, ranged_survivor); survivor_damage += damage; };
game.update_survivor_combat(ranged_survivor, combat_enemy, .1);
assert.equal(survivor_damage, 38, "survivors fire usable ranged weapons");
assert.equal(ranged_survivor.items[1].stats.ammo, 11, "survivor firearms consume ammunition");
game.move_survivor = original_move_survivor;
game.hurt_enemy = original_hurt_enemy;

const navigation_inside = game.inside;
const navigation_player = { ...game.player };
const navigation_layout = {
  width: 640,
  height: 420,
  walls: [{ x: 292, y: 36, w: 36, h: 270 }],
  clearances: [],
  passages: [],
  furniture: [],
  containers: [],
};
game.inside = { building: { id: "building:test:navigation" }, floor: 0 };
game.layout = () => navigation_layout;
game.built_at = () => [];
game.player.x = 100;
game.player.y = 360;
const navigating_survivor = game.new_survivor("survivor:test:navigator", 120, 120, () => .5, "test");
game.movement_survivors = [navigating_survivor];
game.movement_enemies = [];
const survivor_path = game.find_navigation_path(navigating_survivor, 520, 120);
assert.ok(survivor_path.length >= 2, "survivor navigation builds a multi-waypoint route when a wall blocks line of sight");
assert.ok(survivor_path.some((point) => point.y > 320), "survivor navigation routes through the real opening instead of pressing against the wall");
for (let step = 0; step < 180; step += 1) game.navigate_character(navigating_survivor, "survivor", 520, 120, 150, .05);
assert.ok(navigating_survivor.x > 470 && Math.abs(navigating_survivor.y - 120) < 45, "survivors follow smoothed paths around obstacles and reach the far side");

const navigating_enemy = { id: "infected:test:navigator", x: 120, y: 120, radius: 18, speed: 70, wander_angle: 0, navigation: null, dead: false };
game.movement_survivors = [];
game.movement_enemies = [navigating_enemy];
const enemy_path = game.find_navigation_path(navigating_enemy, 520, 120);
assert.ok(enemy_path.some((point) => point.y > 320), "infected use the same obstacle-aware route planning");
for (let step = 0; step < 240; step += 1) game.navigate_character(navigating_enemy, "enemy", 520, 120, 90, .05);
assert.ok(navigating_enemy.x > 470 && Math.abs(navigating_enemy.y - 120) < 45, "infected navigate around walls instead of becoming stuck");

const separating_survivor = game.new_survivor("survivor:test:separation", 150, 150, () => .5, "test");
const separating_survivor_two = game.new_survivor("survivor:test:separation:two", 150, 150, () => .5, "test");
const separating_enemy = { id: "infected:test:separation", x: 150, y: 150, radius: 18, wander_angle: 0, navigation: null, dead: false };
game.player.x = 150;
game.player.y = 150;
game.movement_survivors = null;
game.movement_enemies = null;
const separation_active_survivors = game.active_survivors;
const separation_active_enemies = game.active_enemies;
game.active_survivors = () => [separating_survivor, separating_survivor_two];
game.active_enemies = () => [separating_enemy];
game.separate_characters();
assert.ok(Math.hypot(separating_survivor.x - game.player.x, separating_survivor.y - game.player.y) >= separating_survivor.radius + api.infected_combat.player_radius + api.navigation.gap - .1, "survivors are separated from the player");
assert.ok(Math.hypot(separating_survivor_two.x - game.player.x, separating_survivor_two.y - game.player.y) >= separating_survivor_two.radius + api.infected_combat.player_radius + api.navigation.gap - .1, "every survivor is separated from the player");
assert.ok(Math.hypot(separating_survivor.x - separating_survivor_two.x, separating_survivor.y - separating_survivor_two.y) >= separating_survivor.radius + separating_survivor_two.radius + api.navigation.gap - .1, "survivors cannot occupy one another's space");
assert.ok(Math.hypot(separating_enemy.x - game.player.x, separating_enemy.y - game.player.y) >= separating_enemy.radius + api.infected_combat.player_radius + api.navigation.gap - .1, "infected are separated from the player");
assert.ok(Math.hypot(separating_survivor.x - separating_enemy.x, separating_survivor.y - separating_enemy.y) >= separating_survivor.radius + separating_enemy.radius + api.navigation.gap - .1, "survivors and infected cannot occupy one another's space");
separating_survivor.x = game.player.x + separating_survivor.radius + api.infected_combat.player_radius + api.navigation.gap + 1;
separating_survivor.y = game.player.y;
separating_enemy.x = 500;
separating_enemy.y = 350;
const player_before_character_collision = game.player.x;
game.move_player(8, 0);
assert.equal(game.player.x, player_before_character_collision, "player movement cannot push into a survivor's occupied space");
game.active_survivors = separation_active_survivors;
game.active_enemies = separation_active_enemies;
delete game.layout;
delete game.built_at;
game.inside = navigation_inside;
Object.assign(game.player, navigation_player);

let survivor_block = null;
let recruit = null;
for (let y = -16; y <= 16 && !recruit; y += 1) {
  for (let x = -16; x <= 16 && !recruit; x += 1) {
    const block = game.world.block(x, y);
    const survivors = game.survivors_outside(block);
    if (survivors.length) {
      survivor_block = block;
      [recruit] = survivors;
    }
  }
}
assert.ok(recruit, "the city deterministically generates roaming human survivors");
assert.equal(game.survivors_outside(survivor_block)[0], recruit, "generated survivors retain their state while their block is cached");
assert.ok(recruit.items.some((item) => item.category === "weapon"), "roaming survivors carry weapons");
assert.ok(recruit.items.some((item) => item.tags.includes("food")), "roaming survivors carry usable supplies");
assert.ok(survivor_block.buildings.every((candidate) => !((recruit.x >= candidate.x && recruit.x <= candidate.x + candidate.w) && (recruit.y >= candidate.y && recruit.y <= candidate.y + candidate.h))), "survivors spawn outside solid buildings");
game.inside = null;
game.player.x = recruit.x + 24;
game.player.y = recruit.y;
elements.get("survivor_overlay").hidden = true;
game.talk_to_survivor(recruit);
assert.equal(elements.get("survivor_overlay").hidden, false, "talking opens the survivor conversation");
assert.equal(elements.get("survivor_name").textContent, recruit.name, "conversation identifies the survivor");
assert.equal(elements.get("invite_survivor").hidden, false, "an independent survivor can be invited");
game.invite_active_survivor();
assert.ok(game.companions.includes(recruit), "invited survivors join the player's group");
assert.equal(recruit.recruited, true, "recruited state is retained on the survivor");
assert.ok(!game.survivors_outside(survivor_block).includes(recruit), "a companion leaves their old roaming population");
assert.equal(elements.get("group_status").textContent, "1 companion · following", "the HUD reports the travelling group and its current order");

elements.get("orders_overlay").hidden = true;
game.toggle_group_orders();
assert.equal(elements.get("orders_overlay").hidden, false, "the group-order interface opens for recruited companions");
assert.match(elements.get("orders_summary").textContent, /1 of 1 teammate/, "the order interface reports who is close enough to hear");
game.close_panels();

const distant_companion = game.new_survivor("survivor:test:distant-command", game.player.x + api.survivor_ai.shout_range + 100, game.player.y, () => .5, "test");
distant_companion.recruited = true;
distant_companion.order = "hold";
game.companions.push(distant_companion);
const original_active_enemies_for_order = game.active_enemies;
const shout_enemy = { id: "infected:test:shout", x: game.player.x + 100, y: game.player.y, dead: false, alerted: false };
game.active_enemies = () => [shout_enemy];
assert.equal(game.issue_group_order("attack"), 1, "a shout reaches every nearby teammate and excludes distant companions");
assert.equal(recruit.order, "attack", "nearby companions receive the attack order");
assert.equal(distant_companion.order, "hold", "companions outside hearing range keep their previous order");
assert.equal(shout_enemy.alerted, true, "shouting makes enough noise to alert nearby infected");
assert.equal(game.command_text, "ATTACK EVERYTHING YOU CAN", "the shouted command appears over the player");
game.active_enemies = original_active_enemies_for_order;
game.companions.pop();

const distant_enemy = { id: "infected:test:ordered-target", x: game.player.x + 760, y: game.player.y, dead: false };
recruit.x = game.player.x + 62;
recruit.y = game.player.y;
recruit.order = "follow";
assert.equal(game.survivor_target(recruit, [distant_enemy]), null, "stay-with-me companions ignore threats far from the group");
recruit.order = "attack";
assert.equal(game.survivor_target(recruit, [distant_enemy]), distant_enemy, "attack-order companions hunt threats beyond their normal awareness");
recruit.order = "hold";
recruit.order_x = recruit.x;
recruit.order_y = recruit.y;
const hold_x = recruit.x;
recruit.x += 110;
game.update_survivor_hold(recruit, .25);
assert.ok(recruit.x < hold_x + 110, "hold-position companions return to their assigned ground");
recruit.order = "follow";
recruit.order_target_id = null;
game.update_hud();

const first_block = game.world.nearby(-8000, 6000, 1).find((block) => block.buildings.length > 0);
assert.ok(first_block, "starting area has enterable buildings");
const repeated_block = game.world.block(first_block.x, first_block.y);
assert.equal(first_block, repeated_block, "world blocks are cached and deterministic");
assert.ok(first_block.buildings.every((building) => building.floors >= 1), "all buildings have floors");

const building = first_block.buildings[0];
game.enter(building);
assert.equal(game.inside.building.id, building.id, "building entry works");
assert.equal(game.inside.floor, 0, "entry begins on ground floor");
assert.ok(point_is_walkable(game.layout(), game.companions[0].x, game.companions[0].y, api.survivor_ai.radius), "companions enter buildings in open floor space");
assert.ok(game.layout().containers.length > 0, "interiors have searchable containers");
const built_chest = place_test_furniture("chest");
assert.equal(built_chest.type, "chest", "the construction system places selected furniture");
assert.ok(game.built_at().includes(built_chest), "constructed furniture belongs to the current floor");
assert.equal(game.container_items.get(built_chest.id).length, 0, "built storage starts empty");
const stored_item = game.inventory.items.find((item) => item.id !== game.inventory.equipment.weapon);
game.open_container(built_chest);
game.store(stored_item.id);
assert.ok(game.container_items.get(built_chest.id).some((item) => item.id === stored_item.id), "items can be stored in built furniture");
game.take(stored_item.id);
assert.ok(game.inventory.items.some((item) => item.id === stored_item.id), "stored items can be taken back");
game.close_panels();
game.render_build_catalog();
assert.equal(elements.get("build_catalog").querySelectorAll("[data-build]").length, Object.keys(api.furniture_catalog).length, "the categorized build interface renders every catalog entry");

const built_battery = place_test_furniture("battery_bank");
assert.equal(game.building_powered(building.id), true, "a battery bank provides quiet building-wide power");
game.use_furniture(built_battery);
assert.equal(game.building_powered(building.id), false, "power sources can be switched off");
game.use_furniture(built_battery);
assert.equal(game.building_powered(building.id), true, "power sources can be reactivated");

const built_floodlight = place_test_furniture("floodlight");
game.use_furniture(built_floodlight);
assert.equal(built_floodlight.active, false, "constructed lights can be switched off");
game.use_furniture(built_floodlight);
assert.equal(built_floodlight.active, true, "constructed lights can be switched back on");
remove_test_furniture(built_floodlight);
remove_test_furniture(built_battery);

const built_collector = place_test_furniture("water_collector");
built_collector.ready_at = game.world_minutes;
const water_before_collection = game.item_count("bottled water");
game.use_furniture(built_collector);
assert.equal(game.item_count("bottled water"), water_before_collection + 2, "production furniture creates its declared supplies when ready");
assert.ok(built_collector.ready_at > game.world_minutes, "production furniture records its next persistent collection time");
remove_test_furniture(built_collector);

const built_medical_station = place_test_furniture("medical_station");
game.inventory.add(api.make_item("bandage"), false);
game.player.health = 30;
game.use_furniture(built_medical_station);
assert.ok(game.player.health > 46, "medical stations improve the healing supplied by a bandage");
remove_test_furniture(built_medical_station);

const built_spike_trap = place_test_furniture("spike_trap");
const trapped_enemy = { id: "infected:test:trap", x: built_spike_trap.x - 10, y: built_spike_trap.y + built_spike_trap.h * .5, radius: 18, health: 80, dead: false, alerted: false };
game.update_defence(built_spike_trap, api.furniture_catalog.spike_trap, [trapped_enemy], false, true);
assert.equal(trapped_enemy.health, 44, "unpowered spike traps damage infected that reach them");
assert.equal(trapped_enemy.alerted, true, "defensive furniture alerts surviving targets");
remove_test_furniture(built_spike_trap);

assert.doesNotThrow(() => game.draw_light_source(canvas_context, { x: game.player.x, y: game.player.y, angle: 0, light: api.furniture_catalog.spotlight.light, id: "test_light" }), "directional furniture light rendering is safe");
for (const type of Object.keys(api.furniture_catalog).filter((candidate) => !["chest", "radio_center"].includes(candidate))) {
  const built = place_test_furniture(type);
  assert.equal(built.type, type, `${api.furniture_catalog[type].name} can be constructed through the shared placement system`);
  const floor_items = game.built_at();
  floor_items.splice(floor_items.indexOf(built), 1);
  game.container_items.delete(built.id);
}

const built_radio = place_test_furniture("radio_center");
assert.equal(game.base.building_id, building.id, "placing a radio center designates its building as the team base");
assert.equal(game.base.radio_id, built_radio.id, "the active base records its radio center");
const base_floor_count = building.floors + building.basements;
assert.ok([...game.world.pinned_interiors].filter((key) => key.startsWith(`${building.id}:`)).length === base_floor_count, "every base floor is pinned in memory");
for (let floor = -building.basements; floor < building.floors; floor += 1) {
  assert.ok(game.world.interiors.has(`${building.id}:${floor}`), `base floor ${floor} stays loaded`);
  assert.ok(game.indoor_enemies.has(`${building.id}:${floor}`), `base floor ${floor} has an active entity cache`);
}
game.active_radio_member_id = recruit.id;
assert.equal(game.set_radio_engagement("aggressive"), true, "the radio changes a teammate's combat engagement");
assert.equal(recruit.engagement, "aggressive", "radio engagement persists on the teammate");
const radio_inventory_before = recruit.items.length;
assert.equal(game.issue_radio_mission("food"), true, "the radio sends any selected teammate on a supply assignment");
assert.equal(recruit.remote, true, "assigned teammates leave the local travelling group");
assert.ok(!game.active_survivors().includes(recruit), "remote teammates are not simulated on top of the player");
game.update_remote_team(api.radio_missions.food.duration + 1);
assert.equal(recruit.radio_mission, "return", "completed collectors automatically start returning");
assert.ok(recruit.items.length > radio_inventory_before, "collectors return with supplies from the requested category");
game.update_remote_team(api.radio_missions.return.duration + 1);
assert.equal(recruit.remote, false, "returning teammates rejoin the travelling group");
assert.equal(game.issue_group_order("loot"), 1, "nearby companions receive a container-looting order");
const ordered_container = game.layout().containers[0];
const carried_before_looting = game.companions[0].items.length;
game.companions[0].x = ordered_container.x + ordered_container.w * .5;
game.companions[0].y = ordered_container.y + ordered_container.h * .5;
game.update_survivor_loot(game.companions[0], .016);
assert.ok(game.looted.has(ordered_container.id), "a companion empties a nearby container after reaching it");
assert.ok(game.companions[0].items.length > carried_before_looting, "companion-looted items go into that companion's inventory");
assert.equal(game.container_items.get(ordered_container.id).length, 0, "group looting uses the same persistent container inventory as the player");
assert.ok(game.layout().walls.length > 0 || ["warehouse", "factory"].includes(building.type), "interior layout is generated");
if (building.floors > 1) {
  game.change_floor(1);
  assert.equal(game.inside.floor, 1, "upper-floor stairs work");
  assert.ok(point_is_walkable(game.layout(), game.companions[0].x, game.companions[0].y, api.survivor_ai.radius), "companions safely travel between floors");
}
game.exit();
assert.equal(game.inside, null, "building exit returns the group outdoors");
assert.ok(Math.hypot(game.companions[0].x - game.player.x, game.companions[0].y - game.player.y) < 180, "companions regroup after leaving a building");
assert.equal(game.companions[0].order, "follow", "scene-local loot orders reset after a world transition");
const pinned_before_remote_tick = [...game.world.pinned_interiors].filter((key) => key.startsWith(`${building.id}:`)).length;
game.update_base_floors(1.1);
assert.equal([...game.world.pinned_interiors].filter((key) => key.startsWith(`${building.id}:`)).length, pinned_before_remote_tick, "all base floors remain loaded while the player is outside");

const street_grate = first_block.grates[0];
assert.ok(game.world.sewer_point_open(street_grate.sewer_x, street_grate.sewer_y, 18), "street grates connect to open sewer floor");
game.enter_sewer(street_grate);
assert.equal(game.sewer, true, "street grates enter the sewer network");
assert.equal(game.inside, null, "the sewer is a distinct world layer");
assert.ok(game.active_enemies().every((enemy) => game.world.sewer_point_open(enemy.x, enemy.y, enemy.radius)), "sewer infected spawn inside connected tunnels and chambers");
let basement_access = null;
for (let y = -8; y <= 8 && !basement_access; y += 1) {
  for (let x = -8; x <= 8 && !basement_access; x += 1) {
    const candidate = game.world.block(x, y).buildings.find((item) => item.basements > 0);
    if (candidate) basement_access = game.world.basement_sewer_access(candidate);
  }
}
assert.ok(basement_access, "the city has basement sewer connections");
assert.ok(game.world.sewer_point_open(basement_access.sewer_x, basement_access.sewer_y, 18), "basement access joins the same sewer network");
game.player.x = basement_access.sewer_x;
game.player.y = basement_access.sewer_y;
game.leave_sewer(basement_access);
assert.equal(game.sewer, false, "a sewer exit leaves the underground layer");
assert.equal(game.inside.building.id, basement_access.building.id, "the connected sewer can be exited through another building's basement");
assert.equal(game.inside.floor, basement_access.floor, "basement sewer exits arrive on the correct floor");
assert.ok(point_is_walkable(game.layout(), game.player.x, game.player.y), "basement sewer arrival is clear");
game.change_floor(1);
game.exit();
game.enter(building);
game.issue_group_order("attack");
game.render();
game.save(true);

const saved = JSON.parse(storage.get("city_of_nothing_save_v1"));
assert.ok(saved.inventory.items.length >= 5, "inventory persists");
assert.equal(saved.inside.building_id, building.id, "interior position persists");
assert.equal(saved.companions.length, 1, "recruited companions persist in saves");
assert.equal(saved.companions[0].order, "attack", "persistent group orders are included in companion saves");
assert.equal(saved.companions[0].engagement, "aggressive", "radio engagement rules persist in saves");
assert.equal(saved.companions[0].equipment.weapon, saved.companions[0].weapon_id, "companion weapon equipment persists by item ID");
assert.deepEqual(Object.keys(saved.companions[0].equipment).sort(), ["feet", "head", "legs", "torso", "weapon"], "every companion equipment slot persists");
assert.equal(saved.base.building_id, building.id, "the radio-designated base persists");
assert.ok(saved.built_furniture.some(([key, items]) => key.startsWith(`${building.id}:`) && items.some((item) => item.id === built_radio.id)), "constructed furniture persists");
game.player.health = 2;
game.continue();
assert.equal(game.player.health, saved.player.health, "continue restores the saved player");
assert.equal(game.companions.length, 1, "continue restores the player's group");
assert.equal(game.companions[0].id, recruit.id, "continue restores the same recruited survivor");
assert.equal(game.companions[0].order, "attack", "continue restores the companion's tactical order");
assert.equal(game.companions[0].equipment.weapon, game.companions[0].weapon_id, "continue restores the companion's equipped weapon");
assert.equal(game.base.building_id, building.id, "continue restores and reactivates the team base");
assert.ok(game.world.pinned_interiors.has(`${building.id}:0`), "restored bases pin their floors immediately");
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
    const generated_block = game.world.block(x, y);
    assert.equal(generated_block.grates.length, 2, `city block ${x},${y} has street sewer access`);
    for (const grate of generated_block.grates) assert.ok(game.world.sewer_point_open(grate.sewer_x, grate.sewer_y, 18), `${grate.id} opens onto the connected sewer`);
    assert.ok(game.world.sewer_point_open((x + .5) * api.city_geometry.cell, (y + .5) * api.city_geometry.cell, 18), `sewer chamber ${x},${y} is open`);
    const connected_grid_x = (x === -api.city_geometry.radius ? x + 1 : x) * api.city_geometry.cell;
    assert.ok(game.world.sewer_point_open(connected_grid_x, (y + .5) * api.city_geometry.cell, 18), `sewer chamber ${x},${y} connects to the city grid`);
    for (const generated of generated_block.buildings) {
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
      if (floor < 0) {
        assert.ok(layout.sewer_grate, `${label} has a sewer grate`);
        assert.ok(point_is_walkable(layout, layout.sewer_grate.x, layout.sewer_grate.y), `${label} sewer grate has clear basement access`);
        const access = game.world.basement_sewer_access(generated);
        assert.ok(game.world.sewer_point_open(access.sewer_x, access.sewer_y, 18), `${label} connects into the city-wide sewer`);
      }
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
