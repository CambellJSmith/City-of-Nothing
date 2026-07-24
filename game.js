const SEED = 7191963;
const SAVE_KEY = "city_of_nothing_save_v1";
const CELL = 1000;
const ROAD = 168;
const CITY_RADIUS = 64;
const PLAYER_RADIUS = 18;
const USE_RANGE = 76;
const TAU = Math.PI * 2;

const districts = {
  civic: { name: "old civic centre", ground: "#494a45", lot: "#56564e", accent: "#b6ad87", threat: 1.15 },
  commercial: { name: "glassmarket", ground: "#444743", lot: "#50544e", accent: "#93aaa0", threat: 1.25 },
  residential: { name: "harrow residential", ground: "#475047", lot: "#526052", accent: "#9eb184", threat: 0.9 },
  industrial: { name: "blackwater industrial", ground: "#4c4740", lot: "#5b5247", accent: "#ba8e66", threat: 1.4 },
  medical: { name: "saint orison quarter", ground: "#474d4c", lot: "#525b59", accent: "#9bb8b3", threat: 1.2 },
  park: { name: "widow's green", ground: "#405043", lot: "#465b49", accent: "#8fac76", threat: 0.75 },
  outskirts: { name: "outer ward", ground: "#4c5044", lot: "#5a5f4c", accent: "#b2b884", threat: 0.65 },
};

const road_names = [
  "marrow street", "bell avenue", "saint jude road", "holloway", "carrion lane",
  "orison boulevard", "mercy street", "redmarket road", "foundry way", "quiet mile",
  "needle street", "widow lane", "station road", "blackwater drive", "ash avenue",
];

const building_names = {
  house: ["rowan house", "ashdown home", "bell residence", "mercy terrace"],
  apartments: ["carrion court", "vesper flats", "harrow house", "saint agnes apartments"],
  shop: ["nothing mart", "vale pharmacy", "morrow hardware", "grafton foods"],
  office: ["ardent house", "novak tower", "orison exchange", "ledger building"],
  warehouse: ["blackwater storage", "foundry depot", "northline freight", "locke warehouse"],
  factory: ["vale works", "mercy textiles", "crown foundry", "redline plant"],
  hospital: ["saint orison hospital", "mercy clinic", "grey ward medical", "civic infirmary"],
  police: ["central precinct", "harrow police station", "civic watch house", "ninth precinct"],
  civic: ["city records", "municipal hall", "central library", "civic court"],
  school: ["harrow school", "saint agnes academy", "carrion elementary", "vesper high"],
  diner: ["last light diner", "mabel's kitchen", "grey spoon", "night shift café"],
};

const item_catalog = {
  "apple": { category: "food", stats: { food: 14, heal: 2, weight: 0.2, durability: 1 }, tags: ["food", "fresh"], description: "Bruised, but still recognisably an apple." },
  "canned soup": { category: "food", stats: { food: 24, heal: 4, weight: 0.6, durability: 1 }, tags: ["food", "sealed"], description: "A dented tin with an intact seal." },
  "bottled water": { category: "food", stats: { food: 7, heal: 1, weight: 0.5, durability: 1 }, tags: ["food", "drink"], description: "Clean water in a cloudy bottle." },
  "energy bar": { category: "food", stats: { food: 18, heal: 2, weight: 0.1, durability: 1 }, tags: ["food", "sealed"], description: "Dense calories with a chemical aftertaste." },
  "spoiled meat": { category: "food", stats: { food: 20, heal: -12, weight: 0.5, durability: 1 }, tags: ["food", "poisoned"], description: "It should not be eaten. Hunger may disagree." },
  "baseball bat": { category: "weapon", stats: { attack: 20, range: 74, noise: 12, weight: 1.1, durability: 70 }, tags: ["melee", "blunt", "inedible"], description: "Old ash wood. Heavy enough to matter." },
  "hammer": { category: "weapon", stats: { attack: 18, range: 50, noise: 10, weight: 0.9, durability: 85 }, tags: ["melee", "blunt", "tool", "inedible"], description: "A claw hammer with a worn rubber grip." },
  "kitchen knife": { category: "weapon", stats: { attack: 14, range: 44, noise: 4, weight: 0.3, durability: 45 }, tags: ["melee", "blade", "tool", "inedible"], description: "Short reach, fast and quiet." },
  "crowbar": { category: "weapon", stats: { attack: 24, range: 64, noise: 15, weight: 1.5, durability: 95 }, tags: ["melee", "blunt", "tool", "inedible"], description: "Useful for opening doors and skulls." },
  "9mm pistol": { category: "weapon", stats: { attack: 38, range: 620, noise: 78, weight: 1, durability: 80 }, tags: ["firearm", "9mm", "inedible"], ammo_type: "9mm round", description: "Loud, compact and reliable." },
  "pump shotgun": { category: "weapon", stats: { attack: 74, range: 430, noise: 100, weight: 3.4, durability: 88 }, tags: ["firearm", "shell", "inedible"], ammo_type: "shotgun shell", description: "Devastating nearby. Heard for blocks." },
  "9mm rounds": { category: "ammo", stats: { ammo: 12, weight: 0.18, durability: 1 }, tags: ["ammo", "9mm round", "inedible"], description: "A partly filled box of pistol ammunition." },
  "shotgun shells": { category: "ammo", stats: { ammo: 5, weight: 0.3, durability: 1 }, tags: ["ammo", "shotgun shell", "inedible"], description: "Red twelve-gauge shells." },
  "leather jacket": { category: "wearable", slot: "torso", stats: { armor: 7, weight: 1.3, durability: 55 }, tags: ["clothing", "torso", "inedible"], description: "Scuffed leather that still turns a weak bite." },
  "work boots": { category: "wearable", slot: "feet", stats: { armor: 4, weight: 1.4, durability: 75 }, tags: ["clothing", "feet", "inedible"], description: "Steel toes and deep, dirty tread." },
  "riot helmet": { category: "wearable", slot: "head", stats: { armor: 12, weight: 1.6, durability: 90 }, tags: ["armor", "head", "inedible"], description: "Police armour with a cracked visor." },
  "ballistic vest": { category: "wearable", slot: "torso", stats: { armor: 18, weight: 3.7, durability: 95 }, tags: ["armor", "torso", "inedible"], description: "Heavy plates built to stop worse than teeth." },
  "duct tape": { category: "material", stats: { durability: 20, weight: 0.3 }, tags: ["binding", "material", "inedible"], description: "The foundation of questionable engineering." },
  "nails": { category: "material", stats: { attack: 4, durability: 18, weight: 0.4 }, tags: ["metal", "material", "sharp", "inedible"], description: "A paper packet full of rusting nails." },
  "scrap metal": { category: "material", stats: { attack: 5, armor: 3, durability: 30, weight: 1.8 }, tags: ["metal", "material", "inedible"], description: "Jagged pieces stripped from machinery." },
  "cloth": { category: "material", stats: { armor: 1, durability: 10, weight: 0.2 }, tags: ["fabric", "material", "flammable", "inedible"], description: "Dry cloth torn into useful strips." },
  "gasoline": { category: "material", stats: { attack: 6, weight: 1.2, durability: 1 }, tags: ["flammable", "poisoned", "material", "inedible"], description: "A sealed can of stale fuel." },
  "flashlight": { category: "tool", stats: { durability: 40, weight: 0.4 }, tags: ["tool", "light", "inedible"], description: "A narrow beam and a weak battery." },
  "medical kit": { category: "medical", stats: { heal: 36, weight: 0.8, durability: 1 }, tags: ["medical", "sealed", "inedible"], description: "Bandages, antiseptic and painkillers." },
};

const loot_tables = {
  kitchen: ["apple", "canned soup", "bottled water", "energy bar", "kitchen knife", "spoiled meat", "cloth"],
  bedroom: ["cloth", "leather jacket", "work boots", "flashlight", "duct tape", "energy bar"],
  office: ["bottled water", "energy bar", "flashlight", "cloth", "medical kit"],
  shop: ["canned soup", "bottled water", "energy bar", "duct tape", "nails", "baseball bat"],
  medical: ["medical kit", "bottled water", "cloth", "energy bar", "spoiled meat"],
  industrial: ["hammer", "crowbar", "duct tape", "nails", "scrap metal", "gasoline", "work boots"],
  police: ["9mm pistol", "9mm rounds", "riot helmet", "ballistic vest", "shotgun shells", "medical kit"],
  storage: ["duct tape", "nails", "scrap metal", "cloth", "flashlight", "gasoline"],
};

const dom = Object.fromEntries([...document.querySelectorAll("[id]")].map((element) => [element.id, element]));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const distance_sq = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

function normal(x, y) {
  const length = Math.hypot(x, y);
  return length > 0.0001 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

function hash(seed, x, y = 0, z = 0) {
  let value = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647)) | 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function text_hash(text) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function uid(prefix = "item") {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
}

function safe(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function in_rect(x, y, rect, padding = 0) {
  return x >= rect.x - padding && x <= rect.x + rect.w + padding && y >= rect.y - padding && y <= rect.y + rect.h + padding;
}

function circle_rect(x, y, radius, rect) {
  const nearest_x = clamp(x, rect.x, rect.x + rect.w);
  const nearest_y = clamp(y, rect.y, rect.y + rect.h);
  return distance_sq(x, y, nearest_x, nearest_y) < radius ** 2;
}

function make_item(name, id = null) {
  const template = item_catalog[name];
  if (!template) throw new Error(`Unknown item: ${name}`);
  return {
    id: id ?? uid(),
    name,
    category: template.category,
    slot: template.slot ?? null,
    ammo_type: template.ammo_type ?? null,
    stats: { ...template.stats },
    tags: [...template.tags],
    components: [name],
    description: template.description,
  };
}

function combine_items(first, second, preview = false) {
  const stats = {};
  for (const key of new Set([...Object.keys(first.stats), ...Object.keys(second.stats)])) {
    stats[key] = Number(((first.stats[key] ?? 0) + (second.stats[key] ?? 0)).toFixed(2));
  }
  const tags = [...new Set([...first.tags, ...second.tags])];
  const components = [...first.components, ...second.components];
  const weapon = first.category === "weapon" || second.category === "weapon" || (stats.attack ?? 0) > 7;
  const wearable = first.category === "wearable" || second.category === "wearable";
  const edible = tags.includes("food") && !tags.includes("inedible");
  let category = weapon ? "weapon" : wearable ? "wearable" : edible ? "food" : "material";
  if (tags.includes("medical") && !weapon && !wearable) category = "medical";
  return {
    id: preview ? "preview" : uid("crafted"),
    name: `${first.name} ${second.name}`,
    category,
    slot: first.slot ?? second.slot ?? null,
    ammo_type: tags.includes("firearm") ? (first.ammo_type ?? second.ammo_type) : null,
    stats,
    tags,
    components,
    description: `Built from ${components.join(", ")}. Every permanent property of its components remains.`,
  };
}

class Sound {
  constructor() {
    this.context = null;
  }

  start() {
    const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!this.context && AudioContext) this.context = new AudioContext();
    this.context?.resume();
  }

  tone(frequency, duration, volume, wave = "sine", slide = 0) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.linearRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}

class Inventory {
  constructor(game) {
    this.game = game;
    this.items = [];
    this.equipment = {};
    this.selected = null;
    this.filter = "all";
    this.craft_ids = [];
  }

  reset() {
    this.items = ["baseball bat", "apple", "canned soup", "cloth", "duct tape"].map((name) => make_item(name));
    this.equipment = { weapon: this.items[0].id, head: null, torso: null, legs: null, feet: null };
    this.selected = null;
    this.craft_ids = [];
  }

  restore(data) {
    this.items = Array.isArray(data?.items) ? data.items : [];
    this.equipment = { weapon: null, head: null, torso: null, legs: null, feet: null, ...(data?.equipment ?? {}) };
    for (const slot of Object.keys(this.equipment)) {
      if (!this.items.some((item) => item.id === this.equipment[slot])) this.equipment[slot] = null;
    }
  }

  get(id) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  equipped(slot) {
    return this.get(this.equipment[slot]);
  }

  add(item, notify = true) {
    this.items.push(item);
    if (notify) {
      this.game.toast(`added ${item.name}`);
      this.game.sound.tone(440, 0.08, 0.025, "sine", 150);
    }
    this.game.update_hud();
  }

  remove(id) {
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const [item] = this.items.splice(index, 1);
    for (const slot of Object.keys(this.equipment)) if (this.equipment[slot] === id) this.equipment[slot] = null;
    this.craft_ids = this.craft_ids.filter((item_id) => item_id !== id);
    return item;
  }

  weight() {
    return this.items.reduce((total, item) => total + (item.stats.weight ?? 0), 0);
  }

  armor() {
    return ["head", "torso", "legs", "feet"].reduce((total, slot) => total + (this.equipped(slot)?.stats.armor ?? 0), 0);
  }

  ammo(type) {
    return this.items.reduce((total, item) => item.tags.includes(type) ? total + (item.stats.ammo ?? 0) : total, 0);
  }

  use_ammo(type) {
    const box = this.items.find((item) => item.tags.includes(type) && (item.stats.ammo ?? 0) > 0);
    if (!box) return false;
    box.stats.ammo -= 1;
    if (box.stats.ammo <= 0) this.remove(box.id);
    return true;
  }

  equip(item) {
    const slot = item.category === "weapon" ? "weapon" : item.slot;
    if (!slot) return this.game.toast("that item cannot be equipped", true);
    this.equipment[slot] = item.id;
    this.game.toast(`equipped ${item.name}`);
    this.render_inventory();
    this.game.update_hud();
  }

  best_weapon() {
    const weapon = this.items.filter((item) => item.category === "weapon").sort((a, b) => (b.stats.attack ?? 0) - (a.stats.attack ?? 0))[0];
    if (weapon) this.equip(weapon);
    else this.game.toast("no weapon available", true);
  }

  eat(item) {
    if (!item.tags.includes("food") || item.tags.includes("inedible")) return this.game.toast(`${item.name} is inedible`, true);
    this.game.player.hunger = clamp(this.game.player.hunger + (item.stats.food ?? 0), 0, 100);
    this.game.player.health = clamp(this.game.player.health + (item.stats.heal ?? 0), 0, 100);
    if (item.tags.includes("poisoned")) {
      this.game.player.health = clamp(this.game.player.health - 18, 0, 100);
      this.game.toast(`${item.name} was poisoned`, true);
    } else {
      this.game.toast(`ate ${item.name}`);
    }
    this.remove(item.id);
    this.render_inventory();
    this.game.update_hud();
  }

  use_medical(item) {
    this.game.player.health = clamp(this.game.player.health + (item.stats.heal ?? 0), 0, 100);
    this.remove(item.id);
    this.game.toast(`used ${item.name}`);
    this.render_inventory();
    this.game.update_hud();
  }

  best_food() {
    const food = this.items.filter((item) => item.tags.includes("food") && !item.tags.includes("inedible")).sort((a, b) => (b.stats.food ?? 0) - (a.stats.food ?? 0))[0];
    if (food) this.eat(food);
    else this.game.toast("no edible food available", true);
  }

  card(item) {
    const main_stat = item.stats.attack ? `${item.stats.attack} attack`
      : item.stats.food ? `${item.stats.food} food`
        : item.stats.armor ? `${item.stats.armor} armor`
          : `${item.stats.durability ?? 1} condition`;
    const equipped = Object.values(this.equipment).includes(item.id) ? '<span class="equipped">equipped</span>' : "";
    return `<button class="item_card ${this.selected === item.id ? "selected" : ""}" data_item="${safe(item.id)}" type="button">${equipped}<small>${safe(item.category)}</small><strong>${safe(item.name)}</strong><footer><span>${safe(main_stat)}</span><span>${(item.stats.weight ?? 0).toFixed(1)} kg</span></footer></button>`;
  }

  render_inventory() {
    const visible = this.items.filter((item) => this.filter === "all" || item.category === this.filter || (this.filter === "material" && ["material", "tool", "ammo", "medical"].includes(item.category)));
    dom.inventory_grid.innerHTML = visible.length ? visible.map((item) => this.card(item)).join("") : '<span class="empty">nothing in this category</span>';
    dom.carry_weight.textContent = `${this.weight().toFixed(1)} / 35.0 kg`;
    dom.inventory_grid.querySelectorAll("[data_item]").forEach((button) => {
      button.addEventListener("click", () => {
        this.selected = button.dataset.item;
        this.render_inventory();
      });
    });
    this.render_inspector();
  }

  render_inspector() {
    const item = this.get(this.selected);
    if (!item) {
      dom.item_inspector.innerHTML = '<span class="empty">select an item</span>';
      return;
    }
    const stats = Object.entries(item.stats).filter(([, value]) => value !== 0).map(([name, value]) => `<div class="stat"><span>${safe(name)}</span><b>${safe(value)}</b></div>`).join("");
    const tags = item.tags.map((tag) => `<span class="tag ${["inedible", "poisoned"].includes(tag) ? "danger" : ""}">${safe(tag)}</span>`).join("");
    const use_action = item.category === "weapon" || item.slot ? "equip" : item.tags.includes("food") && !item.tags.includes("inedible") ? "eat" : item.tags.includes("medical") ? "medical" : "";
    dom.item_inspector.innerHTML = `<span class="eyebrow">${safe(item.category)} · ${item.components.length} component${item.components.length === 1 ? "" : "s"}</span><h3>${safe(item.name)}</h3><p>${safe(item.description)}</p><div class="stat_list">${stats}</div><div class="tags">${tags}</div><div class="inspector_actions">${use_action ? `<button class="primary" data_action="${use_action}" type="button">${use_action === "equip" ? "equip item" : use_action === "eat" ? "eat item" : "use medical item"}</button>` : ""}<button class="secondary" data_action="drop" type="button">drop item</button></div>`;
    dom.item_inspector.querySelectorAll("[data_action]").forEach((button) => button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "equip") this.equip(item);
      else if (action === "eat") this.eat(item);
      else if (action === "medical") this.use_medical(item);
      else {
        this.remove(item.id);
        this.selected = null;
        this.game.toast(`dropped ${item.name}`);
        this.render_inventory();
      }
    }));
  }

  render_crafting() {
    dom.craft_inventory.innerHTML = this.items.map((item) => this.card(item)).join("");
    dom.craft_inventory.querySelectorAll("[data_item]").forEach((button) => {
      button.classList.toggle("selected", this.craft_ids.includes(button.dataset.item));
      button.addEventListener("click", () => {
        const id = button.dataset.item;
        if (this.craft_ids.includes(id)) this.craft_ids = this.craft_ids.filter((item_id) => item_id !== id);
        else if (this.craft_ids.length < 2) this.craft_ids.push(id);
        else this.craft_ids = [this.craft_ids[1], id];
        this.render_crafting();
      });
    });
    const first = this.get(this.craft_ids[0]);
    const second = this.get(this.craft_ids[1]);
    this.slot(dom.craft_slot_a, first, "first item");
    this.slot(dom.craft_slot_b, second, "second item");
    this.slot(dom.craft_result, first && second ? combine_items(first, second, true) : null, "combined item");
    dom.craft_button.disabled = !(first && second);
  }

  slot(element, item, label) {
    element.classList.toggle("filled", Boolean(item));
    element.innerHTML = item ? `<span><strong>${safe(item.name)}</strong><small>${safe(item.category)} · ${(item.stats.weight ?? 0).toFixed(1)} kg</small></span>` : label;
  }

  craft() {
    const first = this.get(this.craft_ids[0]);
    const second = this.get(this.craft_ids[1]);
    if (!first || !second || first.id === second.id) return;
    const result = combine_items(first, second);
    this.remove(first.id);
    this.remove(second.id);
    this.add(result, false);
    this.craft_ids = [];
    this.game.stats.crafted += 1;
    this.game.toast(`crafted ${result.name}`);
    this.game.sound.tone(440, 0.09, 0.03, "sine", 180);
    this.render_crafting();
    this.game.update_hud();
    this.game.save(true);
  }
}

class World {
  constructor(seed) {
    this.seed = seed;
    this.blocks = new Map();
    this.interiors = new Map();
  }

  district(block_x, block_y) {
    const radius = Math.hypot(block_x, block_y);
    const noise = hash(this.seed, block_x, block_y);
    if (radius > 48) return "outskirts";
    if (radius < 4) return noise < 0.28 ? "park" : "civic";
    if (block_x > 5 && block_y < -3 && block_y > -20) return noise < 0.22 ? "medical" : "commercial";
    if (block_y > 13 || (block_x < -12 && block_y > 2)) return noise < 0.16 ? "park" : "residential";
    if (block_y < -11 || (block_x < -14 && block_y < 3)) return noise < 0.18 ? "outskirts" : "industrial";
    if (noise < 0.12) return "park";
    return noise < 0.57 ? "commercial" : "residential";
  }

  road(block_x, block_y, vertical = false) {
    const index = Math.abs(vertical ? block_x * 3 + 7 : block_y * 5 + 11) % road_names.length;
    return road_names[index];
  }

  block(block_x, block_y) {
    const key = `${block_x},${block_y}`;
    if (this.blocks.has(key)) return this.blocks.get(key);
    const district = this.district(block_x, block_y);
    const block = { key, x: block_x, y: block_y, district, buildings: this.make_buildings(block_x, block_y, district), trees: this.make_trees(block_x, block_y, district) };
    this.blocks.set(key, block);
    if (this.blocks.size > 180) this.blocks.delete(this.blocks.keys().next().value);
    return block;
  }

  building_types(district) {
    if (district === "residential") return ["house", "house", "apartments", "school", "diner"];
    if (district === "industrial") return ["warehouse", "warehouse", "factory", "police"];
    if (district === "medical") return ["hospital", "hospital", "office", "shop"];
    if (district === "civic") return ["civic", "police", "office", "hospital"];
    if (district === "outskirts") return ["house", "warehouse", "diner"];
    return ["shop", "office", "apartments", "diner", "police"];
  }

  make_buildings(block_x, block_y, district) {
    if (district === "park") return [];
    const random = rng(text_hash(`${this.seed}:${block_x}:${block_y}:buildings`));
    const origin_x = block_x * CELL + ROAD * 0.5 + 44;
    const origin_y = block_y * CELL + ROAD * 0.5 + 44;
    const area = CELL - ROAD - 88;
    const layouts = district === "residential" || district === "outskirts"
      ? [{ x: .02, y: .03, w: .44, h: .4 }, { x: .54, y: .03, w: .44, h: .4 }, { x: .02, y: .56, w: .44, h: .4 }, { x: .54, y: .56, w: .44, h: .4 }]
      : district === "industrial"
        ? [{ x: .02, y: .05, w: .58, h: .88 }, { x: .66, y: .05, w: .32, h: .88 }]
        : [{ x: .03, y: .04, w: .44, h: .9 }, { x: .53, y: .04, w: .44, h: .9 }];
    const types = this.building_types(district);
    const buildings = [];
    layouts.forEach((lot, index) => {
      if (random() < (district === "outskirts" ? .2 : .08)) return;
      const type = types[Math.floor(random() * types.length)];
      const names = building_names[type] ?? building_names.office;
      const x = origin_x + lot.x * area;
      const y = origin_y + lot.y * area;
      const w = lot.w * area;
      const h = lot.h * area;
      const floors = type === "office" ? 3 + Math.floor(random() * 5) : type === "apartments" ? 2 + Math.floor(random() * 4) : ["hospital", "civic", "school"].includes(type) ? 2 + Math.floor(random() * 3) : 1 + Math.floor(random() * 2);
      const basements = ["house", "shop", "hospital", "police", "civic"].includes(type) && random() < .65 ? 1 : 0;
      buildings.push({ id: `building:${block_x}:${block_y}:${index}`, block_x, block_y, index, x, y, w, h, door_x: x + w * (.3 + random() * .4), door_y: y + h + 4, district, type, name: names[Math.floor(random() * names.length)], floors, basements, seed: Math.floor(random() * 2147483647) });
    });
    return buildings;
  }

  make_trees(block_x, block_y, district) {
    const random = rng(text_hash(`${this.seed}:${block_x}:${block_y}:trees`));
    const count = district === "park" ? 34 : district === "residential" ? 9 : district === "outskirts" ? 16 : 3;
    return Array.from({ length: count }, () => ({ x: block_x * CELL + ROAD * .5 + 40 + random() * (CELL - ROAD - 80), y: block_y * CELL + ROAD * .5 + 40 + random() * (CELL - ROAD - 80), radius: 13 + random() * 15 }));
  }

  nearby(x, y, range = 1) {
    const center_x = Math.floor(x / CELL);
    const center_y = Math.floor(y / CELL);
    const result = [];
    for (let by = center_y - range; by <= center_y + range; by += 1) for (let bx = center_x - range; bx <= center_x + range; bx += 1) result.push(this.block(bx, by));
    return result;
  }

  interior(building, floor) {
    const key = `${building.id}:${floor}`;
    if (this.interiors.has(key)) return this.interiors.get(key);
    const random = rng(building.seed + floor * 8191);
    const width = ["warehouse", "factory"].includes(building.type) ? 1120 : 920;
    const height = ["hospital", "school", "civic"].includes(building.type) ? 780 : 680;
    const layout = {
      key,
      width,
      height,
      walls: [],
      doors: [],
      passages: [],
      rooms: [],
      clearances: [],
      furniture: [],
      containers: [],
      up: floor < building.floors - 1 ? { x: width - 105, y: 95 } : null,
      down: floor > -building.basements ? { x: 105, y: 95 } : null,
      exit: floor === 0 ? { x: width * .5, y: height - 38 } : null,
      entry: floor === 0 ? { x: width * .5, y: height - 90 } : null,
    };
    this.make_interior_floor_plan(layout, building.type, random);
    for (const point of [layout.entry, layout.exit, layout.up, layout.down]) if (point) layout.clearances.push({ x: point.x, y: point.y, radius: point === layout.exit ? 50 : 76 });
    for (const door of layout.doors) layout.clearances.push({ x: door.x, y: door.y, radius: Math.max(60, door.width * .5) });
    this.populate_interior(layout, building, floor, random);
    this.interiors.set(key, layout);
    if (this.interiors.size > 120) this.interiors.delete(this.interiors.keys().next().value);
    return layout;
  }

  add_partition(layout, orientation, position, start, end, openings, opening_width = 128) {
    const thickness = 12;
    const half_opening = opening_width * .5;
    const gaps = openings.map((opening) => ({ start: clamp(opening - half_opening, start, end), end: clamp(opening + half_opening, start, end), center: opening })).sort((first, second) => first.start - second.start);
    let cursor = start;
    for (const gap of gaps) {
      if (gap.start > cursor) {
        if (orientation === "horizontal") layout.walls.push({ x: cursor, y: position, w: gap.start - cursor, h: thickness });
        else layout.walls.push({ x: position, y: cursor, w: thickness, h: gap.start - cursor });
      }
      cursor = Math.max(cursor, gap.end);
      layout.doors.push(orientation === "horizontal" ? { x: gap.center, y: position, orientation, width: opening_width } : { x: position, y: gap.center, orientation, width: opening_width });
      layout.passages.push(orientation === "horizontal"
        ? { x: gap.center - half_opening, y: position - 72, w: opening_width, h: 144, kind: "door" }
        : { x: position - 72, y: gap.center - half_opening, w: 144, h: opening_width, kind: "door" });
    }
    if (cursor < end) {
      if (orientation === "horizontal") layout.walls.push({ x: cursor, y: position, w: end - cursor, h: thickness });
      else layout.walls.push({ x: position, y: cursor, w: thickness, h: end - cursor });
    }
  }

  make_interior_floor_plan(layout, type, random) {
    if (["warehouse", "factory"].includes(type)) return this.make_industrial_floor_plan(layout);
    if (["house", "shop", "diner"].includes(type)) return this.make_front_room_floor_plan(layout, type);
    this.make_corridor_floor_plan(layout, type, random);
  }

  make_corridor_floor_plan(layout, type, random) {
    const top = 28;
    const bottom = layout.height - 28;
    const hall_left = layout.width * .5 - 62;
    const hall_right = layout.width * .5 + 62;
    const bands = ["hospital", "school", "civic", "apartments"].includes(type) ? 3 : 2;
    const band_height = (bottom - top) / bands;
    const left_doors = [];
    const right_doors = [];
    for (let index = 0; index < bands; index += 1) {
      const band_top = top + band_height * index;
      const band_bottom = top + band_height * (index + 1);
      const variation = Math.min(28, band_height * .12);
      const left_door_y = (band_top + band_bottom) * .5 + (random() - .5) * variation;
      const right_door_y = (band_top + band_bottom) * .5 + (random() - .5) * variation;
      left_doors.push(left_door_y);
      right_doors.push(right_door_y);
      layout.rooms.push({ x: top, y: band_top, w: hall_left - top, h: band_height, door_x: hall_left, door_y: left_door_y, kind: `${type} room` });
      layout.rooms.push({ x: hall_right + 12, y: band_top, w: layout.width - top - hall_right - 12, h: band_height, door_x: hall_right, door_y: right_door_y, kind: `${type} room` });
      if (index === 0) continue;
      const divider_y = band_top;
      layout.walls.push({ x: top, y: divider_y, w: hall_left - top, h: 12 });
      layout.walls.push({ x: hall_right, y: divider_y, w: layout.width - top - hall_right, h: 12 });
    }
    this.add_partition(layout, "vertical", hall_left, top, bottom, left_doors);
    this.add_partition(layout, "vertical", hall_right, top, bottom, right_doors);
    if (layout.entry) layout.passages.push({ x: hall_left + 12, y: 54, w: hall_right - hall_left - 12, h: layout.entry.y - 54, kind: "entry" });
  }

  make_front_room_floor_plan(layout, type) {
    const edge = 28;
    const center = layout.width * .5;
    const back_wall_y = layout.height * .4;
    const divider_end = back_wall_y - 96;
    this.add_partition(layout, "horizontal", back_wall_y, edge, layout.width - edge, [center], 144);
    this.add_partition(layout, "vertical", center, edge, divider_end, []);
    if (layout.entry) layout.passages.push({ x: center - 72, y: divider_end + 32, w: 144, h: layout.entry.y - divider_end - 32, kind: "entry" });
    layout.rooms.push({ x: edge, y: edge, w: center - edge, h: back_wall_y - edge, door_x: center, door_y: back_wall_y, kind: type === "house" ? "bedroom" : "stock room" });
    layout.rooms.push({ x: center + 12, y: edge, w: layout.width - center - edge - 12, h: back_wall_y - edge, door_x: center, door_y: back_wall_y, kind: type === "diner" ? "kitchen" : "back room" });
    layout.rooms.push({ x: edge, y: back_wall_y + 12, w: layout.width - edge * 2, h: layout.height - back_wall_y - edge - 12, door_x: layout.width * .5, door_y: layout.height - 90, kind: type === "house" ? "living room" : type === "diner" ? "dining room" : "shop floor" });
  }

  make_industrial_floor_plan(layout) {
    const edge = 28;
    const office_left = layout.width - 310;
    const office_bottom = 248;
    this.add_partition(layout, "vertical", office_left, edge, office_bottom, [148], 120);
    this.add_partition(layout, "horizontal", office_bottom, office_left, layout.width - edge, [layout.width - 148], 120);
    if (layout.entry) layout.passages.push({ x: layout.width * .5 - 72, y: 54, w: 144, h: layout.entry.y - 54, kind: "entry" });
    layout.rooms.push({ x: edge, y: edge, w: office_left - edge, h: office_bottom - edge, door_x: office_left, door_y: 148, kind: "workshop" });
    layout.rooms.push({ x: office_left + 12, y: edge, w: layout.width - office_left - edge - 12, h: office_bottom - edge, door_x: layout.width - 148, door_y: office_bottom, kind: "office" });
    layout.rooms.push({ x: edge, y: office_bottom + 12, w: layout.width - edge * 2, h: layout.height - office_bottom - edge - 12, door_x: layout.width * .5, door_y: layout.height - 90, kind: "warehouse floor" });
  }

  populate_interior(layout, building, floor, random) {
    const count = building.type === "warehouse" ? 8 : 5 + Math.floor(random() * 4);
    for (let index = 0; index < count; index += 1) {
      const kind = this.container_kind(building.type, index);
      const width = kind === "crate" ? 48 : 38;
      const height = kind === "crate" ? 42 : 32;
      const position = this.place_interior_fixture(layout, width, height, random);
      if (!position) continue;
      const container = { id: `container:${building.id}:${floor}:${index}`, x: position.x, y: position.y, w: width, h: height, kind, table: this.loot_table(building.type, kind) };
      layout.containers.push(container);
      layout.furniture.push(container);
    }
    if (["warehouse", "factory"].includes(building.type)) {
      for (let row = 0; row < 2; row += 1) {
        for (let column = 0; column < 4; column += 1) {
          const rack = { x: 105 + column * 170, y: 320 + row * 150, w: 112, h: 42, kind: "rack" };
          if (this.interior_fixture_fits(layout, rack)) layout.furniture.push(rack);
        }
      }
    }
    const furniture_count = ["hospital", "school", "apartments"].includes(building.type) ? 8 : 5;
    for (let index = 0; index < furniture_count; index += 1) {
      const width = 44 + random() * 40;
      const height = 24 + random() * 24;
      const position = this.place_interior_fixture(layout, width, height, random);
      if (!position) continue;
      layout.furniture.push({ x: position.x, y: position.y, w: width, h: height, kind: building.type === "hospital" ? "bed" : building.type === "office" ? "desk" : "table" });
    }
  }

  place_interior_fixture(layout, width, height, random) {
    const rooms = layout.rooms.filter((room) => room.w > width + 70 && room.h > height + 70);
    for (let attempt = 0; attempt < 80 && rooms.length; attempt += 1) {
      const room = rooms[Math.floor(random() * rooms.length)];
      const x = room.x + 35 + random() * (room.w - width - 70);
      const y = room.y + 35 + random() * (room.h - height - 70);
      const fixture = { x, y, w: width, h: height };
      if (this.interior_fixture_fits(layout, fixture)) return fixture;
    }
    return null;
  }

  interior_fixture_fits(layout, fixture) {
    if (fixture.x < 36 || fixture.y < 36 || fixture.x + fixture.w > layout.width - 36 || fixture.y + fixture.h > layout.height - 36) return false;
    if (layout.walls.some((wall) => fixture.x < wall.x + wall.w + 14 && fixture.x + fixture.w + 14 > wall.x && fixture.y < wall.y + wall.h + 14 && fixture.y + fixture.h + 14 > wall.y)) return false;
    if (layout.clearances.some((clearance) => circle_rect(clearance.x, clearance.y, clearance.radius, fixture))) return false;
    if (layout.passages.some((passage) => fixture.x < passage.x + passage.w + 12 && fixture.x + fixture.w + 12 > passage.x && fixture.y < passage.y + passage.h + 12 && fixture.y + fixture.h + 12 > passage.y)) return false;
    return !layout.furniture.some((item) => fixture.x < item.x + item.w + 12 && fixture.x + fixture.w + 12 > item.x && fixture.y < item.y + item.h + 12 && fixture.y + fixture.h + 12 > item.y);
  }

  interior_point_open(layout, x, y, radius, avoid_clearances = false) {
    if (x < 36 + radius || y < 36 + radius || x > layout.width - 36 - radius || y > layout.height - 36 - radius) return false;
    if (layout.walls.some((wall) => circle_rect(x, y, radius, wall))) return false;
    if (avoid_clearances && layout.clearances.some((clearance) => distance_sq(x, y, clearance.x, clearance.y) < (radius + clearance.radius + 24) ** 2)) return false;
    if (avoid_clearances && layout.passages.some((passage) => circle_rect(x, y, radius + 24, passage))) return false;
    return true;
  }

  random_interior_point(layout, random, radius, avoid_clearances = false) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const room = layout.rooms[Math.floor(random() * layout.rooms.length)];
      const x = room.x + radius + 24 + random() * Math.max(1, room.w - radius * 2 - 48);
      const y = room.y + radius + 24 + random() * Math.max(1, room.h - radius * 2 - 48);
      if (this.interior_point_open(layout, x, y, radius, avoid_clearances)) return { x, y };
    }
    return null;
  }

  container_kind(type, index) {
    if (["house", "apartments"].includes(type)) return index % 3 === 0 ? "fridge" : index % 2 === 0 ? "wardrobe" : "cabinet";
    if (type === "hospital") return index % 2 === 0 ? "medical cabinet" : "locker";
    if (["office", "civic"].includes(type)) return index % 2 === 0 ? "desk" : "filing cabinet";
    return index % 2 === 0 ? "crate" : "locker";
  }

  loot_table(type, kind) {
    if (type === "hospital") return "medical";
    if (type === "police") return "police";
    if (["warehouse", "factory"].includes(type)) return "industrial";
    if (["shop", "diner"].includes(type) || kind === "fridge") return kind === "fridge" ? "kitchen" : "shop";
    if (["office", "civic", "school"].includes(type)) return "office";
    return kind === "wardrobe" ? "bedroom" : "kitchen";
  }
}

class Game {
  constructor() {
    this.canvas = dom.game_canvas;
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.map_ctx = dom.minimap_canvas.getContext("2d");
    this.world = new World(SEED);
    this.sound = new Sound();
    this.inventory = new Inventory(this);
    this.player = this.new_player();
    this.camera = { x: this.player.x, y: this.player.y, zoom: 1 };
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    this.mobile = { x: 0, y: 0 };
    this.started = false;
    this.paused = true;
    this.dead = false;
    this.world_minutes = 7.7 * 60;
    this.play_time = 0;
    this.last_save = 0;
    this.last_frame = performance.now();
    this.last_attack = 0;
    this.hunger_timer = 0;
    this.interaction = null;
    this.inside = null;
    this.active_container = null;
    this.container_items = new Map();
    this.looted = new Set();
    this.killed = new Set();
    this.outdoor_enemies = new Map();
    this.indoor_enemies = new Map();
    this.stats = { kills: 0, found: 0, crafted: 0 };
    this.shots = [];
    this.swings = [];
    this.blood = [];
    this.shake = 0;
    this.screen_w = 1;
    this.screen_h = 1;
    this.dpr = 1;
    this.bind();
    this.resize();
    dom.continue_button.hidden = !this.read_save();
    this.update_hud();
    requestAnimationFrame((time) => this.frame(time));
  }

  new_player() {
    return { x: -8000, y: 6000, angle: -Math.PI * .5, health: 100, stamina: 100, hunger: 82, hurt_time: 0 };
  }

  bind() {
    globalThis.addEventListener("resize", () => this.resize());
    globalThis.addEventListener("blur", () => { this.keys.clear(); this.mouse.down = false; });
    globalThis.addEventListener("beforeunload", () => this.save(true));
    document.addEventListener("keydown", (event) => this.key_down(event));
    document.addEventListener("keyup", (event) => this.keys.delete(event.code));
    this.canvas.addEventListener("pointermove", (event) => this.pointer_move(event));
    this.canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      this.mouse.down = true;
      this.sound.start();
      this.attack();
    });
    globalThis.addEventListener("pointerup", () => this.mouse.down = false);
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    dom.new_game_button.addEventListener("click", () => this.begin());
    dom.continue_button.addEventListener("click", () => this.continue());
    dom.retry_button.addEventListener("click", () => this.continue());
    dom.guide_button.addEventListener("click", () => dom.guide_overlay.hidden = false);
    dom.close_guide.addEventListener("click", () => dom.guide_overlay.hidden = true);
    dom.understood_button.addEventListener("click", () => dom.guide_overlay.hidden = true);
    document.querySelectorAll("[data_close]").forEach((button) => button.addEventListener("click", () => this.close_panels()));
    document.querySelectorAll("[data_filter]").forEach((button) => button.addEventListener("click", () => {
      this.inventory.filter = button.dataset.filter;
      document.querySelectorAll("[data_filter]").forEach((item) => item.classList.toggle("active", item === button));
      this.inventory.render_inventory();
    }));
    document.querySelectorAll("[data_quick]").forEach((button) => button.addEventListener("click", () => this.quick(button.dataset.quick)));
    dom.clear_craft.addEventListener("click", () => { this.inventory.craft_ids = []; this.inventory.render_crafting(); });
    dom.craft_button.addEventListener("click", () => this.inventory.craft());
    dom.take_all.addEventListener("click", () => this.take_all());
    this.bind_touch();
  }

  bind_touch() {
    const stick = dom.move_stick;
    const knob = stick.querySelector("i");
    const move = (event) => {
      const rect = stick.getBoundingClientRect();
      const dx = event.clientX - rect.left - rect.width * .5;
      const dy = event.clientY - rect.top - rect.height * .5;
      const direction = normal(dx, dy);
      const power = Math.min(1, Math.hypot(dx, dy) / (rect.width * .34));
      this.mobile = { x: direction.x * power, y: direction.y * power };
      knob.style.transform = `translate(${this.mobile.x * 25}px, ${this.mobile.y * 25}px)`;
      event.preventDefault();
    };
    const stop = () => { this.mobile = { x: 0, y: 0 }; knob.style.transform = ""; };
    stick.addEventListener("pointerdown", (event) => { stick.setPointerCapture(event.pointerId); move(event); });
    stick.addEventListener("pointermove", (event) => { if (stick.hasPointerCapture(event.pointerId)) move(event); });
    stick.addEventListener("pointerup", stop);
    stick.addEventListener("pointercancel", stop);
    dom.touch_use.addEventListener("pointerdown", () => this.use());
    dom.touch_attack.addEventListener("pointerdown", () => this.attack());
  }

  key_down(event) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"].includes(event.code)) event.preventDefault();
    if (event.repeat && ["KeyE", "KeyI", "KeyC", "Escape", "Digit1", "Digit2"].includes(event.code)) return;
    this.keys.add(event.code);
    if (event.code === "KeyE") this.use();
    else if (event.code === "KeyI" || event.code === "Tab") this.toggle_inventory();
    else if (event.code === "KeyC") this.toggle_crafting();
    else if (event.code === "Digit1") this.inventory.best_weapon();
    else if (event.code === "Digit2") this.inventory.best_food();
    else if (event.code === "Space") this.attack();
    else if (event.code === "Escape") this.close_panels();
  }

  pointer_move(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = event.clientX - rect.left;
    this.mouse.y = event.clientY - rect.top;
    const dx = this.mouse.x - this.screen_w * .5;
    const dy = this.mouse.y - this.screen_h * .5;
    if (Math.abs(dx) + Math.abs(dy) > 8) this.player.angle = Math.atan2(dy, dx);
  }

  quick(action) {
    if (action === "weapon") this.inventory.best_weapon();
    else if (action === "food") this.inventory.best_food();
    else if (action === "inventory") this.toggle_inventory();
    else this.toggle_crafting();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    this.screen_w = Math.max(1, rect.width);
    this.screen_h = Math.max(1, rect.height);
    this.canvas.width = Math.floor(this.screen_w * this.dpr);
    this.canvas.height = Math.floor(this.screen_h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  begin() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch { // Keep new runs available when local file storage is restricted.
    }
    this.player = this.new_player();
    this.camera = { x: this.player.x, y: this.player.y, zoom: 1 };
    this.inventory.reset();
    this.world_minutes = 7.7 * 60;
    this.play_time = 0;
    this.last_save = 0;
    this.inside = null;
    this.active_container = null;
    this.container_items.clear();
    this.looted.clear();
    this.killed.clear();
    this.outdoor_enemies.clear();
    this.indoor_enemies.clear();
    this.stats = { kills: 0, found: 0, crafted: 0 };
    this.started = true;
    this.dead = false;
    this.paused = false;
    dom.start_screen.hidden = true;
    dom.death_screen.hidden = true;
    this.sound.start();
    this.close_panels();
    this.toast("find shelter before nightfall");
    this.save(true);
    this.update_hud();
  }

  continue() {
    const data = this.read_save();
    if (!data) return this.begin();
    this.player = { ...this.new_player(), ...(data.player ?? {}) };
    this.player.health = Math.max(1, this.player.health);
    this.inventory.restore(data.inventory);
    this.world_minutes = data.world_minutes ?? this.world_minutes;
    this.play_time = data.play_time ?? 0;
    this.stats = { ...this.stats, ...(data.stats ?? {}) };
    this.looted = new Set(data.looted ?? []);
    this.killed = new Set(data.killed ?? []);
    this.container_items = new Map(data.container_items ?? []);
    this.inside = null;
    if (data.inside?.building_id) {
      const building = this.find_building(data.inside.building_id);
      if (building) {
        this.inside = { building, floor: data.inside.floor ?? 0 };
        this.player.x = data.inside.x ?? 460;
        this.player.y = data.inside.y ?? 600;
        const layout = this.layout();
        if (!this.world.interior_point_open(layout, this.player.x, this.player.y, PLAYER_RADIUS)) {
          const safe_point = layout.entry ?? layout.down ?? layout.up ?? { x: layout.width * .5, y: layout.height - 90 };
          this.player.x = safe_point.x;
          this.player.y = safe_point.y;
        }
      }
    }
    this.camera = { x: this.player.x, y: this.player.y, zoom: 1 };
    this.outdoor_enemies.clear();
    this.indoor_enemies.clear();
    this.started = true;
    this.dead = false;
    this.paused = false;
    dom.start_screen.hidden = true;
    dom.death_screen.hidden = true;
    this.sound.start();
    this.close_panels();
    this.toast("save restored");
    this.update_hud();
  }

  read_save() {
    try {
      const text = localStorage.getItem(SAVE_KEY);
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  save(force = false) {
    if (!this.started || this.dead || (!force && this.play_time - this.last_save < 8)) return;
    const inside = this.inside ? { building_id: this.inside.building.id, floor: this.inside.floor, x: this.player.x, y: this.player.y } : null;
    const data = {
      version: 1,
      player: { ...this.player },
      inside,
      inventory: { items: this.inventory.items, equipment: this.inventory.equipment },
      world_minutes: this.world_minutes,
      play_time: this.play_time,
      stats: this.stats,
      looted: [...this.looted],
      killed: [...this.killed].slice(-4000),
      container_items: [...this.container_items.entries()],
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      this.last_save = this.play_time;
    } catch {
      this.toast("local save storage is unavailable", true);
    }
  }

  find_building(id) {
    const parts = id.split(":");
    if (parts.length !== 4) return null;
    return this.world.block(Number(parts[1]), Number(parts[2])).buildings.find((building) => building.id === id) ?? null;
  }

  toggle_inventory() {
    if (!this.started || this.dead) return;
    const open = dom.inventory_overlay.hidden;
    this.close_panels();
    if (open) {
      dom.inventory_overlay.hidden = false;
      this.inventory.render_inventory();
      this.paused = true;
    }
  }

  toggle_crafting() {
    if (!this.started || this.dead) return;
    const open = dom.crafting_overlay.hidden;
    this.close_panels();
    if (open) {
      dom.crafting_overlay.hidden = false;
      this.inventory.render_crafting();
      this.paused = true;
    }
  }

  close_panels() {
    document.querySelectorAll(".overlay").forEach((panel) => panel.hidden = true);
    this.active_container = null;
    this.paused = !this.started || this.dead;
  }

  toast(message, bad = false) {
    const toast = document.createElement("div");
    toast.className = `toast${bad ? " bad" : ""}`;
    toast.textContent = message;
    dom.toast_stack.append(toast);
    globalThis.setTimeout(() => toast.classList.add("fade"), 2600);
    globalThis.setTimeout(() => toast.remove(), 2880);
  }

  frame(time) {
    const delta = Math.min(.05, Math.max(.001, (time - this.last_frame) / 1000));
    this.last_frame = time;
    if (this.started && !this.paused && !this.dead) this.update(delta);
    this.render();
    requestAnimationFrame((next) => this.frame(next));
  }

  update(delta) {
    this.play_time += delta;
    this.world_minutes += delta * .75;
    this.player.hurt_time = Math.max(0, this.player.hurt_time - delta);
    this.update_player(delta);
    this.update_enemies(delta);
    this.shots.forEach((shot) => shot.life -= delta);
    this.shots = this.shots.filter((shot) => shot.life > 0);
    this.swings.forEach((swing) => swing.life -= delta);
    this.swings = this.swings.filter((swing) => swing.life > 0);
    this.hunger_timer += delta;
    if (this.hunger_timer >= 2) {
      this.hunger_timer = 0;
      this.player.hunger = clamp(this.player.hunger - .1, 0, 100);
      if (this.player.hunger <= 0) this.damage_player(1.5);
    }
    this.find_interaction();
    const camera_weight = 1 - Math.pow(.0001, delta);
    this.camera.x += (this.player.x - this.camera.x) * camera_weight;
    this.camera.y += (this.player.y - this.camera.y) * camera_weight;
    this.shake = Math.max(0, this.shake - delta * 18);
    if (this.mouse.down) this.attack();
    if (Math.floor(this.play_time) !== Math.floor(this.play_time - delta)) this.update_hud();
    this.save();
  }

  update_player(delta) {
    let x = this.mobile.x;
    let y = this.mobile.y;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) y -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) y += 1;
    const direction = normal(x, y);
    const sprint = this.keys.has("ShiftLeft") && this.player.stamina > 1 && (direction.x || direction.y);
    const weight_penalty = clamp((this.inventory.weight() - 22) * .012, 0, .3);
    const speed = (sprint ? 260 : 170) * (1 - weight_penalty);
    const pointer_is_idle = Math.abs(this.mouse.x - this.screen_w * .5) + Math.abs(this.mouse.y - this.screen_h * .5) < 8;
    if ((direction.x || direction.y) && (pointer_is_idle || matchMedia("(pointer: coarse)").matches)) this.player.angle = Math.atan2(direction.y, direction.x);
    this.move_player(direction.x * speed * delta, 0);
    this.move_player(0, direction.y * speed * delta);
    this.player.stamina = clamp(this.player.stamina + (sprint ? -18 : 11) * delta, 0, 100);
  }

  layout() {
    return this.world.interior(this.inside.building, this.inside.floor);
  }

  move_player(dx, dy) {
    const x = this.player.x + dx;
    const y = this.player.y + dy;
    if (this.inside) {
      const layout = this.layout();
      if (x < 36 + PLAYER_RADIUS || y < 36 + PLAYER_RADIUS || x > layout.width - 36 - PLAYER_RADIUS || y > layout.height - 36 - PLAYER_RADIUS || layout.walls.some((wall) => circle_rect(x, y, PLAYER_RADIUS, wall))) return;
    } else {
      const limit = CITY_RADIUS * CELL;
      if (Math.abs(x) > limit || Math.abs(y) > limit) return;
      if (this.world.nearby(x, y, 1).some((block) => block.buildings.some((building) => circle_rect(x, y, PLAYER_RADIUS + 2, building)))) return;
    }
    this.player.x = x;
    this.player.y = y;
  }

  active_enemies() {
    if (this.inside) return this.enemies_inside(this.inside.building, this.inside.floor);
    return this.world.nearby(this.player.x, this.player.y, 1).flatMap((block) => this.enemies_outside(block));
  }

  enemy(id, x, y, random) {
    const variant_roll = random();
    const variant = variant_roll > .93 ? "brute" : variant_roll < .18 ? "runner" : "walker";
    return { id, x, y, angle: random() * TAU, health: variant === "brute" ? 82 : 45 + random() * 18, speed: variant === "brute" ? 50 : 55 + random() * 22, radius: variant === "brute" ? 24 : 18, attack: random(), wander: random() * 3, wander_angle: random() * TAU, alerted: false, dead: false, variant };
  }

  enemies_outside(block) {
    if (this.outdoor_enemies.has(block.key)) return this.outdoor_enemies.get(block.key);
    const random = rng(text_hash(`${SEED}:${block.key}:infected`));
    const count = Math.floor((4 + random() * 7) * districts[block.district].threat);
    const enemies = [];
    for (let index = 0; index < count; index += 1) {
      const id = `infected:out:${block.key}:${index}`;
      if (this.killed.has(id)) continue;
      let x = block.x * CELL + random() * CELL;
      let y = block.y * CELL + random() * CELL;
      let attempts = 0;
      while (block.buildings.some((building) => in_rect(x, y, building, 32)) && attempts++ < 20) { x = block.x * CELL + random() * CELL; y = block.y * CELL + random() * CELL; }
      enemies.push(this.enemy(id, x, y, random));
    }
    this.outdoor_enemies.set(block.key, enemies);
    if (this.outdoor_enemies.size > 60) this.outdoor_enemies.delete(this.outdoor_enemies.keys().next().value);
    return enemies;
  }

  enemies_inside(building, floor) {
    const key = `${building.id}:${floor}`;
    if (this.indoor_enemies.has(key)) return this.indoor_enemies.get(key);
    const layout = this.world.interior(building, floor);
    const random = rng(building.seed + floor * 17713 + 91);
    const count = 2 + Math.floor(random() * 4) + (building.type === "hospital" ? 2 : 0);
    const enemies = [];
    for (let index = 0; index < count; index += 1) {
      const id = `infected:in:${building.id}:${floor}:${index}`;
      if (this.killed.has(id)) continue;
      const enemy = this.enemy(id, 0, 0, random);
      const position = this.world.random_interior_point(layout, random, enemy.radius + 4, true);
      if (!position) continue;
      enemy.x = position.x;
      enemy.y = position.y;
      enemies.push(enemy);
    }
    this.indoor_enemies.set(key, enemies);
    return enemies;
  }

  update_enemies(delta) {
    for (const enemy of this.active_enemies()) {
      if (enemy.dead) continue;
      enemy.attack -= delta;
      enemy.wander -= delta;
      const distance = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
      if (distance < 420 || enemy.alerted) {
        enemy.alerted = distance < 760;
        const direction = normal(this.player.x - enemy.x, this.player.y - enemy.y);
        enemy.angle = Math.atan2(direction.y, direction.x);
        this.move_enemy(enemy, direction.x * enemy.speed * (enemy.variant === "runner" ? 1.35 : 1) * delta, direction.y * enemy.speed * (enemy.variant === "runner" ? 1.35 : 1) * delta);
        if (distance < enemy.radius + PLAYER_RADIUS + 8 && enemy.attack <= 0) {
          enemy.attack = enemy.variant === "runner" ? .8 : 1.15;
          this.damage_player(enemy.variant === "brute" ? 18 : 9);
        }
      } else {
        if (enemy.wander <= 0) {
          enemy.wander = 1.5 + hash(text_hash(enemy.id), Math.floor(this.play_time)) * 3.5;
          enemy.wander_angle += (hash(text_hash(enemy.id), Math.floor(this.play_time), 2) - .5) * 2.4;
        }
        this.move_enemy(enemy, Math.cos(enemy.wander_angle) * enemy.speed * .22 * delta, Math.sin(enemy.wander_angle) * enemy.speed * .22 * delta);
      }
    }
  }

  move_enemy(enemy, dx, dy) {
    const x = enemy.x + dx;
    const y = enemy.y + dy;
    let blocked;
    if (this.inside) {
      const layout = this.layout();
      blocked = x < 40 || y < 40 || x > layout.width - 40 || y > layout.height - 40 || layout.walls.some((wall) => circle_rect(x, y, enemy.radius, wall));
    } else {
      const bx = Math.floor(x / CELL);
      const by = Math.floor(y / CELL);
      blocked = [this.world.block(bx, by), this.world.block(bx - 1, by), this.world.block(bx, by - 1)].some((block) => block.buildings.some((building) => circle_rect(x, y, enemy.radius, building)));
    }
    if (!blocked) { enemy.x = x; enemy.y = y; }
    else enemy.wander_angle += Math.PI * .63;
  }

  damage_player(raw) {
    if (this.player.hurt_time > 0 || this.dead) return;
    const damage = Math.max(2, raw * (1 - Math.min(.68, this.inventory.armor() / 100)));
    this.player.health = clamp(this.player.health - damage, 0, 100);
    this.player.hurt_time = .55;
    this.shake = Math.max(this.shake, 8);
    this.sound.tone(75, .18, .07, "sawtooth", -25);
    this.update_hud();
    if (this.player.health <= 0) this.die();
  }

  attack() {
    if (!this.started || this.paused || this.dead) return;
    const weapon = this.inventory.equipped("weapon");
    const firearm = weapon?.tags.includes("firearm");
    const now = performance.now() / 1000;
    const interval = firearm ? .34 : weapon ? .48 : .62;
    if (now - this.last_attack < interval) return;
    this.last_attack = now;
    if (firearm) {
      if (!weapon.ammo_type || !this.inventory.use_ammo(weapon.ammo_type)) {
        this.toast("empty — find ammunition", true);
        return this.sound.tone(180, .04, .025, "square", -30);
      }
      this.fire(weapon);
    } else this.swing(weapon);
    this.update_hud();
  }

  swing(weapon) {
    const attack = weapon?.stats.attack ?? 7;
    const range = weapon?.stats.range ?? 46;
    let target = null;
    let nearest = Infinity;
    for (const enemy of this.active_enemies()) {
      if (enemy.dead) continue;
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const distance = Math.hypot(dx, dy);
      const difference = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - this.player.angle), Math.cos(Math.atan2(dy, dx) - this.player.angle)));
      if (distance < range + enemy.radius && difference < .8 && distance < nearest) { target = enemy; nearest = distance; }
    }
    this.sound.tone(120, .08, .035, "square", -60);
    this.shake = Math.max(this.shake, 2);
    this.swings.push({ x: this.player.x, y: this.player.y, angle: this.player.angle, range, life: .12 });
    if (target) this.hurt_enemy(target, attack);
    this.alert((weapon?.stats.noise ?? 4) * 5);
  }

  fire(weapon) {
    const shotgun = weapon.tags.includes("shell");
    const pellets = shotgun ? 5 : 1;
    for (let pellet = 0; pellet < pellets; pellet += 1) {
      const angle = this.player.angle + (shotgun ? (pellet - 2) * .055 : 0);
      const hit = this.ray_hit(angle, weapon.stats.range ?? 500);
      const x = hit?.x ?? this.player.x + Math.cos(angle) * (weapon.stats.range ?? 500);
      const y = hit?.y ?? this.player.y + Math.sin(angle) * (weapon.stats.range ?? 500);
      this.shots.push({ x1: this.player.x, y1: this.player.y, x2: x, y2: y, life: .08 });
      if (hit) this.hurt_enemy(hit.enemy, shotgun ? weapon.stats.attack * .32 : weapon.stats.attack);
    }
    this.sound.tone(shotgun ? 65 : 95, shotgun ? .24 : .14, shotgun ? .14 : .09, "sawtooth", -45);
    this.shake = Math.max(this.shake, shotgun ? 10 : 6);
    this.alert((weapon.stats.noise ?? 70) * 10);
  }

  ray_hit(angle, range) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let best = null;
    let nearest = range;
    for (const enemy of this.active_enemies()) {
      if (enemy.dead) continue;
      const rx = enemy.x - this.player.x;
      const ry = enemy.y - this.player.y;
      const projection = rx * dx + ry * dy;
      if (projection <= 0 || projection > nearest) continue;
      const x = this.player.x + dx * projection;
      const y = this.player.y + dy * projection;
      if (distance_sq(x, y, enemy.x, enemy.y) <= enemy.radius ** 2) { nearest = projection; best = { enemy, x, y }; }
    }
    return best;
  }

  hurt_enemy(enemy, damage) {
    enemy.health -= damage;
    enemy.alerted = true;
    this.blood.push({ x: enemy.x, y: enemy.y, radius: 4 + Math.random() * 7, inside: this.inside ? `${this.inside.building.id}:${this.inside.floor}` : null });
    if (this.blood.length > 180) this.blood.splice(0, 30);
    if (enemy.health > 0) return;
    enemy.dead = true;
    this.killed.add(enemy.id);
    this.stats.kills += 1;
    this.toast("infected neutralised");
    if (hash(text_hash(enemy.id), 9) < .25) this.inventory.add(make_item(hash(text_hash(enemy.id), 10) < .5 ? "energy bar" : "cloth"));
  }

  alert(radius) {
    for (const enemy of this.active_enemies()) if (!enemy.dead && distance_sq(enemy.x, enemy.y, this.player.x, this.player.y) < radius ** 2) enemy.alerted = true;
  }

  find_interaction() {
    const choices = [];
    if (this.inside) {
      const layout = this.layout();
      if (layout.exit) choices.push({ type: "exit", x: layout.exit.x, y: layout.exit.y, label: "leave building" });
      if (layout.up) choices.push({ type: "up", x: layout.up.x, y: layout.up.y, label: "go upstairs" });
      if (layout.down) choices.push({ type: "down", x: layout.down.x, y: layout.down.y, label: "go downstairs" });
      for (const container of layout.containers) if (!this.looted.has(container.id)) choices.push({ type: "container", x: container.x + container.w * .5, y: container.y + container.h * .5, label: `search ${container.kind}`, container });
    } else {
      for (const block of this.world.nearby(this.player.x, this.player.y, 1)) for (const building of block.buildings) choices.push({ type: "enter", x: building.door_x, y: building.door_y, label: `enter ${building.name}`, building });
    }
    let nearest = USE_RANGE ** 2;
    this.interaction = null;
    for (const choice of choices) {
      const distance = distance_sq(this.player.x, this.player.y, choice.x, choice.y);
      if (distance < nearest) { nearest = distance; this.interaction = choice; }
    }
    if (this.interaction) {
      dom.interaction_prompt.innerHTML = `<kbd>e</kbd>${safe(this.interaction.label)}`;
      dom.interaction_prompt.classList.add("visible");
    } else {
      dom.interaction_prompt.textContent = "";
      dom.interaction_prompt.classList.remove("visible");
    }
  }

  use() {
    if (!this.started || this.paused || !this.interaction) return;
    if (this.interaction.type === "enter") this.enter(this.interaction.building);
    else if (this.interaction.type === "exit") this.exit();
    else if (this.interaction.type === "up") this.change_floor(1);
    else if (this.interaction.type === "down") this.change_floor(-1);
    else this.open_container(this.interaction.container);
  }

  enter(building) {
    this.inside = { building, floor: 0 };
    const layout = this.layout();
    this.player.x = layout.entry.x;
    this.player.y = layout.entry.y;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.toast(`entered ${building.name}`);
    this.update_hud();
    this.save(true);
  }

  exit() {
    const building = this.inside.building;
    this.inside = null;
    this.player.x = building.door_x;
    this.player.y = building.door_y + 48;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.toast("returned to street level");
    this.update_hud();
    this.save(true);
  }

  change_floor(direction) {
    const building = this.inside.building;
    const floor = this.inside.floor + direction;
    if (floor < -building.basements || floor >= building.floors) return;
    this.inside.floor = floor;
    const layout = this.layout();
    const arrival = direction > 0 ? layout.down : layout.up;
    this.player.x = arrival?.x ?? layout.width * .5;
    this.player.y = (arrival?.y ?? 110) + 58;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.toast(this.floor_label(floor));
    this.update_hud();
  }

  open_container(container) {
    this.active_container = container.id;
    if (!this.container_items.has(container.id)) {
      const random = rng(text_hash(`${SEED}:${container.id}:loot`));
      const table = loot_tables[container.table] ?? loot_tables.storage;
      const count = 1 + Math.floor(random() * 3);
      this.container_items.set(container.id, Array.from({ length: count }, (_, index) => make_item(table[Math.floor(random() * table.length)], `loot:${container.id}:${index}`)));
    }
    dom.container_name.textContent = container.kind;
    this.render_container();
    dom.container_overlay.hidden = false;
    this.paused = true;
  }

  render_container() {
    const items = this.container_items.get(this.active_container) ?? [];
    dom.container_items.innerHTML = items.length ? items.map((item) => `<div class="loot_row"><span><strong>${safe(item.name)}</strong><small>${safe(item.category)}</small></span><button data_take="${safe(item.id)}" type="button">take</button></div>`).join("") : '<span class="empty">empty</span>';
    dom.container_items.querySelectorAll("[data_take]").forEach((button) => button.addEventListener("click", () => this.take(button.dataset.take)));
  }

  take(id) {
    const items = this.container_items.get(this.active_container) ?? [];
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return;
    const [item] = items.splice(index, 1);
    this.inventory.add(item);
    this.stats.found += 1;
    if (!items.length) this.looted.add(this.active_container);
    this.render_container();
  }

  take_all() {
    const items = this.container_items.get(this.active_container) ?? [];
    while (items.length) { this.inventory.add(items.shift(), false); this.stats.found += 1; }
    if (this.active_container) this.looted.add(this.active_container);
    this.toast("container emptied");
    this.sound.tone(440, .08, .025, "sine", 150);
    this.close_panels();
    this.update_hud();
  }

  die() {
    this.dead = true;
    this.paused = true;
    this.mouse.down = false;
    const days = Math.floor(this.world_minutes / 1440) + 1;
    dom.death_summary.textContent = `survived ${days} day${days === 1 ? "" : "s"} · killed ${this.stats.kills} infected`;
    dom.death_screen.hidden = false;
  }

  floor_label(floor) {
    return floor < 0 ? `basement ${Math.abs(floor)}` : floor === 0 ? "ground floor" : `floor ${floor + 1}`;
  }

  update_hud() {
    const world_x = this.inside?.building.x ?? this.player.x;
    const world_y = this.inside?.building.y ?? this.player.y;
    const bx = Math.floor(world_x / CELL);
    const by = Math.floor(world_y / CELL);
    const district_key = this.inside?.building.district ?? this.world.district(bx, by);
    dom.district_name.textContent = districts[district_key].name;
    dom.location_name.textContent = this.inside?.building.name ?? this.world.road(bx, by);
    dom.floor_name.textContent = this.inside ? this.floor_label(this.inside.floor) : "street level";
    const day = Math.floor(this.world_minutes / 1440) + 1;
    const minute_day = Math.floor(this.world_minutes % 1440);
    dom.world_clock.textContent = `day ${String(day).padStart(2, "0")} · ${String(Math.floor(minute_day / 60)).padStart(2, "0")}:${String(minute_day % 60).padStart(2, "0")}`;
    for (const [name, value] of [["health", this.player.health], ["stamina", this.player.stamina], ["hunger", this.player.hunger]]) {
      dom[`${name}_meter`].style.transform = `scaleX(${clamp(value / 100, 0, 1)})`;
      dom[`${name}_value`].textContent = Math.ceil(value);
    }
    const weapon = this.inventory.equipped("weapon");
    dom.weapon_name.textContent = weapon?.name ?? "bare hands";
    dom.quick_weapon.textContent = weapon?.name ?? "bare hands";
    const food = this.inventory.items.find((item) => item.tags.includes("food") && !item.tags.includes("inedible"));
    dom.quick_food.textContent = food?.name ?? "no food";
    dom.ammo_value.textContent = weapon?.ammo_type ? `${this.inventory.ammo(weapon.ammo_type)} rounds` : "melee";
    const north = Math.round(-this.player.y * .16);
    const east = Math.round(this.player.x * .16);
    dom.coordinates.textContent = `${Math.abs(north)}m ${north >= 0 ? "n" : "s"} · ${Math.abs(east)}m ${east >= 0 ? "e" : "w"}`;
    const nearby = this.started ? this.active_enemies().filter((enemy) => !enemy.dead && distance_sq(enemy.x, enemy.y, this.player.x, this.player.y) < 250000).length : 0;
    dom.threat_level.textContent = nearby >= 6 ? "overrun" : nearby >= 3 ? "danger" : nearby ? "movement" : "quiet";
    dom.threat_level.style.color = nearby >= 3 ? "#cf796f" : nearby ? "#d8ad62" : "";
  }

  bounds(padding = 160) {
    const half_w = this.screen_w / (2 * this.camera.zoom);
    const half_h = this.screen_h / (2 * this.camera.zoom);
    return { left: this.camera.x - half_w - padding, right: this.camera.x + half_w + padding, top: this.camera.y - half_h - padding, bottom: this.camera.y + half_h + padding };
  }

  render() {
    const context = this.ctx;
    const shake_x = this.shake ? (Math.random() - .5) * this.shake : 0;
    const shake_y = this.shake ? (Math.random() - .5) * this.shake : 0;
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    context.fillStyle = "#151816";
    context.fillRect(0, 0, this.screen_w, this.screen_h);
    context.save();
    context.translate(this.screen_w * .5 + shake_x, this.screen_h * .5 + shake_y);
    context.scale(this.camera.zoom, this.camera.zoom);
    context.translate(-this.camera.x, -this.camera.y);
    if (this.inside) this.draw_interior(context);
    else this.draw_city(context);
    this.draw_blood(context);
    this.draw_enemies(context);
    this.draw_effects(context);
    this.draw_player(context);
    context.restore();
    this.draw_light(context);
    this.draw_crosshair(context);
    this.draw_map();
  }

  draw_city(context) {
    const bounds = this.bounds();
    const start_x = Math.floor(bounds.left / CELL);
    const end_x = Math.ceil(bounds.right / CELL);
    const start_y = Math.floor(bounds.top / CELL);
    const end_y = Math.ceil(bounds.bottom / CELL);
    context.fillStyle = "#2b2e2b";
    context.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
    for (let by = start_y; by <= end_y; by += 1) for (let bx = start_x; bx <= end_x; bx += 1) this.draw_block(context, this.world.block(bx, by));
    this.draw_roads(context, start_x, end_x, start_y, end_y, bounds);
  }

  draw_block(context, block) {
    const district = districts[block.district];
    const x = block.x * CELL;
    const y = block.y * CELL;
    const inset = ROAD * .5;
    context.fillStyle = "#343733";
    context.fillRect(x, y, CELL, CELL);
    context.fillStyle = district.ground;
    context.fillRect(x + inset, y + inset, CELL - ROAD, CELL - ROAD);
    context.strokeStyle = "rgba(218,218,194,.16)";
    context.lineWidth = 7;
    context.strokeRect(x + inset + 3.5, y + inset + 3.5, CELL - ROAD - 7, CELL - ROAD - 7);
    context.fillStyle = district.lot;
    context.fillRect(x + inset + 34, y + inset + 34, CELL - ROAD - 68, CELL - ROAD - 68);
    if (block.district === "park") {
      context.strokeStyle = "rgba(184,174,139,.4)";
      context.lineWidth = 34;
      context.beginPath();
      context.moveTo(x + 150, y + 500);
      context.bezierCurveTo(x + 340, y + 300, x + 650, y + 700, x + 850, y + 500);
      context.stroke();
    }
    for (const tree of block.trees) if (!block.buildings.some((building) => in_rect(tree.x, tree.y, building, tree.radius + 8))) this.draw_tree(context, tree);
    for (const building of block.buildings) this.draw_building(context, building, district);
  }

  draw_roads(context, start_x, end_x, start_y, end_y, bounds) {
    context.save();
    context.strokeStyle = "rgba(211,199,139,.48)";
    context.lineWidth = 3;
    context.setLineDash([35, 38]);
    for (let x = start_x; x <= end_x + 1; x += 1) {
      context.beginPath();
      context.moveTo(x * CELL, bounds.top);
      context.lineTo(x * CELL, bounds.bottom);
      context.stroke();
    }
    for (let y = start_y; y <= end_y + 1; y += 1) {
      context.beginPath();
      context.moveTo(bounds.left, y * CELL);
      context.lineTo(bounds.right, y * CELL);
      context.stroke();
    }
    context.setLineDash([]);
    context.strokeStyle = "rgba(230,230,215,.16)";
    context.lineWidth = 2;
    for (let x = start_x; x <= end_x + 1; x += 1) {
      context.beginPath();
      context.moveTo(x * CELL - ROAD * .38, bounds.top);
      context.lineTo(x * CELL - ROAD * .38, bounds.bottom);
      context.moveTo(x * CELL + ROAD * .38, bounds.top);
      context.lineTo(x * CELL + ROAD * .38, bounds.bottom);
      context.stroke();
    }
    for (let y = start_y; y <= end_y + 1; y += 1) {
      context.beginPath();
      context.moveTo(bounds.left, y * CELL - ROAD * .38);
      context.lineTo(bounds.right, y * CELL - ROAD * .38);
      context.moveTo(bounds.left, y * CELL + ROAD * .38);
      context.lineTo(bounds.right, y * CELL + ROAD * .38);
      context.stroke();
    }
    context.restore();
  }

  draw_tree(context, tree) {
    context.fillStyle = "#273429";
    context.beginPath();
    context.arc(tree.x, tree.y, tree.radius + 5, 0, TAU);
    context.fill();
    context.fillStyle = "#3e5a42";
    context.beginPath();
    context.arc(tree.x, tree.y, tree.radius, 0, TAU);
    context.fill();
    context.fillStyle = "rgba(164,184,125,.24)";
    context.beginPath();
    context.arc(tree.x - tree.radius * .25, tree.y - tree.radius * .25, tree.radius * .48, 0, TAU);
    context.fill();
  }

  draw_building(context, building, district) {
    const colors = { house: "#6b6559", apartments: "#5a6060", shop: "#62645d", office: "#4d5658", warehouse: "#665e51", factory: "#5b5349", hospital: "#5e6968", police: "#4e5960", civic: "#66645e", school: "#655f55", diner: "#686156" };
    context.fillStyle = "rgba(0,0,0,.28)";
    context.fillRect(building.x - 8, building.y - 8, building.w + 16, building.h + 16);
    context.fillStyle = colors[building.type] ?? "#5c5c55";
    context.fillRect(building.x, building.y, building.w, building.h);
    context.strokeStyle = "rgba(225,225,207,.22)";
    context.lineWidth = 3;
    context.strokeRect(building.x + 1.5, building.y + 1.5, building.w - 3, building.h - 3);
    const unit = Math.min(building.w, building.h);
    context.fillStyle = "rgba(30,35,33,.52)";
    context.fillRect(building.x + building.w * .12, building.y + building.h * .14, unit * .18, unit * .13);
    context.fillRect(building.x + building.w * .64, building.y + building.h * .58, unit * .2, unit * .14);
    context.fillStyle = district.accent;
    context.fillRect(building.door_x - 18, building.door_y - 10, 36, 18);
    context.fillStyle = "#1d2421";
    context.fillRect(building.door_x - 10, building.door_y - 6, 20, 14);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "11px Courier New, monospace";
    context.fillStyle = "rgba(239,237,222,.7)";
    context.fillText(building.name.toUpperCase(), building.x + building.w * .5, building.y + building.h * .5);
    context.font = "9px Courier New, monospace";
    context.fillStyle = "rgba(239,237,222,.38)";
    context.fillText(`${building.floors} FLOOR${building.floors === 1 ? "" : "S"}`, building.x + building.w * .5, building.y + building.h * .5 + 16);
  }

  draw_interior(context) {
    const layout = this.layout();
    const building = this.inside.building;
    context.fillStyle = "#161917";
    context.fillRect(-500, -500, layout.width + 1000, layout.height + 1000);
    context.fillStyle = building.type === "hospital" ? "#5f6863" : ["warehouse", "factory"].includes(building.type) ? "#59554c" : ["office", "civic"].includes(building.type) ? "#565c59" : "#625f53";
    context.fillRect(24, 24, layout.width - 48, layout.height - 48);
    context.strokeStyle = "rgba(30,34,31,.26)";
    context.lineWidth = 1;
    for (let x = 36; x < layout.width - 24; x += 48) { context.beginPath(); context.moveTo(x, 24); context.lineTo(x, layout.height - 24); context.stroke(); }
    for (let y = 36; y < layout.height - 24; y += 48) { context.beginPath(); context.moveTo(24, y); context.lineTo(layout.width - 24, y); context.stroke(); }
    context.fillStyle = "#262b28";
    context.fillRect(0, 0, layout.width, 28);
    context.fillRect(0, layout.height - 28, layout.width, 28);
    context.fillRect(0, 0, 28, layout.height);
    context.fillRect(layout.width - 28, 0, 28, layout.height);
    for (const wall of layout.walls) {
      context.fillStyle = "#2b302d";
      context.fillRect(wall.x, wall.y, wall.w, wall.h);
      context.strokeStyle = "rgba(231,229,211,.16)";
      context.strokeRect(wall.x + .5, wall.y + .5, wall.w - 1, wall.h - 1);
    }
    for (const item of layout.furniture) {
      const looted = item.id && this.looted.has(item.id);
      context.fillStyle = looted ? "#373a36" : item.kind === "bed" ? "#6e7772" : ["desk", "table"].includes(item.kind) ? "#665746" : item.kind === "medical cabinet" ? "#7b8d87" : item.kind === "fridge" ? "#858982" : "#544d40";
      context.fillRect(item.x, item.y, item.w, item.h);
      context.strokeStyle = "rgba(235,230,205,.18)";
      context.strokeRect(item.x + .5, item.y + .5, item.w - 1, item.h - 1);
      if (item.id && !looted) {
        context.fillStyle = "rgba(207,222,147,.85)";
        context.beginPath();
        context.arc(item.x + item.w - 6, item.y + 6, 2.5, 0, TAU);
        context.fill();
      }
    }
    this.draw_stairs(context, layout.up, "UP");
    this.draw_stairs(context, layout.down, "DN");
    if (layout.exit) {
      context.fillStyle = "#adbc7b";
      context.fillRect(layout.exit.x - 30, layout.height - 34, 60, 12);
      context.font = "9px Courier New, monospace";
      context.textAlign = "center";
      context.fillStyle = "rgba(230,234,207,.75)";
      context.fillText("EXIT", layout.exit.x, layout.height - 45);
    }
    context.font = "13px Courier New, monospace";
    context.textAlign = "left";
    context.fillStyle = "rgba(230,234,207,.44)";
    context.fillText(`${building.name.toUpperCase()} · ${this.floor_label(this.inside.floor).toUpperCase()}`, 42, 53);
  }

  draw_stairs(context, stairs, label) {
    if (!stairs) return;
    context.fillStyle = "#3b423e";
    context.fillRect(stairs.x - 38, stairs.y - 32, 76, 64);
    context.strokeStyle = "rgba(207,222,147,.48)";
    context.lineWidth = 2;
    for (let index = -24; index <= 24; index += 12) { context.beginPath(); context.moveTo(stairs.x - 28, stairs.y + index); context.lineTo(stairs.x + 28, stairs.y + index); context.stroke(); }
    context.font = "9px Courier New, monospace";
    context.textAlign = "center";
    context.fillStyle = "#cfde93";
    context.fillText(label, stairs.x, stairs.y + 4);
  }

  draw_blood(context) {
    const inside_key = this.inside ? `${this.inside.building.id}:${this.inside.floor}` : null;
    for (const mark of this.blood) {
      if (mark.inside !== inside_key) continue;
      context.fillStyle = "rgba(96,22,18,.42)";
      context.beginPath();
      context.arc(mark.x, mark.y, mark.radius, 0, TAU);
      context.fill();
    }
  }

  draw_enemies(context) {
    for (const enemy of this.active_enemies()) {
      if (enemy.dead) {
        context.fillStyle = "rgba(60,48,43,.75)";
        context.beginPath();
        context.ellipse(enemy.x, enemy.y, enemy.radius + 6, enemy.radius * .55, enemy.angle, 0, TAU);
        context.fill();
        continue;
      }
      context.save();
      context.translate(enemy.x, enemy.y);
      context.rotate(enemy.angle);
      context.fillStyle = enemy.variant === "brute" ? "#655d3f" : enemy.variant === "runner" ? "#724a42" : "#58644c";
      context.beginPath();
      context.arc(0, 0, enemy.radius, 0, TAU);
      context.fill();
      context.fillStyle = "#2b3027";
      context.beginPath();
      context.arc(enemy.radius * .48, 0, enemy.radius * .52, 0, TAU);
      context.fill();
      context.strokeStyle = "rgba(128,25,21,.65)";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(enemy.radius * .35, -enemy.radius * .3);
      context.lineTo(enemy.radius * .75, -enemy.radius * .1);
      context.stroke();
      if (enemy.alerted) {
        context.fillStyle = "#c7d78c";
        context.beginPath();
        context.arc(enemy.radius * .65, -enemy.radius * .22, 2.1, 0, TAU);
        context.fill();
      }
      context.restore();
    }
  }

  draw_effects(context) {
    context.lineCap = "round";
    for (const shot of this.shots) {
      context.strokeStyle = `rgba(243,221,150,${clamp(shot.life * 12, 0, 1)})`;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(shot.x1, shot.y1);
      context.lineTo(shot.x2, shot.y2);
      context.stroke();
    }
    for (const swing of this.swings) {
      context.strokeStyle = `rgba(225,225,204,${swing.life * 4})`;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(swing.x, swing.y, swing.range, swing.angle - .75, swing.angle + .75);
      context.stroke();
    }
  }

  draw_player(context) {
    context.save();
    context.translate(this.player.x, this.player.y);
    context.rotate(this.player.angle);
    context.fillStyle = this.player.hurt_time ? "#d17f70" : "#d7d5c5";
    context.beginPath();
    context.arc(0, 0, PLAYER_RADIUS, 0, TAU);
    context.fill();
    context.fillStyle = "#343a36";
    context.beginPath();
    context.arc(6, 0, 9, 0, TAU);
    context.fill();
    const weapon = this.inventory.equipped("weapon");
    context.strokeStyle = weapon?.tags.includes("firearm") ? "#c2a979" : "#80745c";
    context.lineWidth = weapon ? 5 : 3;
    context.beginPath();
    context.moveTo(8, 0);
    context.lineTo(weapon?.tags.includes("firearm") ? 34 : 27, 0);
    context.stroke();
    context.fillStyle = "#cfde93";
    context.beginPath();
    context.moveTo(PLAYER_RADIUS + 8, 0);
    context.lineTo(PLAYER_RADIUS + 1, -4);
    context.lineTo(PLAYER_RADIUS + 1, 4);
    context.closePath();
    context.fill();
    context.restore();
  }

  draw_light(context) {
    if (this.inside) {
      context.fillStyle = this.inventory.items.some((item) => item.tags.includes("light")) ? "rgba(2,4,3,.08)" : "rgba(2,4,3,.18)";
      context.fillRect(0, 0, this.screen_w, this.screen_h);
      return;
    }
    const hour = (this.world_minutes % 1440) / 60;
    const daylight = clamp(Math.sin(((hour - 5.5) / 13) * Math.PI), 0, 1);
    const darkness = .68 * (1 - daylight);
    if (darkness > .01) {
      context.fillStyle = `rgba(5,10,16,${darkness})`;
      context.fillRect(0, 0, this.screen_w, this.screen_h);
    }
  }

  draw_crosshair(context) {
    if (!this.started || this.paused || matchMedia("(pointer: coarse)").matches) return;
    context.strokeStyle = "rgba(215,224,188,.74)";
    context.lineWidth = 1;
    context.beginPath();
    context.arc(this.mouse.x, this.mouse.y, 7, 0, TAU);
    context.moveTo(this.mouse.x - 12, this.mouse.y);
    context.lineTo(this.mouse.x - 5, this.mouse.y);
    context.moveTo(this.mouse.x + 5, this.mouse.y);
    context.lineTo(this.mouse.x + 12, this.mouse.y);
    context.moveTo(this.mouse.x, this.mouse.y - 12);
    context.lineTo(this.mouse.x, this.mouse.y - 5);
    context.moveTo(this.mouse.x, this.mouse.y + 5);
    context.lineTo(this.mouse.x, this.mouse.y + 12);
    context.stroke();
  }

  draw_map() {
    const context = this.map_ctx;
    const width = dom.minimap_canvas.width;
    const height = dom.minimap_canvas.height;
    context.fillStyle = "#111512";
    context.fillRect(0, 0, width, height);
    if (this.inside) return this.draw_inside_map(context, width, height);
    const bx = Math.floor(this.player.x / CELL);
    const by = Math.floor(this.player.y / CELL);
    const scale = 38;
    for (let oy = -3; oy <= 3; oy += 1) for (let ox = -3; ox <= 3; ox += 1) {
      context.fillStyle = districts[this.world.district(bx + ox, by + oy)].ground;
      context.fillRect(width * .5 + ox * scale - scale * .5 + 3, height * .5 + oy * scale - scale * .5 + 3, scale - 6, scale - 6);
    }
    context.strokeStyle = "rgba(231,228,208,.15)";
    context.lineWidth = 4;
    for (let index = -3; index <= 3; index += 1) {
      context.beginPath();
      context.moveTo(width * .5 + index * scale - scale * .5, 0);
      context.lineTo(width * .5 + index * scale - scale * .5, height);
      context.stroke();
      context.beginPath();
      context.moveTo(0, height * .5 + index * scale - scale * .5);
      context.lineTo(width, height * .5 + index * scale - scale * .5);
      context.stroke();
    }
    const local_x = ((this.player.x - bx * CELL) / CELL - .5) * scale;
    const local_y = ((this.player.y - by * CELL) / CELL - .5) * scale;
    for (const enemy of this.active_enemies()) {
      if (enemy.dead) continue;
      const x = width * .5 + local_x + (enemy.x - this.player.x) / CELL * scale;
      const y = height * .5 + local_y + (enemy.y - this.player.y) / CELL * scale;
      if (x > 0 && x < width && y > 0 && y < height) { context.fillStyle = "#b94d43"; context.fillRect(x - 1, y - 1, 3, 3); }
    }
    context.save();
    context.translate(width * .5 + local_x, height * .5 + local_y);
    context.rotate(this.player.angle);
    context.fillStyle = "#cfde93";
    context.beginPath();
    context.moveTo(7, 0);
    context.lineTo(-5, -4);
    context.lineTo(-5, 4);
    context.closePath();
    context.fill();
    context.restore();
    context.strokeStyle = "rgba(207,222,147,.35)";
    context.strokeRect(.5, .5, width - 1, height - 1);
  }

  draw_inside_map(context, width, height) {
    const layout = this.layout();
    const scale = Math.min((width - 22) / layout.width, (height - 22) / layout.height);
    const offset_x = (width - layout.width * scale) * .5;
    const offset_y = (height - layout.height * scale) * .5;
    context.fillStyle = "#555b55";
    context.fillRect(offset_x, offset_y, layout.width * scale, layout.height * scale);
    context.fillStyle = "#242925";
    for (const wall of layout.walls) context.fillRect(offset_x + wall.x * scale, offset_y + wall.y * scale, wall.w * scale, wall.h * scale);
    context.fillStyle = "#cfde93";
    context.beginPath();
    context.arc(offset_x + this.player.x * scale, offset_y + this.player.y * scale, 3.5, 0, TAU);
    context.fill();
    for (const enemy of this.active_enemies()) if (!enemy.dead) { context.fillStyle = "#b94d43"; context.fillRect(offset_x + enemy.x * scale - 1.5, offset_y + enemy.y * scale - 1.5, 3, 3); }
    context.strokeStyle = "rgba(207,222,147,.35)";
    context.strokeRect(.5, .5, width - 1, height - 1);
  }
}

const game = new Game();
globalThis.city_of_nothing = game;
globalThis.city_of_nothing_test = { combine_items, make_item, districts, item_catalog, loot_tables };
