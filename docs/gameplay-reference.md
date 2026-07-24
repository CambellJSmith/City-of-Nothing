# gameplay reference

This is a reference for the mechanics currently implemented in `game.js`. It describes present behavior rather than planned features.

## core loop

Explore the city, meet other survivors, enter buildings, defeat or avoid infected, search containers, manage hunger and health, improve equipment, and combine items. The city and its loot are reproducible, while the consequences of the run are saved locally.

Simulation pauses while an inventory, construction, workbench, radio, container, or survivor-conversation panel is open.

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
| Health | Starts full. Damage is blocked briefly after a hit. Food or medicine can heal up to the maximum. Players and human survivors slowly regenerate while hunger is above 75%. |
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

Human survivors and infected calculate local routes around buildings, interior walls, construction, and sewer boundaries. Clear paths are taken directly; blocked paths use smoothed waypoints through doors and around obstacle edges. Short-range avoidance and collision separation keep the player, survivors, and infected from occupying the same space.

Infected notice nearby humans at close range or when alerted by an attack. They pursue the nearest living human, so independent survivors and recruited companions can draw attacks away from the player.

## human survivors

Human survivors are generated deterministically on outdoor blocks. Each has a stable identity, name, color, health, hunger, kill count, and personal inventory. They retain their state while their zone is cached and across saved encounters.

Independent survivors:

- Roam their current outdoor area when no infected are nearby.
- Detect infected within 680 world units.
- Carry a finite 35 kg personal inventory with separate weapon, head, torso, legs, and feet equipment slots.
- Automatically equip the strongest armor available for each slot.
- Select weapons for the current distance, enemy variant, nearby enemy cluster, ammunition supply, and close-quarters risk rather than raw attack alone.
- Conserve firearms against close ordinary threats, favor ranged weapons for distant or tougher threats, favor shotguns against suitable close groups, and fall back immediately when ammunition is exhausted.
- Approach to melee reach or hold a practical ranged distance before attacking.
- Consume the best-fit safe food when hunger falls below 72, preserving larger meals when a smaller item is enough.
- Use the best-fit medical supply when health falls below 58.
- Exclude poisoned and inedible food from autonomous eating.
- Regenerate health slowly while hunger remains above 75%.
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
- Divide looted items without exceeding individual carrying capacity; uncarried items remain in their original container.
- Can be contacted individually from a radio center, including while away on an assignment.

A recruited companion who dies is removed from the group and does not regenerate. Items dropped by an infected killed by a survivor go into that survivor's inventory when capacity permits, giving them additional food or materials to use or carry.

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

### radio assignments

A radio center placed inside a building designates that complete building as the team base. Interact with the active base radio to select any living teammate, including one already away from the player.

Assignments are **go exploring**, **collect food**, **collect weapons**, **collect medicine**, **collect junk**, and **return to the group**. Field assignments take time, then the teammate returns automatically; collection assignments add deterministic supplies to that teammate's personal inventory.

Each teammate also has an individual engagement rule:

| Rule | Behavior |
| --- | --- |
| Avoid combat | Fight only at immediate danger distance |
| Defend yourself | Fight threats within a short defensive radius |
| Fight nearby threats | Use the standard survivor awareness range |
| Seek combat | Use the broad attack-order range |

Remote teammates are removed from the local formation until they return. Missions, remaining time, mission count, engagement, and inventory all persist.

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

Durability is stored and displayed, but attacks do not currently reduce it.

## inventory and equipment

New runs begin with:

- Baseball bat, equipped as the weapon
- Apple
- Canned soup
- Cloth
- Duct tape

Equipment slots are `weapon`, `head`, `torso`, `legs`, and `feet`. The current catalog contains head, torso, and feet wearables; the legs slot is reserved but has no catalog item yet.

The `1` shortcut equips the carried weapon with the highest attack value. The `2` shortcut consumes the carried edible item with the highest food value.

Food tagged `poisoned` applies its normal food and healing statistics, then deals additional poison damage. Items tagged `inedible` cannot be consumed.

Human survivor inventories use the same complete item records as the player, including weight, tags, ammunition counts, wearable slots, and weapon statistics. Their equipped item IDs, carried contents, and remaining ammunition persist independently. A survivor conversation reports their weapon, equipped armor, supplies, and current carried weight.

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

## construction and workbenches

Press `B` to browse 58 pieces in storage, comfort, workshop, defence, power, and lighting groups. Construction consumes the exact named inventory materials shown in the menu. Aim the preview, press `R` to rotate, and press `E` or click to place; red previews are blocked by walls, fixtures, doors, transitions, grates, trees, another character, or other built furniture. Outdoor-compatible construction is stored by the block containing the placed object, so it remains interactive and solid across block boundaries.

| Group | Furniture and function |
| --- | --- |
| Storage | Cupboard, chest, shelf, wardrobe, dresser, pantry, fridge, freezer, weapon rack, gun locker, medicine cabinet, tool cabinet, bookcase, footlocker, and crate stack all provide persistent two-way storage. |
| Sleep and seating | Bed, bunk bed, sleeping bag, sofa, armchair, chair, and bench advance different amounts of time and provide different health, stamina, and hunger tradeoffs. |
| Comfort | A powered shower and space heater restore health and stamina. A powered jukebox restores stamina, calls the local team back into follow formation, and adds colored ambient light. |
| Workshops | Cooker, crafting bench, salvage bench, and ammunition press provide cooking or the declared fixed recipe set. A medical station improves the healing from a consumed bandage or medical kit. |
| Supplies | Rain collectors, planter boxes, hydroponic racks, and water purifiers remember their next harvest time and produce food or clean water at different powered and unpowered intervals. |
| Information and rallying | Map tables report local district, road, and threat information. Rally boards and dining tables assign available teammates to defend that position. |
| Defences | Standard, heavy, and shotgun turrets trade range, damage, speed, and noise. Barricades block routes; spike traps work silently without power; electric fences damage infected with power; sirens lure infected; motion sensors count nearby threats. |
| Power and command | Generators and battery banks provide switchable building-wide power. A radio center designates the active team base and opens individual team commands. |
| Independent lights | Candles, oil lamps, campfires, and emergency lights work without building power. |
| Powered lights | Table lamps, floor lamps, ceiling lights, string lights, floodlights, and spotlights provide progressively different coverage. Floodlights use a wide long cone; spotlights use the narrowest and longest throw. |

The removed free-form system no longer combines arbitrary items. Workbenches only expose declared recipes with fixed inputs and outputs.

Powered furniture works when any active generator or battery bank exists on any floor of its building. Light sources can be switched independently. Circular lights remove darkness around themselves, while directional lights use the placed rotation to aim their cone. Candles, oil lamps, and campfires flicker; carried flashlights retain a narrow player-facing beam.

## team bases

Only one building is the active team base. Placing another radio center in a different building moves the designation. Every basement, ground floor, and upper floor in the active base remains generated, pinned in memory, and simulated while the player is outdoors, underground, or inside another building. Infected continue moving and all eligible turrets, spike traps, and electric fences continue defending remote base floors.

## sewer network

Every city block has street grates, and every generated basement has a grate. They connect to one deterministic underground network covering the full 128 × 128 city. Boundary tunnels, central cross-tunnels, and a chamber beneath every block guarantee that the entire network is connected.

The sewer is a separate dark world layer with infected, combat, companion travel, blood, a minimap, and persistent defeated-enemy IDs. Any nearby grate can be used as an exit, so entering from a street and emerging in a different building's basement is supported.

## saves and death

The browser stores one save per origin under `city_of_nothing_save_v1`.

Saved progress includes street/interior/sewer location, survival state, inventory, equipment, built furniture and stored items, the active base, companions with their personal inventories and equipment, radio assignments, encountered outdoor survivors, permanently lost survivor IDs, world time, play time, statistics, emptied containers, remaining container contents, and defeated infected IDs.

Transient infected movement, current health of living infected, blood, attack effects, camera shake, open panels, and audio state are not saved. When a zone is reconstructed, surviving infected return to their deterministic starting state.

Death pauses the run and leaves the last save untouched. **Return to last save** reloads that state and guarantees at least one health point.

## controls

| Input | Action |
| --- | --- |
| `WASD` / arrow keys | Move |
| Left `Shift` | Sprint |
| Mouse | Aim |
| Left click / `Space` | Attack |
| `E` | Use the nearest interaction or place selected furniture |
| `Q` | Open group orders and shout to nearby companions |
| `I` / `Tab` | Toggle inventory |
| `B` | Toggle furniture construction |
| `R` | Rotate selected furniture |
| `1` | Equip strongest weapon |
| `2` | Eat best food |
| `Esc` | Close panel |

Touch mode provides an analog movement stick plus **use**, **attack**, and **orders** buttons. Inventory and furniture construction remain available from the quick bar.
