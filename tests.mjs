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

const building_types = new Set();
for (let y = -12; y <= 12; y += 1) {
  for (let x = -12; x <= 12; x += 1) {
    for (const generated of game.world.block(x, y).buildings) building_types.add(generated.type);
  }
}
assert.ok(building_types.size >= 9, "the city contains varied building types");

console.log("All City of Nothing tests passed.");
