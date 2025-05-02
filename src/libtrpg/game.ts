import { CR, XY } from "@olehermanse/utils";
import {
  array_remove,
  cr,
  cr_4_neighbors,
  cr_to_xy,
  distance_cr,
  distance_xy,
  Grid,
  inside,
  limit,
  Rectangle,
  rectangle,
  WH,
  wh,
  xy,
  xy_to_cr,
} from "@olehermanse/utils/funcs.js";
import {
  all_upgrades,
  Effect,
  get_skill,
  get_upgrade,
  get_upgrade_choices,
  Keyword,
  NamedUpgrade,
  UpgradeName,
} from "./upgrades.ts";
import { generate_room, RoomType } from "./rooms.ts";
import { Keyboard } from "./keyboard.ts";
import {
  Animation,
  get_sprite_metadata,
  SpriteMetadata,
  SpriteName,
} from "../frontend/painter.ts";
import { SkillApply } from "./upgrades.ts";
import { xp_reward, xp_threshold } from "./calculations.ts";

export interface GameSave {
  permanents: UpgradeName[];
}

export type SaveFunction = (
  data: GameSave,
) => void;

export type LoadFunction = () => GameSave;

const DIAG = 1.42;
const BASE_SPEED = 20.0;

export class Entity {
  xy: XY;
  fxy: XY | null; // can hold floating point xy values, so players can move half pixels.
  cr: CR;
  wh: WH;
  variant: number;
  animation?: Animation;

  constructor(
    public name: SpriteName,
    pos: CR,
    public zone: Zone,
    variant?: number,
    public reversed?: boolean,
  ) {
    this.cr = cr(pos.c, pos.r);
    this.wh = wh(zone.cell_width, zone.cell_height);
    this.xy = cr_to_xy(this.cr, zone);
    this.variant = variant ?? 0;
    this.fxy = null;
  }

  tick(ms: number) {
    if (this.animation === undefined) {
      return;
    }
    this.animation.tick(ms);
  }

  start_animation() {
    if (this.animation !== undefined) {
      this.animation.restart();
      return;
    }
    const metadata: SpriteMetadata = get_sprite_metadata(this.name);
    if (metadata.animation_data === undefined) {
      console.log("No animation found for " + this.name);
      return;
    }
    this.animation = metadata.animation_data.get_animator();
  }

  on_light_up() {
    return;
  }

  get center(): XY {
    const r = xy(this.xy.x, this.xy.y);
    r.x += this.wh.width / 2;
    r.y += this.wh.height / 2;
    return r;
  }
}

export class Stats {
  // Resources:
  max_hp;
  max_mp;
  // Basic stats which increase each level:
  strength;
  magic;
  // Special stats which have to be increased through choices:
  speed;
  movement_speed;
  increased_xp;
  light;

  constructor(level?: number) {
    this.max_hp = 0;
    this.max_mp = 0;
    this.strength = 0;
    this.magic = 0;
    this.speed = 0;
    this.movement_speed = 0;
    this.increased_xp = 0;
    this.light = 0;
    if (level === undefined || level <= 0) {
      return;
    }
    // Constant 1 (no increase per level):
    this.speed = 1;
    this.light = 1;
    // Increase per level:
    this.strength = level;
    this.magic = level;
    this.max_hp = 20; // Increases indirectly via strength
    this.max_mp = 10; // Increases indirectly via magic
  }
  static assign(a: Stats, b: Stats) {
    b.max_hp = a.max_hp;
    b.max_mp = a.max_mp;
    b.strength = a.strength;
    b.magic = a.magic;
    b.speed = a.speed;
    b.light = a.light;
    b.movement_speed = a.movement_speed;
  }

  copy() {
    const r = new Stats();
    Stats.assign(this, r);
    return r;
  }
}

export class Target {
  xy: XY;
  ms: number = 0;
  frame: number = 0;
  constructor(
    public cr: CR,
    grid: Grid,
    public draw: boolean,
  ) {
    this.xy = cr_to_xy(cr, grid);
  }
  tick(ms: number) {
    this.ms = (this.ms + ms) % 500;
    this.frame = Math.floor(this.ms / 250);
  }
}

export class Creature extends Entity {
  level: number;
  xp = 0;
  overflow_xp = 0;
  xp_cents = 0;
  stats: Stats;
  hp: number;
  mp: number;
  upgrades: NamedUpgrade[];
  sorted_upgrades: NamedUpgrade[] = [];
  inventory: Entity[] = [];
  effects: Effect[] = [];
  speed = BASE_SPEED;
  walk_counter = 0;
  target: Target | null = null;
  game: Game;
  run: boolean = false;

  constructor(
    name: SpriteName,
    level: number,
    pos: CR,
    zone: Zone,
    game: Game,
  ) {
    super(name, pos, zone);
    this.game = game;
    this.level = level;
    this.upgrades = [get_upgrade("Attack")];
    this.sort_upgrades();
    this.stats = new Stats(this.level);
    this.update_stats();
    this.hp = this.stats.max_hp;
    this.mp = this.stats.max_mp;
  }

  add_effect(effect: Effect) {
    this.effects.push(effect);
  }

  has_effect(name: string) {
    for (const effect of this.effects) {
      if (effect.name === name) {
        return true;
      }
    }
    return false;
  }
  tick_effects(): BattleEvent[] {
    const events: BattleEvent[] = [];
    for (const effect of this.effects) {
      effect.turns -= 1;
      console.assert(effect.turns >= 0);
      if (effect.apply_tick !== undefined) {
        events.push(...effect.apply_tick());
      }
      if (effect.turns === 0) {
        events.push(new BattleEvent(`${effect.name} wore off.`));
      }
    }
    this.effects = this.effects.filter((effect) => effect.turns > 0);
    return events;
  }

  apply_limits() {
    if (this.hp < 0) {
      this.hp = 0;
    }
    if (this.mp < 0) {
      this.mp = 0;
    }
    if (this.hp > this.stats.max_hp) {
      this.hp = this.stats.max_hp;
    }
    if (this.mp > this.stats.max_mp) {
      this.mp = this.stats.max_mp;
    }
  }

  apply_damage(dmg: number, minimum: number = 1) {
    console.assert(dmg >= 0);
    if (dmg > minimum) {
      this.hp -= dmg;
      return;
    }
    this.hp -= minimum;
  }

  count_upgrade(name: UpgradeName): number {
    let count = 0;
    for (const x of this.upgrades) {
      if (x.name === name) {
        count += 1;
      }
    }
    return count;
  }

  get_skill_names(): UpgradeName[] {
    console.assert(this.upgrades.length === this.sorted_upgrades.length);
    const names: UpgradeName[] = [];
    for (const x of this.sorted_upgrades) {
      if (x.skill === undefined) {
        continue;
      }
      names.push(x.name);
    }
    return names;
  }

  has_upgrade(name: UpgradeName): boolean {
    for (const x of this.upgrades) {
      if (x.name === name) {
        return true;
      }
    }
    return false;
  }

  get_upgrades_by_keyword(keyword: Keyword): NamedUpgrade[]{
    return this.upgrades.filter((x) => x.keywords !== undefined && x.keywords.includes(keyword));
  }

  remove_upgrade(name: UpgradeName) {
    this.upgrades = this.upgrades.filter((x) => x.name !== name);
    this.sort_upgrades();
  }

  add_xp(xp: number) {
    const level = this.level;
    this.xp += xp;
    if (this.stats.increased_xp > 0) {
      this.xp_cents += this.stats.increased_xp * xp;
      if (this.xp_cents >= 100) {
        this.overflow_xp += Math.floor(this.xp_cents / 100);
        this.xp_cents = this.xp_cents % 100;
      }
    }
    if (this.xp >= xp_threshold(level)) {
      this.overflow_xp += this.xp - xp_threshold(level);
      this.xp = 0;
      this.game.level_up();
      return;
    }
    if (this.overflow_xp === 0) {
      return; // No extra XP to add.
    }
    this.xp += this.overflow_xp;
    this.overflow_xp = 0;
    if (this.xp < xp_threshold(level)) {
      return;
    }
    // Too much XP added, remove some and let the player level up later
    this.overflow_xp = 1 + this.xp - xp_threshold(level);
    this.xp = xp_threshold(level) - 1;
    return;
  }

  update_stats() {
    console.assert(this.upgrades.length === this.sorted_upgrades.length);
    this.stats = new Stats(this.level);
    for (const u of this.sorted_upgrades) {
      u.passive?.(this);
    }
    for (const e of this.effects) {
      e.apply_stats?.();
    }
    this.speed = BASE_SPEED * (this.stats.speed + this.stats.movement_speed);
    if (this.stats.strength > 1) {
      this.stats.max_hp = this.stats.max_hp + (this.stats.strength - 1) * 2;
    }
    if (this.stats.magic > 1) {
      this.stats.max_mp = this.stats.max_mp + (this.stats.magic - 1) * 2;
    }
  }

  sort_upgrades() {
    this.sorted_upgrades = [];
    for (const name in all_upgrades) {
      for (const upgrade of this.upgrades) {
        if (name === upgrade.name) {
          this.sorted_upgrades.push(upgrade);
        }
      }
    }
    console.assert(this.upgrades.length === this.sorted_upgrades.length);
  }

  add_upgrade(upgrade: NamedUpgrade) {
    if (upgrade.on_pickup !== undefined) {
      upgrade.on_pickup(this);
    }
    if (upgrade.consumed === true) {
      return;
    }
    this.upgrades.push(upgrade);
    this.sort_upgrades();
    this.update_stats();
  }

  _animate(ms: number) {
    const factor = this.speed / BASE_SPEED;
    this.walk_counter += (3 * (ms * factor)) / 1000;
    if (this.walk_counter >= 2) {
      this.walk_counter = 0;
    }
  }
  get_text() {
    const name = this.name[0].toUpperCase() + this.name.slice(1);
    // HP and MP can be temporarly outside the limits,
    // but drawing this can be confusing for the player.
    const hp = limit(0, this.hp, this.stats.max_hp);
    const mp = limit(0, this.mp, this.stats.max_mp);
    return `${name}\nHp: ${hp}/${this.stats.max_hp}\nMp: ${mp}/${this.stats.max_mp}`;
  }
}

export class Player extends Creature {
  save_function?: SaveFunction;

  constructor(pos: CR, zone: Zone, game: Game) {
    super("Player", 1, pos, zone, game);
    this.defog();
  }

  generate_save(): GameSave {
    const save: GameSave = { permanents: [] };
    for (const u of this.upgrades) {
      if (u.permanent === true) {
        save.permanents.push(u.name);
      }
    }
    return save;
  }

  load_save(save: GameSave) {
    console.assert(this.level === 1);
    console.assert(this.effects.length === 0);
    for (const name of save.permanents) {
      this.add_upgrade(get_upgrade(name));
    }
  }

  override add_upgrade(upgrade: NamedUpgrade): void {
    super.add_upgrade(upgrade);
    if (this.save_function !== undefined && upgrade.permanent === true) {
      this.save_function(this.generate_save());
    }
  }

  apply_light(tile: Tile, intensity: LightLevel) {
    if (tile.is_lit()) {
      return;
    }
    if (intensity === 0) {
      if (tile.light > 1) {
        tile.light = 1;
      }
      return;
    }
    if (tile.is_empty() || intensity === 5) {
      tile.light = 5;
      tile.on_light_up();
      if (this.target !== null) {
        if (
          !tile.is_empty() && this.target.cr.c === tile.cr.c &&
          this.target.cr.r === tile.cr.r
        ) {
          const pos = cr(this.cr.c, this.cr.r);
          this.target = new Target(pos, this.game.current_zone, true);
        }
      }
      if (!tile.is_empty()) {
        // this.add_xp(1);
      }
      return;
    }
    console.assert(intensity < 5);
    tile.light = intensity;
  }

  defog() {
    if (this.zone.fully_lit === true) {
      return;
    }
    for (const tiles of this.zone.tiles) {
      for (const tile of tiles) {
        if (tile.is_lit()) {
          continue;
        }

        const distance = distance_cr(tile.cr, this.cr);
        const light_stat = this.stats.light;
        let light_base = 1;
        let light_extra = 0;
        if (light_stat === 1) {
          // no-op
        } else if (light_stat <= 5) {
          light_base = light_stat;
        } else {
          light_base = 5;
          light_extra = light_stat - 5;
        }

        // Adjacent tiles:
        if (distance <= 1.0 * DIAG + light_extra) {
          this.apply_light(tile, 5);
          continue;
        }
        if (light_base === 1) {
          this.apply_light(tile, 0);
          continue;
        }
        if (distance <= 2.0 * DIAG + light_extra) {
          this.apply_light(tile, 4);
          continue;
        }
        if (light_base === 2) {
          this.apply_light(tile, 0);
          continue;
        }
        if (distance <= 3.0 + light_extra) {
          this.apply_light(tile, 3);
          continue;
        }
        if (light_base === 3) {
          this.apply_light(tile, 0);
          continue;
        }
        if (distance <= 3.0 * DIAG + light_extra) {
          this.apply_light(tile, 2);
          continue;
        }
        if (light_base === 4) {
          this.apply_light(tile, 0);
          continue;
        }
        if (distance <= 5.0 + light_extra) {
          this.apply_light(tile, 1);
          continue;
        }
        this.apply_light(tile, 0);
      }
    }
    this.zone.check_fog();
  }

  check_for_exit() {
    if (
      this.cr.c === 0 ||
      this.cr.r === 0 ||
      this.cr.c === this.game.current_zone.columns - 1 ||
      this.cr.r === this.game.current_zone.rows - 1
    ) {
      return this.game.new_zone();
    }
  }

  teleport(target: CR) {
    this.cr.c = target.c;
    this.cr.r = target.r;
    this.xy.x = this.cr.c * this.wh.width;
    this.xy.y = this.cr.r * this.wh.height;
    this.fxy = null;
  }

  override tick(ms: number) {
    for (const item of this.inventory) {
      item.tick(ms);
    }
    if (this.target === null) {
      return;
    }
    this.target.tick(ms);
    if (this.fxy === null) {
      this.fxy = xy(this.xy.x, this.xy.y);
    }
    const step = (this.speed * ms) / 1000.0;
    const dist = distance_xy(this.fxy, this.target.xy);
    if (isNaN(dist) || dist <= step) {
      this.xy.x = this.target.xy.x;
      this.xy.y = this.target.xy.y;
      this.fxy.x = this.xy.x;
      this.fxy.y = this.xy.y;
      this.target = null;
      this.walk_counter = 0;
      this.check_for_exit();
      return;
    }
    this._animate(ms);
    const length = step / dist;
    const dx = (this.target.xy.x - this.fxy.x) * length;
    if (dx > 0) {
      // Moving right
      this.reversed = false;
    } else if (dx < 0) {
      // Moving left
      this.reversed = true;
    }
    const dy = (this.target.xy.y - this.fxy.y) * length;
    this.fxy.x += dx;
    this.fxy.y += dy;
    this.xy.x = Math.floor(this.fxy.x);
    this.xy.y = Math.floor(this.fxy.y);

    const new_pos = xy_to_cr(this.center, this.zone);
    if (new_pos.c === this.cr.c && new_pos.r === this.cr.r) {
      return;
    }
    this.cr.c = new_pos.c;
    this.cr.r = new_pos.r;
    this.defog();
    const tile = this.game.current_zone.get_tile(this.cr);
    if (tile.is_interactable()) {
      this.interact(tile);
    }
  }
  interact(tile: Tile) {
    const enemy = tile.get_enemy();
    if (enemy !== null) {
      tile.remove_enemy(enemy);
      return this.game.start_battle(this, enemy);
    }
    const item = tile.pickup();
    item.start_animation();
    this.inventory.push(item);
  }
}

export type LightLevel = 0 | 1 | 2 | 3 | 4 | 5;

export class Tile {
  light: LightLevel;
  entities: Entity[];
  cr: CR;
  xy: XY;
  constructor(cr: CR) {
    this.light = 0;
    this.entities = [];
    this.cr = cr;
    this.xy = xy(cr.c * 16, cr.r * 16);
  }

  _find_rock(): Entity | null {
    for (const x of this.entities) {
      if (x.name === "Rock") {
        return x;
      }
    }
    return null;
  }

  get_rock_variant(): number | null {
    const rock = this._find_rock();
    if (rock === null) {
      return null;
    }
    return rock.variant;
  }

  set_rock_variant(variant: number | null) {
    if (variant === null) {
      return;
    }
    const rock = this._find_rock();
    if (rock === null) {
      return;
    }
    rock.variant = variant;
  }

  is_rock() {
    return this.get_rock_variant() !== null;
  }

  is_empty() {
    return this.entities.length === 0;
  }

  get_enemy(): Enemy | null {
    for (const e of this.entities) {
      if (e instanceof Enemy) {
        return e;
      }
    }
    return null;
  }

  remove_enemy(enemy: Creature) {
    const before = this.entities.length;
    this.entities = this.entities.filter((e) => e !== enemy);
    console.assert(before === this.entities.length + 1);
  }

  has_enemy() {
    const enemy = this.get_enemy();
    if (enemy === null) {
      return false;
    }
    return true;
  }

  is_interactable() {
    if (this.is_empty() || this.is_rock()) {
      return false;
    }
    if (this.entities[0].name === "Sword") {
      return true;
    }
    if (this.has_enemy()) {
      return true;
    }
    return false;
  }

  pickup() {
    console.assert(this.entities.length > 0);
    console.assert(this.entities[0].name === "Sword");
    const item = this.entities[0];
    array_remove(this.entities, item);
    return item;
  }

  is_lit(): boolean {
    return this.light === 5;
  }

  on_light_up() {
    for (const e of this.entities) {
      e.on_light_up();
    }
  }
}

export class Zone extends Grid {
  tiles: Tile[][];
  all_tiles: Tile[];
  fully_lit: boolean;
  room_type: RoomType;
  constructor(
    grid: Grid,
    public game: Game,
    public pos: CR,
    public left_entry?: number,
    public right_entry?: number,
    public top_entry?: number,
    public bottom_entry?: number,
  ) {
    super(grid.width, grid.height, grid.columns, grid.rows);
    this.fully_lit = false;
    this.tiles = [];
    this.all_tiles = [];
    this.room_type = "generic";
    for (let c = 0; c < grid.columns; c++) {
      const column = [];
      for (let r = 0; r < grid.rows; r++) {
        const tile: Tile = new Tile(cr(c, r));
        column.push(tile);
        this.all_tiles.push(tile);
      }
      this.tiles.push(column);
    }
    game.put_zone(this);
    generate_room(this);
  }

  tick(ms: number) {
    for (const x of this.get_entities()) {
      x.tick(ms);
    }
  }

  check_fog() {
    if (this.fully_lit === true) {
      return;
    }
    for (const tile of this.all_tiles) {
      if (!tile.is_lit()) {
        return;
      }
    }
    this.fully_lit = true;
    this.game.player.add_xp(100);
  }

  starting_zone(): boolean {
    return this.pos.c === 0 && this.pos.r === 0;
  }

  inside(pos: CR): boolean {
    return (
      pos.c >= 0 && pos.r >= 0 && pos.r < this.rows && pos.c < this.columns
    );
  }

  get_entities(pos?: CR): Entity[] {
    if (pos !== undefined) {
      return this.tiles[pos.c][pos.r].entities;
    }
    const result = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.columns; c++) {
        for (const entity of this.get_entities(cr(c, r))) {
          result.push(entity);
        }
      }
    }
    return result;
  }

  empty(pos: CR): boolean {
    return this.get_entities(pos).length === 0;
  }

  append(entity: Entity) {
    const pos = entity.cr;
    if (!this.inside(pos)) {
      return;
    }
    this.get_tile(pos).entities.push(entity);
  }

  remove(pos: CR, entity: Entity) {
    const entities = this.get_tile(pos).entities;
    array_remove(entities, entity);
  }

  get_tile(pos: CR): Tile {
    return this.tiles[pos.c][pos.r];
  }
}

export type GameState =
  | "zone"
  | "level_up"
  | "loading"
  | "world_map"
  | "battle"
  | "game_over"
  | "retry";

export class Choice {
  pos: XY;
  size: WH;
  hovered: boolean;

  constructor(
    public name: UpgradeName,
    public description: string,
    index: number,
    window: WH,
  ) {
    const card_width = Math.floor(window.width / 3) - 10;
    const card_height = Math.floor(window.height / 2);
    const y = window.height / 2 - card_height / 2;
    this.pos = xy(5 + index * (card_width + 10), y);
    this.size = wh(card_width, card_height);
    this.hovered = false;
  }

  set(upgrade: NamedUpgrade) {
    this.name = upgrade.name;
    this.description = upgrade.description;
  }

  is_inside(position: XY) {
    if (position.x < this.pos.x) {
      return false;
    }
    if (position.y < this.pos.y) {
      return false;
    }
    if (position.x > this.pos.x + this.size.width) {
      return false;
    }
    if (position.y > this.pos.y + this.size.height) {
      return false;
    }
    return true;
  }

  hover(position: XY) {
    const inside = this.is_inside(position);
    if (inside === this.hovered) {
      return;
    }
    this.hovered = !this.hovered;
  }
}

function map_range(
  x: number,
  from_low: number,
  from_high: number,
  to_low: number,
  to_high: number,
) {
  const from_diff = from_high - from_low;
  const to_diff = to_high - to_low;
  const fraction = (x - from_low) / from_diff;
  return to_low + fraction * to_diff;
}

function map_range_clamped(
  x: number,
  from_low: number,
  from_high: number,
  to_low: number,
  to_high: number,
) {
  const result = map_range(x, from_low, from_high, to_low, to_high);
  if (result < to_low) {
    return to_low;
  }
  if (result > to_high) {
    return to_high;
  }
  return result;
}

export class ZoneTransition {
  offset: number = 0;
  end: number;
  clock: number = 0;
  speed: number;
  direction: "left" | "right" | "up" | "down";

  constructor(
    public from: Zone,
    public to: Zone,
    speed: number,
  ) {
    console.assert(
      from.pos.c === to.pos.c ||
        from.pos.c === to.pos.c - 1 ||
        from.pos.c === to.pos.c + 1,
    );
    console.assert(
      from.pos.r === to.pos.r ||
        from.pos.r === to.pos.r - 1 ||
        from.pos.r === to.pos.r + 1,
    );
    console.assert(from.pos.c === to.pos.c || from.pos.r === to.pos.r);
    console.assert(from.pos.c !== to.pos.c || from.pos.r !== to.pos.r);

    this.speed = map_range_clamped(speed, 1, 5, 200, 500);

    if (from.pos.c < to.pos.c) {
      this.direction = "right";
      this.end = from.width;
    } else if (from.pos.c > to.pos.c) {
      this.direction = "left";
      this.end = from.width;
    } else if (from.pos.r > to.pos.r) {
      this.direction = "down";
      this.end = from.height;
    } else {
      console.assert(from.pos.r < to.pos.r);
      this.direction = "up";
      this.end = from.height;
    }
  }

  get xy_from(): XY {
    switch (this.direction) {
      case "left":
        return xy(this.offset, 0);
      case "right":
        return xy(this.offset * -1, 0);
      case "up":
        return xy(0, this.offset * -1);
      case "down":
        return xy(0, this.offset);
    }
    return xy(0, 0);
  }

  get xy_to(): XY {
    switch (this.direction) {
      case "left":
        return xy(16 - 1 * (this.end - this.offset), 0);
      case "right":
        return xy(-16 + this.end - this.offset, 0);
      case "up":
        return xy(0, -16 + this.end - this.offset);
      case "down":
        return xy(0, 16 - 1 * (this.end - this.offset));
    }
    return xy(0, 0);
  }

  tick(ms: number) {
    this.clock += ms;
    this.offset = Math.round(this.speed * (this.clock / 1000));
  }

  get done(): boolean {
    if (this.offset < this.end - 16) {
      return false;
    }
    return true;
  }
}

export class Enemy extends Creature {
  constructor(
    name: SpriteName,
    level: number,
    pos: CR,
    zone: Zone,
    game: Game,
  ) {
    super(name, level, pos, zone, game);
  }

  override on_light_up(): void {
    this.start_animation();
  }
}

export class BattleSkill {
  disabled: boolean = false;
  constructor(public rectangle: Rectangle, public name: UpgradeName) {}
}

export class BattleIntent {
  constructor(
    public skill: UpgradeName,
    public user: Creature,
    public target: Creature,
    public battle: Battle,
  ) {
  }

  perform(): BattleEvent[] {
    const skill = get_upgrade(this.skill);
    let message = `${this.user.name} used ${this.skill}.`;
    if (this.skill === "Run") {
      message = "";
    }
    if (
      skill.mana_cost !== undefined && skill.mana_cost(this.user) > this.user.mp
    ) {
      return [new BattleEvent("Not enough mana")];
    }
    const func = get_skill(this.skill);
    const apply = func(this.user, this.target, this.battle, skill);
    const event = new BattleEvent(message, apply);
    return [event];
  }
}

export class BattleEvent {
  done: boolean = false;
  ms: number = 0;
  text: string = "";
  clicked: boolean = false;
  constructor(public msg: string, public apply?: SkillApply) {
  }

  click() {
    this.clicked = true;
  }
  tick(ms: number) {
    if (this.done) {
      return;
    }
    const speed = this.clicked ? 10.0 : 1.0;
    this.ms += speed + ms;
    const n = Math.floor(this.ms / 50);
    this.text = this.msg.substring(0, n);
    if (this.ms > this.msg.length * 50 + 250) {
      this.apply?.();
      this.done = true;
    }
  }
}

export type BattleState =
  | "skill_select"
  | "skills"
  | "end_of_turn"
  | "ending_soon"
  | "over";

export class Battle {
  mouse: XY | null = null;
  state: BattleState = "skill_select";
  skills: BattleSkill[];
  intents: BattleIntent[] = [];
  events: BattleEvent[] = [];

  hover_index: number | null = null;

  current_event: BattleEvent | null = null;

  constructor(public player: Player, public enemy: Enemy) {
    player.run = false;
    enemy.run = false;
    let y = 6;
    const skills: UpgradeName[] = this.player.get_skill_names();
    const lim = skills.length > 8 ? 8 : skills.length;
    this.skills = [];
    for (let i = 0; i < lim; ++i) {
      const rect = rectangle(xy(174, y), wh(77, 20));
      y += 20 + 3;
      const name = skills[i];
      this.skills.push(new BattleSkill(rect, name));
    }
    this.disable_buttons();
    this.update_stats_and_limits();
  }

  add_events(...events: BattleEvent[]) {
    for (const e of events) {
      this.events.push(e);
    }
  }

  _get_intents(): BattleIntent[] {
    if (this.intents.length === 0) {
      return [];
    }
    let fastest_speed: number | undefined = undefined;
    let fastest_intents: BattleIntent[] = [];
    const others: BattleIntent[] = [];
    for (const intent of this.intents) {
      if (fastest_speed === undefined) {
        fastest_speed = intent.user.stats.speed;
        fastest_intents.push(intent);
        continue;
      }
      if (fastest_speed > intent.user.stats.speed) {
        others.push(intent);
        continue;
      }
      if (fastest_speed === intent.user.stats.speed) {
        fastest_intents.push(intent);
        continue;
      }
      console.assert(fastest_speed < intent.user.stats.speed);
      others.push(...fastest_intents);
      fastest_intents = [intent];
      fastest_speed = intent.user.stats.speed;
    }
    this.intents = others;
    return fastest_intents;
  }

  update_stats_and_limits() {
    this.player.update_stats();
    this.enemy.update_stats();
    this.player.apply_limits();
    this.enemy.apply_limits();
  }

  after_events() {
    console.assert(this.events.length === 0);
    this.update_stats_and_limits();
    if (this.state === "over") {
      return this.state;
    }
    if (this.state === "ending_soon") {
      return this.state_transitions();
    }
    if (this.player.hp === 0 || this.enemy.hp === 0) {
      this.intents = [];
      const msg = this.player.hp === 0
        ? `${this.player.name} died.`
        : `${this.enemy.name} died.`;
      this.add_events(new BattleEvent(msg, () => {}));
      return this.goto_state("ending_soon");
    }
    if (this.player.run === true || this.enemy.run === true) {
      this.intents = [];
      const msg = this.player.run
        ? `${this.player.name} fled like a coward.`
        : `${this.enemy.name} ran away.`;
      this.add_events(new BattleEvent(msg, () => {}));
      return this.goto_state("ending_soon");
    }
    return this.state;
  }

  _end_of_turn() {
    console.assert(this.events.length === 0);
    console.assert(this.intents.length === 0);
    this.add_events(
      ...this.player.tick_effects(),
      ...this.enemy.tick_effects(),
    );
  }

  goto_state(new_state: BattleState): BattleState {
    if (this.state === new_state) {
      return this.state;
    }
    this.state = new_state;
    if (this.state === "end_of_turn") {
      this._end_of_turn();
    }
    if (this.state === "skill_select") {
      this.disable_buttons();
    }
    return this.state;
  }

  _process_event_queue() {
    console.assert(this.current_event === null);
    const event = this.events.shift();
    if (event !== undefined) {
      this.current_event = event;
      if (this.current_event.msg === "") {
        this.current_event.apply?.();
        this.current_event = null;
        this._process_event_queue();
      }
    }
  }

  _process_intent_queue() {
    console.assert(this.intents.length > 0);
    while (this.events.length === 0 && this.intents.length > 0) {
      const intents: BattleIntent[] = this._get_intents();
      for (const intent of intents) {
        for (const event of intent.perform()) {
          this.add_events(event);
        }
      }
    }
  }

  advance() {
    console.assert(
      this.current_event !== null || this.events.length > 0 ||
        this.intents.length > 0,
    );
    if (this.state === "ending_soon" || this.state === "over") {
      console.assert(this.intents.length === 0);
    }

    if (this.current_event !== null) {
      if (this.current_event.done && this.current_event.clicked) {
        this.current_event = null;
      } else {
        return;
      }
    }

    console.assert(this.current_event === null);
    this._process_event_queue();
    if (this.current_event !== null) {
      return;
    }

    // No more events queued
    this.after_events();

    // Now there could be some battle over events:
    this._process_event_queue();
    if (this.current_event !== null) {
      return;
    }

    if (this.current_event === null && this.events.length === 0) {
      this.after_events();
    }

    if (this.intents.length === 0) {
      return;
    }

    // Get next intent(s)
    // console.assert(this.state === "skills");
    console.assert(this.intents.length > 0 && this.events.length === 0);
    this._process_intent_queue();
    console.assert(this.events.length > 0 || this.intents.length === 0);
    this._process_event_queue();
    if (this.current_event === null && this.events.length === 0) {
      this.after_events();
    }
  }

  state_transitions() {
    if (this.state === "over") {
      return this.state;
    }
    if (
      this.current_event === null && this.events.length === 0 &&
      this.intents.length === 0
    ) {
      if (this.state === "skills") {
        return this.goto_state("end_of_turn");
      }
      if (this.state === "end_of_turn") {
        return this.goto_state("skill_select");
      }
      if (this.state === "ending_soon") {
        return this.goto_state("over");
      }
    }
    return this.state;
  }

  disable_buttons() {
    for (let i = 0; i < this.skills.length; i++) {
      const skill = get_upgrade(this.skills[i].name);
      if (
        skill.mana_cost !== undefined &&
        this.player.mp < skill.mana_cost(this.player)
      ) {
        this.skills[i].disabled = true;
      } else {
        this.skills[i].disabled = false;
      }
    }
  }

  hover(position: XY) {
    this.mouse = position;
    for (let i = 0; i < this.skills.length; i++) {
      if (inside(this.mouse, this.skills[i].rectangle)) {
        this.hover_index = i;
        return;
      }
    }
    this.hover_index = null;
  }
  click(position: XY) {
    if (this.current_event !== null) {
      if (this.current_event.done) {
        this.current_event = null;
        return;
      }
      this.current_event.click();
      return;
    }
    if (this.state !== "skill_select") {
      return;
    }
    this.hover(position);
    if (this.hover_index === null) {
      return;
    }
    if (this.skills[this.hover_index].disabled === true) {
      return;
    }
    const player_intent = new BattleIntent(
      this.skills[this.hover_index].name,
      this.player,
      this.enemy,
      this,
    );
    const enemy_intent = new BattleIntent(
      this.enemy.get_skill_names()[0],
      this.enemy,
      this.player,
      this,
    );
    this.intents.push(player_intent);
    this.intents.push(enemy_intent);
    this.goto_state("skills");
    this.state_transitions();
    this.advance();
    if (this.events.length === 0) {
      this.after_events();
    }
    this.state_transitions();
  }

  tick(ms: number) {
    this.state_transitions();
    if (
      this.current_event === null && this.events.length === 0 &&
      this.intents.length === 0
    ) {
      return;
    }
    if (this.current_event !== null) {
      this.current_event.tick(ms);
    }
    this.advance();
    if (this.events.length === 0) {
      this.after_events();
    }
    this.state_transitions();
  }
}

export class Game {
  transition: ZoneTransition | null = null;
  previous_zone: Zone | null = null;
  disabled_clicks_ms: number = 0;
  state: GameState = "zone";
  keyboard: Keyboard = new Keyboard();
  player: Player;
  current_zone: Zone;
  zones: Record<string, Zone> = {};
  choices: Choice[];
  battle: Battle | null;
  restart: boolean = false;
  constructor(public grid: Grid, save?: GameSave) {
    this.current_zone = new Zone(grid, this, cr(0, 0));
    this.put_zone(this.current_zone);
    this.player = new Player(cr(7, 3), this.current_zone, this);
    if (save !== undefined) {
      this.player.load_save(save);
    }
    this.player.defog();
    this.choices = [];
    this.choices.push(new Choice("Attack", "Placeholder", 0, grid));
    this.choices.push(new Choice("Attack", "Placeholder", 1, grid));
    this.choices.push(new Choice("Attack", "Placeholder", 2, grid));
    this.battle = null;
  }

  start_battle(player: Player, enemy: Enemy) {
    this.battle = new Battle(player, enemy);
    this.state = "battle";
  }

  put_zone(zone: Zone) {
    const key = "" + zone.pos.c + "," + zone.pos.r;
    this.zones[key] = zone;
  }

  get_zone(pos: CR): Zone | null {
    const key = "" + pos.c + "," + pos.r;
    if (key in this.zones) {
      return this.zones[key];
    }
    return null;
  }

  new_zone() {
    const right = this.current_zone.columns - 1;
    const bottom = this.current_zone.rows - 1;
    let left_entry = undefined;
    let right_entry = undefined;
    let top_entry = undefined;
    let bottom_entry = undefined;
    const zone_pos = cr(this.current_zone.pos.c, this.current_zone.pos.r);
    if (this.player.cr.c === 0) {
      // player exited left
      zone_pos.c -= 1;
      right_entry = this.player.cr.r;
      this.player.teleport(cr(right, this.player.cr.r));
    } else if (this.player.cr.r === 0) {
      // player exited top
      zone_pos.r -= 1;
      bottom_entry = this.player.cr.c;
      this.player.teleport(cr(this.player.cr.c, bottom));
    } else if (this.player.cr.c === this.current_zone.columns - 1) {
      // player exited right
      zone_pos.c += 1;
      left_entry = this.player.cr.r;
      this.player.teleport(cr(0, this.player.cr.r));
    } else if (this.player.cr.r === this.current_zone.rows - 1) {
      // player exited bottom
      zone_pos.r += 1;
      top_entry = this.player.cr.c;
      this.player.teleport(cr(this.player.cr.c, 0));
    } else {
      console.log("Error: new_zone called without player exiting!");
      return;
    }

    let zone = this.get_zone(zone_pos);
    if (zone === null) {
      zone = new Zone(
        this.grid,
        this,
        zone_pos,
        left_entry,
        right_entry,
        top_entry,
        bottom_entry,
      );
    }
    this.start_transition(zone);
  }

  tile_update(from: Tile, to: Tile) {
    to.light = from.light;
    to.set_rock_variant(from.get_rock_variant());
    const from_rock = from._find_rock();
    const to_rock = to._find_rock();
    if (to_rock === null || from_rock === null) {
      return;
    }
    to_rock.reversed = from_rock.reversed;
  }

  update_to_neighbors() {
    const zone = this.current_zone;
    const left = this.get_zone(cr(zone.pos.c - 1, zone.pos.r));
    const right = this.get_zone(cr(zone.pos.c + 1, zone.pos.r));
    const top = this.get_zone(cr(zone.pos.c, zone.pos.r - 1));
    const bottom = this.get_zone(cr(zone.pos.c, zone.pos.r + 1));

    for (let r = 0; r < zone.rows; r++) {
      if (left !== null) {
        this.tile_update(zone.tiles[0][r], left.tiles[left.columns - 1][r]);
      }
      if (right !== null) {
        this.tile_update(zone.tiles[zone.columns - 1][r], right.tiles[0][r]);
      }
    }
    for (let c = 0; c < zone.columns; c++) {
      if (top !== null) {
        this.tile_update(zone.tiles[c][0], top.tiles[c][top.rows - 1]);
      }
      if (bottom !== null) {
        this.tile_update(zone.tiles[c][zone.rows - 1], bottom.tiles[c][0]);
      }
    }
  }

  update_from_neighbors() {
    const zone = this.current_zone;
    const left = this.get_zone(cr(zone.pos.c - 1, zone.pos.r));
    const right = this.get_zone(cr(zone.pos.c + 1, zone.pos.r));
    const top = this.get_zone(cr(zone.pos.c, zone.pos.r - 1));
    const bottom = this.get_zone(cr(zone.pos.c, zone.pos.r + 1));

    for (let r = 0; r < zone.rows; r++) {
      if (left !== null) {
        this.tile_update(left.tiles[left.columns - 1][r], zone.tiles[0][r]);
      }
      if (right !== null) {
        this.tile_update(right.tiles[0][r], zone.tiles[zone.columns - 1][r]);
      }
    }
    for (let c = 0; c < zone.columns; c++) {
      if (top !== null) {
        this.tile_update(top.tiles[c][top.rows - 1], zone.tiles[c][0]);
      }
      if (bottom !== null) {
        this.tile_update(bottom.tiles[c][0], zone.tiles[c][zone.rows - 1]);
      }
    }
  }

  start_transition(zone: Zone) {
    this.transition = new ZoneTransition(
      this.current_zone,
      zone,
      this.player.stats.speed,
    );
    this.update_to_neighbors();
    this.current_zone = zone;
    this.player.zone = zone;
    this.update_from_neighbors();
    this.player.defog();
  }

  disable_clicks(ms: number) {
    if (ms < this.disabled_clicks_ms) {
      return;
    }
    this.disabled_clicks_ms = ms;
  }

  goto_state(state: GameState) {
    this.state = state;
    this.disable_clicks(200);
  }

  level_up() {
    this.player.level += 1;
    this.goto_state("level_up");
    const upgrades = get_upgrade_choices(this.player);
    this.choices[0].set(upgrades[0]);
    this.choices[1].set(upgrades[1]);
    this.choices[2].set(upgrades[2]);
  }

  attempt_move_or_interact(pos: CR, mouse: boolean) {
    const tile = this.current_zone.get_tile(pos);
    console.assert(tile.is_empty() || tile.is_interactable() || !tile.is_lit());
    this.player.target = new Target(pos, this.grid, mouse);
  }

  zone_click(position: XY) {
    const pos = xy_to_cr(position, this.grid);
    if (
      this.player.target === null &&
      pos.c === this.player.cr.c &&
      pos.r === this.player.cr.r
    ) {
      return;
    }
    let tile = this.current_zone.get_tile(pos);

    if (
      !tile.is_lit() &&
      (pos.c === 0 || pos.r === 0 || pos.c === this.current_zone.columns - 1 ||
        pos.r === this.current_zone.rows - 1)
    ) {
      if (pos.c === 0) {
        pos.c = 1;
      }
      if (pos.r === 0) {
        pos.r = 1;
      }
      if (pos.c === this.current_zone.columns - 1) {
        pos.c -= 1;
      }
      if (pos.r === this.current_zone.rows - 1) {
        pos.r -= 1;
      }
      tile = this.current_zone.get_tile(pos);
    }

    if (tile.is_lit() && !tile.is_empty() && !tile.is_interactable()) {
      return;
    }

    this.attempt_move_or_interact(pos, true);
  }

  level_up_click(position: XY) {
    for (const x of this.choices) {
      if (x.is_inside(position)) {
        const missing_hp = this.player.stats.max_hp - this.player.hp;
        const missing_mp = this.player.stats.max_mp - this.player.mp;
        this.player.add_upgrade(get_upgrade(x.name));
        this.player.hp = this.player.stats.max_hp - missing_hp;
        this.player.mp = this.player.stats.max_mp - missing_mp;
        this.goto_state("zone");
        this.player.defog();
        return;
      }
    }
  }

  keyboard_update() {
    if (this.transition !== null) {
      return;
    }
    if (this.disabled_clicks_ms > 0) {
      return;
    }
    const pos = cr(0, 0);
    const up = this.keyboard.pressed("w") || this.keyboard.pressed("ArrowUp");
    const down = this.keyboard.pressed("s") ||
      this.keyboard.pressed("ArrowDown");
    const left = this.keyboard.pressed("a") ||
      this.keyboard.pressed("ArrowLeft");
    const right = this.keyboard.pressed("d") ||
      this.keyboard.pressed("ArrowRight");

    if (up === down && left === right) {
      return;
    }

    if (this.player.target === null) {
      if (
        (up && this.player.cr.r === 0) ||
        (left && this.player.cr.c === 0) ||
        (down && this.player.cr.r === this.current_zone.rows - 1) ||
        (right && this.player.cr.c === this.current_zone.columns - 1)
      ) {
        this.attempt_move_or_interact(this.player.cr, false);
        return;
      }
    }

    if (up && !down) {
      pos.r = -1;
    } else if (down && !up) {
      pos.r = 1;
    }
    if (left && !right) {
      pos.c = -1;
    } else if (right && !left) {
      pos.c = 1;
    }

    console.assert(pos.c !== 0 || pos.r !== 0);
    pos.c += this.player.cr.c;
    pos.r += this.player.cr.r;
    if (!this.current_zone.inside(pos)) {
      return;
    }
    if (
      this.player.target !== null &&
      pos.c === this.player.target.cr.c &&
      pos.r === this.player.target.cr.r
    ) {
      return;
    }
    const tile = this.current_zone.tiles[pos.c][pos.r];
    if (!tile.is_lit()) {
      return;
    }
    if (tile.is_empty() || tile.is_interactable()) {
      this.attempt_move_or_interact(pos, false);
      return;
    }
    const alternatives: CR[] = cr_4_neighbors(
      this.player.cr,
      up,
      down,
      left,
      right,
    );
    let second_choice = null;
    for (const neighbor of alternatives) {
      if (!this.current_zone.inside(neighbor)) {
        continue;
      }
      const tile = this.current_zone.get_tile(neighbor);
      if (!tile.is_empty()) {
        continue;
      }
      if (
        neighbor.c === 0 ||
        neighbor.r === 0 ||
        neighbor.c === this.current_zone.columns - 1 ||
        neighbor.r === this.current_zone.rows - 1
      ) {
        this.attempt_move_or_interact(neighbor, false);
        return;
      }
      second_choice = neighbor;
    }
    if (second_choice === null) {
      return;
    }
    this.attempt_move_or_interact(second_choice, false);
  }

  click(position: XY) {
    if (this.transition !== null) {
      return;
    }
    if (this.disabled_clicks_ms > 0) {
      return;
    }
    if (this.state === "retry") {
      this.restart = true;
      return;
    }
    if (this.state === "battle" && this.battle !== null) {
      this.battle.click(position);
      return;
    }
    if (this.state === "zone") {
      return this.zone_click(position);
    }
    if (this.state === "level_up") {
      return this.level_up_click(position);
    }
  }

  hover(position: XY) {
    if (this.state === "battle" && this.battle !== null) {
      this.battle.hover(position);
      return;
    }
    for (const x of this.choices) {
      x.hover(position);
    }
  }

  exit_battle() {
    console.assert(this.battle !== null);
    const battle = this.battle;
    if (battle === null) {
      console.log("Error: null battle");
      return;
    }
    const player: Player = battle.player;
    const enemy: Enemy = battle.enemy;
    console.assert(player.hp >= 0);
    console.assert(enemy.hp >= 0);

    player.effects = [];

    if (player.hp <= 0) {
      this.goto_state("game_over");
      this.disable_clicks(3000);
      this.battle = null;
      return;
    }
    this.goto_state("zone");
    this.battle = null;
    if (enemy.hp === 0) {
      player.add_xp(xp_reward(enemy.level));
    }
  }

  tick(ms: number) {
    if (this.disabled_clicks_ms > 0) {
      this.disabled_clicks_ms -= ms;
      if (this.disabled_clicks_ms <= 0) {
        this.disabled_clicks_ms = 0;
      }
    }
    if (this.state === "game_over" && this.disabled_clicks_ms <= 0) {
      this.goto_state("retry");
    }
    if (this.transition !== null) {
      this.transition.tick(ms);
      if (this.transition.done) {
        this.transition = null;
      }
      return;
    }
    if (this.state === "zone" || this.state === "world_map") {
      this.player.tick(ms);
      if (this.player.target === null) {
        this.keyboard_update();
      }
    }
    if (this.state === "zone") {
      this.current_zone.tick(ms);
    }
    if (this.state === "battle") {
      const battle = this.battle;
      if (battle === null) {
        console.log("Error: null battle");
        return;
      }
      if (battle.state === "over") {
        this.exit_battle();
        return;
      }
      battle.tick(ms);
    }
  }
}
