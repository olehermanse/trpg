import { CR, XY } from "@olehermanse/utils";
import {
  array_remove,
  cr,
  cr_to_xy,
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
} from "./upgrades";

const DIAG = 1.414;
const BASE_SPEED = 16.0;

export class Entity {
  name: string;
  zone: Zone;
  xy: XY;
  fxy: XY | null;
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
  strength = 1;
  luck = 1;
  light = 1;
}

export class Player extends Entity {
  level = 1;
  stats: Stats;
  upgrades: NamedUpgrade[];
  speed = BASE_SPEED;
  walk_counter = 0;
  destination: XY | null = null;
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

  add_upgrade(upgrade: NamedUpgrade) {
    this.upgrades.push(upgrade);
    upgrade.apply(this);
    this.speed = BASE_SPEED * this.stats.speed;
  }

  defog() {
    if (this.zone.fog === 0) {
      return;
    }
    for (let tiles of this.zone.tiles) {
      for (let tile of tiles) {
        if (tile.light === 5) {
          continue;
        }

        const distance = distance_xy(tile.xy, this.xy) / 16;

        if (tile.is_empty() && distance <= 5.0) {
          tile.light = 5;
          this.zone.fog -= 1;
          if (this.zone.fog % 100 === 0) {
            this.game.level_up();
          }
          continue;
        }
        if (distance <= 2.0) {
          tile.light = 5;
          this.zone.fog -= 1;
          if (this.zone.fog % 100 === 0) {
            this.game.level_up();
          }
          continue;
        }
        if (distance <= 2.0 * DIAG) {
          tile.light = 4;
          continue;
        }
        if (distance <= 3.0) {
          tile.light = 3;
          continue;
        }
        if (distance <= 3.0 * DIAG) {
          tile.light = 2;
          continue;
        }
        if (distance <= 5.0) {
          tile.light = 1;
          continue;
        }
        if (tile.light === 1) {
          continue;
        }
        tile.light = 0;
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

  tick(ms: number) {
    if (this.destination === null) {
      return;
    }
    if (this.fxy === null) {
      this.fxy = xy(this.xy.x, this.xy.y);
    }
    const step = (this.speed * ms) / 1000.0;
    const dist = distance_xy(this.fxy, this.destination);
    if (isNaN(dist) || dist <= step) {
      this.xy.x = this.destination.x;
      this.xy.y = this.destination.y;
      this.fxy.x = this.xy.x;
      this.fxy.y = this.xy.y;
      this.destination = null;
      this.walk_counter = 0;
      return;
    }
    this._animate(ms);
    const length = step / dist;
    const dx = (this.destination.x - this.fxy.x) * length;
    if (dx > 0) {
      // Moving right
      this.reversed = false;
    } else if (dx < 0) {
      // Moving left
      this.reversed = true;
    }
    const dy = (this.destination.y - this.fxy.y) * length;
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

export class Tile {
  light: number;
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
    return (this.entities.length === 0);
  }
}

export class Zone extends Grid {
  tiles: Tile[][];
  fog: number;
  constructor(grid: Grid) {
    super(grid.width, grid.height, grid.columns, grid.rows);
    this.fog = grid.columns * grid.rows;
    this.tiles = [];
    for (let c = 0; c < grid.columns; c++) {
      const column = [];
      for (let r = 0; r < grid.rows; r++) {
        column.push(new Tile(cr(c, r)));
      }
      this.tiles.push(column);
    }
  }

  generate() {
    for (let r = 0; r < this.rows; r++) {
      this.append(new Entity("rock", cr(0, r), this, randint(0, 2)));
      this.append(
        new Entity("rock", cr(this.columns - 1, r), this, randint(0, 2)),
      );
    }
    for (let c = 1; c < this.columns - 1; c++) {
      this.append(new Entity("rock", cr(c, 0), this, randint(0, 2)));
      this.append(
        new Entity("rock", cr(c, this.rows - 1), this, randint(0, 2)),
      );
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
        for (let entity of this.get_entities(cr(c, r))) {
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
    let entities = this.tiles[pos.c][pos.r].entities;
    array_remove(entities, entity);
  }
}

export type GameState = "zone" | "levelup" | "loading";

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
    let y = window.height / 2 - card_height / 2;
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
  grid: Grid;
  player: Player;
  current_zone: Zone;
  state: GameState;
  choices: Choice[];
  constructor(grid: Grid) {
    this.grid = grid;
    this.current_zone = new Zone(grid);
    this.player = new Player(cr(1, 1), this.current_zone, this);
    this.choices = [];
    this.choices.push(new Choice("Physique", "Damage +100", 0, grid));
    this.choices.push(new Choice("Haste", "Speed x2", 1, grid));
    this.choices.push(new Choice("Luck", "Gold +1", 2, grid));
    this.state = "zone";
  }

  level_up() {
    this.player.level += 1;
    this.state = "levelup";
    const upgrades = get_upgrade_choices(this.player);
    console.log(upgrades);
    this.choices[0].set(upgrades[0]);
    this.choices[1].set(upgrades[1]);
    this.choices[2].set(upgrades[2]);
  }

  zone_click(position: XY) {
    const pos = xy_to_cr(position, this.grid);
    const tile = this.current_zone.tiles[pos.c][pos.r];
    if (tile.light !== 5 || !tile.is_empty()) {
      return;
    }
    const target = cr_to_xy(pos, this.grid);
    this.player.destination = target;
  }

  level_up_click(position: XY) {
    for (let x of this.choices) {
      if (x.is_inside(position)) {
        console.log("Upgrade chosen: " + x.name);
        this.player.add_upgrade(get_ugrade(x.name));
        this.state = "zone";
        return;
      }
    }
  }

  click(position: XY) {
    if (this.state === "zone") {
      return this.zone_click(position);
    }
    if (this.state === "levelup") {
      return this.level_up_click(position);
    }
  }

  hover(position: XY) {
    for (let x of this.choices) {
      x.hover(position);
    }
  }

  tick(ms: number) {
    if (this.state !== "zone") {
      return;
    }
    this.player.tick(ms);
  }
}
