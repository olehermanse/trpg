import { CR, XY } from "@olehermanse/utils";
import {
  array_remove,
  cr,
  cr_to_xy,
  distance_cr,
  distance_xy,
  Grid,
  randint,
  WH,
  wh,
  xy,
  xy_to_cr,
} from "@olehermanse/utils/funcs.js";
import {
  get_ugrade,
  get_upgrade_choices,
  NamedUpgrade,
  UpgradeName,
} from "./upgrades.ts";

const DIAG = 1.42;
const BASE_SPEED = 16.0;

export class Entity {
  name: string;
  zone: Zone;
  xy: XY;
  fxy: XY | null; // can hold floating point xy values, so players can move half pixels.
  cr: CR;
  wh: WH;
  variant: number;
  reversed = false;

  constructor(name: string, pos: CR, zone: Zone, variant?: number) {
    this.name = name;
    this.zone = zone;
    this.cr = cr(pos.c, pos.r);
    this.wh = wh(zone.cell_width, zone.cell_height);
    this.xy = cr_to_xy(this.cr, zone);
    this.variant = variant ?? 0;
    this.fxy = null;
  }

  get center(): XY {
    const r = xy(this.xy.x, this.xy.y);
    r.x += this.wh.width / 2;
    r.y += this.wh.height / 2;
    return r;
  }
}

export class Stats {
  speed = 1;
  light = 1;
  luck = 1;
  strength = 1;
  magic = 1;
}

export class Target {
  xy: XY;
  ms: number = 0;
  frame: number = 0;
  constructor(public cr: CR, grid: Grid) {
    this.xy = cr_to_xy(cr, grid);
  }
  tick(ms: number) {
    this.ms = (this.ms + ms) % 500;
    this.frame = Math.floor(this.ms / 250);
  }
}

export class Player extends Entity {
  level = 1;
  xp = 0;
  stats: Stats;
  upgrades: NamedUpgrade[];
  speed = BASE_SPEED;
  walk_counter = 0;
  target: Target | null = null;
  game: Game;

  constructor(pos: CR, zone: Zone, game: Game) {
    super("player", pos, zone);
    this.game = game;
    this.upgrades = [];
    this.stats = new Stats();
    this.defog();
  }

  get center() {
    return xy(this.xy.x + this.wh.width / 2, this.xy.y + this.wh.height / 2);
  }

  xp_threshold() {
    return 10 * this.level;
  }

  add_xp(xp: number) {
    this.xp += xp;
    if (this.xp >= this.xp_threshold()) {
      this.xp = 0;
      this.game.level_up();
    }
  }

  add_upgrade(upgrade: NamedUpgrade) {
    this.upgrades.push(upgrade);
    upgrade.apply(this);
    this.speed = BASE_SPEED * this.stats.speed;
  }

  apply_light(tile: Tile, intensity: LightLevel) {
    if (intensity === 0) {
      tile.light = 0;
      return;
    }
    if (tile.is_empty() || intensity === 5) {
      tile.light = 5;
      let xp_reward = 0;
      if (!tile.is_empty()) {
        xp_reward += 1;
      }
      this.zone.fog -= 1;
      if (this.zone.fog === 0) {
        xp_reward += 15;
      }
      this.add_xp(xp_reward);
      return;
    }
    tile.light = intensity;
  }

  defog() {
    if (this.zone.fog === 0) {
      return;
    }
    for (const tiles of this.zone.tiles) {
      for (const tile of tiles) {
        if (tile.light === 5) {
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
  }

  _animate(ms: number) {
    const factor = this.speed / BASE_SPEED;
    this.walk_counter += (3 * (ms * factor)) / 1000;
    if (this.walk_counter >= 2) {
      this.walk_counter = 0;
    }
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

  tick(ms: number) {
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

  is_empty() {
    return this.entities.length === 0;
  }
}

export class Zone extends Grid {
  tiles: Tile[][];
  all_tiles: Tile[];
  fog: number;
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
    this.fog = grid.columns * grid.rows;
    this.tiles = [];
    this.all_tiles = [];
    for (let c = 0; c < grid.columns; c++) {
      const column = [];
      for (let r = 0; r < grid.rows; r++) {
        const tile: Tile = new Tile(cr(c, r));
        column.push(tile);
        this.all_tiles.push(tile);
      }
      this.tiles.push(column);
    }
  }

  discover_neighbors() {
    const left = this.game.get_zone(cr(this.pos.c - 1, this.pos.r));
    const right = this.game.get_zone(cr(this.pos.c + 1, this.pos.r));
    const top = this.game.get_zone(cr(this.pos.c, this.pos.r - 1));
    const bottom = this.game.get_zone(cr(this.pos.c, this.pos.r + 1));
    if (left !== null) {
      this.left_entry = left.right_entry;
    }
    if (right !== null) {
      this.right_entry = right.left_entry;
    }
    if (top !== null) {
      this.top_entry = top.bottom_entry;
    }
    if (bottom !== null) {
      this.bottom_entry = bottom.top_entry;
    }
  }

  generate() {
    this.discover_neighbors();
    this.left_entry ??= randint(1, this.rows - 2);
    this.right_entry ??= randint(1, this.rows - 2);
    for (let r = 0; r < this.rows; r++) {
      if (r !== this.left_entry) {
        this.append(new Entity("rock", cr(0, r), this, randint(0, 2)));
      }
      if (r !== this.right_entry) {
        this.append(
          new Entity("rock", cr(this.columns - 1, r), this, randint(0, 2)),
        );
      }
    }
    this.top_entry ??= randint(1, this.columns - 2);
    this.bottom_entry ??= randint(1, this.columns - 2);
    for (let c = 1; c < this.columns - 1; c++) {
      if (c !== this.top_entry) {
        this.append(new Entity("rock", cr(c, 0), this, randint(0, 2)));
      }
      if (c !== this.bottom_entry) {
        this.append(
          new Entity("rock", cr(c, this.rows - 1), this, randint(0, 2)),
        );
      }
    }
    for (let i = 0; i < 7; i++) {
      let pos = cr(randint(1, this.columns - 2), randint(2, this.rows - 3));
      while (!this.empty(pos)) {
        pos = cr(randint(1, this.columns - 2), randint(2, this.rows - 3));
      }
      const entity = new Entity("crystal", pos, this);
      this.append(entity);
    }
    for (let i = 0; i < 2; i++) {
      let pos = cr(randint(1, this.columns - 2), randint(2, this.rows - 3));
      while (!this.empty(pos)) {
        pos = cr(randint(1, this.columns - 2), randint(2, this.rows - 3));
      }
      const entity = new Entity("skeleton", pos, this, 3);
      if (entity.cr.c > this.columns / 2) {
        entity.reversed = true;
      }
      this.append(entity);
    }
    for (let i = 0; i < 1; i++) {
      let pos = cr(randint(1, this.columns - 2), randint(2, this.rows - 3));
      while (!this.empty(pos)) {
        pos = cr(randint(1, this.columns - 2), randint(2, this.rows - 3));
      }
      const entity = new Entity("chest", pos, this);
      if (entity.cr.c > this.columns / 2) {
        entity.reversed = true;
      }
      this.append(entity);
    }
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
    this.tiles[pos.c][pos.r].entities.push(entity);
  }

  remove(pos: CR, entity: Entity) {
    const entities = this.tiles[pos.c][pos.r].entities;
    array_remove(entities, entity);
  }
}

export type GameState = "zone" | "level_up" | "loading" | "world_map";

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

export class Game {
  disabled_clicks_ms: number = 0;
  state: GameState = "zone";
  player: Player;
  current_zone: Zone;
  zones: Record<string, Zone> = {};
  choices: Choice[];
  constructor(public grid: Grid) {
    this.current_zone = new Zone(grid, this, cr(0, 0));
    this.put_zone(this.current_zone);
    this.player = new Player(cr(1, 1), this.current_zone, this);
    this.choices = [];
    this.choices.push(new Choice("Vision", "light +1", 0, grid));
    this.choices.push(new Choice("Haste", "Speed x2", 1, grid));
    this.choices.push(new Choice("Luck", "Gold +1", 2, grid));
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

    const zone = this.get_zone(zone_pos);
    if (zone === null) {
      this.current_zone = new Zone(
        this.grid,
        this,
        zone_pos,
        left_entry,
        right_entry,
        top_entry,
        bottom_entry,
      );
      this.put_zone(this.current_zone);
      this.current_zone.generate();
    } else {
      this.current_zone = zone;
    }
    this.player.zone = this.current_zone;
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
    this.disable_clicks(500);
  }

  level_up() {
    this.player.level += 1;
    this.goto_state("level_up");
    const upgrades = get_upgrade_choices(this.player);
    console.log(upgrades);
    this.choices[0].set(upgrades[0]);
    this.choices[1].set(upgrades[1]);
    this.choices[2].set(upgrades[2]);
  }

  zone_click(position: XY) {
    const pos = xy_to_cr(position, this.grid);
    if (
      this.player.target === null && pos.c === this.player.cr.c &&
      pos.r === this.player.cr.r
    ) {
      return;
    }
    const tile = this.current_zone.tiles[pos.c][pos.r];
    if (tile.light !== 5 || !tile.is_empty()) {
      return;
    }
    this.player.target = new Target(pos, this.grid);
  }

  level_up_click(position: XY) {
    for (const x of this.choices) {
      if (x.is_inside(position)) {
        console.log("Upgrade chosen: " + x.name);
        this.player.add_upgrade(get_ugrade(x.name));
        this.state = "zone";
        this.player.defog();
        return;
      }
    }
  }

  click(position: XY) {
    if (this.disabled_clicks_ms > 0) {
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
    for (const x of this.choices) {
      x.hover(position);
    }
  }

  tick(ms: number) {
    if (this.disabled_clicks_ms > 0) {
      this.disabled_clicks_ms -= ms;
      if (this.disabled_clicks_ms <= 0) {
        this.disabled_clicks_ms = 0;
      }
    }
    if (this.state === "zone" || this.state === "world_map") {
      this.player.tick(ms);
    }
  }
}
