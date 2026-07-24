# gameplay reference

This is a reference for the mechanics currently implemented in `game.js`. It describes present behavior rather than planned features.

## core loop

Explore the city, meet other survivors, enter buildings, defeat or avoid infected, search containers, manage hunger and health, improve equipment, and combine items. The city and its loot are reproducible, while the consequences of the run are saved locally.

Simulation pauses while an inventory, crafting, container, or survivor-conversation panel is open.

## the city

The nominal world is a 128 × 128 grid of 16,384 blocks. Districts are assigned deterministically from position and the fixed world seed.

| District | Display name | Threat multiplier | Typical content |
| --- | --- | ---: | --- |
| `civic` | old civic centre | 1.15 | Civic buildings, police, offices, hospitals |
| `commercial` | glassmarket | 1.25 | Shops, offices, apartments, diners, police |
| `residential` | harrow residential | 0.90 | Houses, apartments, schools, diners |
| `industrial` | blackwater industrial | 1.40 | Warehouses, factories, police |
| `medical` | saint orison quarter | 1.20 | Hospitals, offices, shops |
| `park` | widow's green | 0.75 | Trees and paths; no buildings |
| `outskirts` | outer ward | 0.65 | Houses, warehouses, diners |

The multiplier affects the number of outdoor infected generated on a block. District location is also shaped: civic and park content cluster near the center, medical/commercial content occupies a defined region, residential content tends south, industrial content tends north, and outskirts begin beyond the inner city.

## buildings and interiors

Generated building records contain a stable ID, type, name, footprint, door, district, floor count, basement count, and interior seed.

- Residential and outskirts blocks can hold up to four smaller buildings.
- Commercial, civic, and medical-style blocks use up to two larger lots.
- Industrial blocks use one large and one smaller lot.
- A small deterministic chance leaves a lot empty.
- Offices can reach the greatest number of upper floors.
- Houses, shops, hospitals, police stations, and civic buildings can receive a basement.

Interior dimensions and wall layouts vary by building type. Stairs connect generated floors, and the ground floor has an exit back to the building's exterior door.

## survival

| System | Current behavior |
| --- | --- |
| Health | Starts full. Damage is blocked briefly after a hit. Food or medicine can heal up to the maximum. |
| Stamina | Sprinting drains stamina; walking or standing restores it. Sprinting stops when stamina is nearly empty. |
| Hunger | Decreases during active play. At zero, the player repeatedly takes starvation damage. |
| Carry weight | All carried item weights are summed. Weight above 22 kg slows movement, up to a 30% penalty. |
| Displayed capacity | The inventory displays `35.0 kg`, but this is not a hard item limit in the current implementation. |
| Armor | Equipped head, torso, legs, and feet armor is summed. Damage reduction is capped at 68%, and a hit always deals at least 2 damage. |
| Time | The clock advances by 0.75 in-game minutes per active real-time second. Exterior darkness follows the time of day. |
| Light | Carrying an item tagged `light` reduces the interior darkness overlay; the item does not need to be equipped. |

## movement and awareness

Walking speed is 170 world units per second. Sprinting raises it to 260 before any weight penalty. Keyboard movement is normalized so diagonal movement is not faster.

The mouse controls facing on fine-pointer devices. With an idle pointer or on touch devices, the player faces the movement direction.

Infected notice nearby humans at close range or when alerted by an attack. They pursue the nearest living human, so independent survivors and recruited companions can draw attacks away from the player.

## human survivors

Human survivors are generated deterministically on outdoor blocks. Each has a stable identity, name, color, health, hunger, kill count, and personal inventory. They retain their state while their zone is cached and across saved encounters.

Independent survivors:

- Roam their current outdoor area when no infected are nearby.
- Detect infected within 680 world units.
- Select the highest-attack weapon they can currently use.
- Use firearms only while matching ammunition remains, then fall back to another weapon or bare hands.
- Approach to melee reach or hold a practical ranged distance before attacking.
- Consume safe food when hunger falls below 55.
- Use medical supplies when health falls below 58.
- Can be attacked and killed by infected.

Walk close and press `E` to talk. The conversation shows the survivor's current health, hunger, kills, weapon, and supplies. Choosing **invite to join your group** recruits them.

Recruited companions:

- Follow in a spaced formation behind the player.
- Accelerate to catch up and regroup if separated.
- Fight the same nearby infected using their own weapons and ammunition.
- Receive tactical voice orders when they are within 900 world units of the player.
- Enter and leave buildings with the player.
- Move safely between upper floors and basements.
- Preserve health, hunger, inventory, equipment choice, kills, and current order in the save.

A recruited companion who dies is removed from the group and does not regenerate. Items dropped by an infected killed by a survivor go into that survivor's inventory, giving them additional food or materials to use or carry.

### group orders

Press `Q` or use the **orders** quick action to open the voice-command panel. A shout affects every living recruited companion within 900 world units; companions farther away keep their previous orders. Shouting is noisy and alerts infected within part of that radius.

| Order | Behavior |
| --- | --- |
| **attack everything you can** | Hunt infected up to 1,500 world units away, then continue following between targets |
| **stay with me** | Maintain formation and engage only infected close to the player while the companion is keeping up |
| **loot all nearby containers** | Divide unlooted containers within 900 world units of the shout, move to them, and carry all generated contents in personal inventories |
| **hold this position** | Return to the position where each companion heard the command and defend a 420-unit area |

Looting companions reserve different containers so the group does not duplicate work. They will interrupt looting to defend themselves against infected within 280 world units. Once a companion can find no unreserved container in range, that companion returns to formation.

Container contents, emptied-container state, item IDs, and found-item statistics use the same persistent data whether the player or a companion performs the search. Hold and loot tasks return to **stay with me** when the group changes buildings or floors; attack and follow orders continue.

## infected

Each infected is deterministically assigned a variant:

| Variant | Approximate share | Behavior |
| --- | ---: | --- |
| Walker | 75% | Standard health, size, speed, and attack interval |
| Runner | 18% | Faster pursuit and a shorter attack interval |
| Brute | 7% | Larger, slower, tougher, and deals heavier damage |

Outdoor groups scale with district threat. Interiors normally generate two to five infected, with two additional infected in hospitals.

Defeated infected remain as corpses while their current zone is cached. Their IDs are added to persistent state so they do not respawn after deterministic regeneration. Each kill also has a deterministic 25% chance to drop either an energy bar or cloth. The item goes to the player or survivor who delivered the killing blow.

## combat

The player can attack with bare hands, melee weapons, or firearms.

### melee

- Bare hands use 7 attack and 46 range.
- A melee attack checks a forward arc and hits the nearest valid infected.
- Weapon attack, range, and noise come from the item's statistics.
- Bare-handed attacks have the slowest cooldown; equipped melee attacks are faster.

### firearms

- A firearm attack requires a matching ammunition tag.
- The 9mm pistol casts one ray.
- The pump shotgun casts five pellets with slight spread.
- A shotgun pellet applies 32% of the listed shotgun attack; multiple pellets can hit the same target.
- Firearms attack faster than melee weapons and create much larger alert radii.
- An empty firearm stays equipped and produces an empty-weapon message and sound.

Durability is stored, displayed, and combined during crafting, but attacks do not currently reduce it.

## inventory and equipment

New runs begin with:

- Baseball bat, equipped as the weapon
- Apple
- Canned soup
- Cloth
- Duct tape

Equipment slots are `weapon`, `head`, `torso`, `legs`, and `feet`. The current catalog contains head, torso, and feet wearables; the legs slot is reserved but has no catalog item yet.

The `1` shortcut equips the carried weapon with the highest attack value. The `2` shortcut consumes the carried edible item with the highest food value.

Food tagged `poisoned` applies its normal food and healing statistics, then deals additional poison damage. Items tagged `inedible` cannot be consumed even if crafting also gives them the `food` tag.

## loot

Containers generate one to three items the first time they are opened. Their table depends on the building and container:

| Context | Typical contents |
| --- | --- |
| Kitchen/fridge | Food, water, kitchen knife, cloth, spoiled meat |
| Bedroom/wardrobe | Clothing, flashlight, duct tape, food |
| Office/civic/school | Water, food, flashlight, cloth, medicine |
| Shop/diner | Food, water, materials, baseball bat |
| Hospital | Medicine, water, cloth, food, spoiled meat |
| Warehouse/factory | Tools, metal, binding materials, gasoline, boots |
| Police | Firearms, ammunition, armor, medicine |
| Generic storage | Materials, flashlight, gasoline |

Remaining generated contents are saved. A container is marked looted once its last item is taken.

## crafting

Crafting accepts any two different carried items. It consumes both and creates one item.

The result follows these rules:

1. Numeric statistics with the same name are added.
2. Tags are combined without duplicates.
3. Component histories are concatenated.
4. The result name joins the two source names in selection order.
5. The first available equipment slot and firearm ammunition type are retained.
6. Category is inferred from the inputs, attack total, edibility, and medical tags.

A result becomes a weapon if either source is a weapon or total attack exceeds 7. Otherwise a wearable source produces a wearable result. Otherwise a food-tagged result without `inedible` is food; the default is material. A medical tag changes a non-weapon, non-wearable result to medical.

Tags never cancel each other. This is particularly important for `inedible` and `poisoned`: combining safe food with either property preserves the dangerous property.

Crafting immediately forces a save.

## saves and death

The browser stores one save per origin under `city_of_nothing_save_v1`.

Saved progress includes location, interior floor, survival state, inventory, equipment, companions, encountered outdoor survivors, permanently lost survivor IDs, world time, play time, statistics, emptied containers, remaining container contents, and defeated infected IDs.

Transient infected movement, current health of living infected, blood, attack effects, camera shake, open panels, and audio state are not saved. When a zone is reconstructed, surviving infected return to their deterministic starting state.

Death pauses the run and leaves the last save untouched. **Return to last save** reloads that state and guarantees at least one health point.

## controls

| Input | Action |
| --- | --- |
| `WASD` / arrow keys | Move |
| Left `Shift` | Sprint |
| Mouse | Aim |
| Left click / `Space` | Attack |
| `E` | Use the nearest interaction, including talking to survivors |
| `Q` | Open group orders and shout to nearby companions |
| `I` / `Tab` | Toggle inventory |
| `C` | Toggle crafting |
| `1` | Equip strongest weapon |
| `2` | Eat best food |
| `Esc` | Close panel |

Touch mode provides an analog movement stick plus **use**, **attack**, and **orders** buttons. Inventory and crafting remain available from the quick bar.
