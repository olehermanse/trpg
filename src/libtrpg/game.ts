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

export class Player extends Entity {
  speed = BASE_SPEED;
  reversed = false;
  walk_counter = 0;
  destination: XY | null = null;

  constructor(pos: CR, zone: Zone) {
    super("player", pos, zone);
    this.defog();
  }

  get center() {
    return xy(this.xy.x + this.wh.width / 2, this.xy.y + this.wh.height / 2);
  }

  defog() {
    for (let tiles of this.zone.tiles) {
      for (let tile of tiles) {
        if (tile.light === 5) {
          continue;
        }

        const distance = distance_xy(tile.xy, this.xy) / 16;

        if (tile.is_empty() && distance <= 5.0) {
          tile.light = 5;
          continue;
        }
        if (distance <= 2.0) {
          tile.light = 5;
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
  constructor(grid: Grid) {
    super(grid.width, grid.height, grid.columns, grid.rows);
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
      let pos = cr(randint(1, this.columns - 2), randint(1, this.rows - 2));
      while (!this.empty(pos)) {
        pos = cr(randint(1, this.columns - 2), randint(1, this.rows - 2));
      }
      const entity = new Entity("rock", pos, this);
      this.append(entity);
    }
    for (let i = 0; i < 2; i++) {
      let pos = cr(randint(1, this.columns - 2), randint(1, this.rows - 2));
      while (!this.empty(pos)) {
        pos = cr(randint(1, this.columns - 2), randint(1, this.rows - 2));
      }
      const entity = new Entity("skeleton", pos, this, 3);
      this.append(entity);
    }
    for (let i = 0; i < 1; i++) {
      let pos = cr(randint(1, this.columns - 2), randint(1, this.rows - 2));
      while (!this.empty(pos)) {
        pos = cr(randint(1, this.columns - 2), randint(1, this.rows - 2));
      }
      const entity = new Entity("chest", pos, this);
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

  constructor(
    public title: string,
    public description: string,
    index: number,
    window: WH,
  ) {
    const card_width = Math.floor(window.width / 3) - 10;
    const card_height = Math.floor(window.height / 2);
    let y = window.height / 2 - card_height / 2;
    this.pos = xy(5 + index * (card_width + 10), y);
    this.size = wh(card_width, card_height);
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
    this.player = new Player(cr(1, 1), this.current_zone);
    this.choices = [];
    this.choices.push(new Choice("Attack", "Damage +100", 0, grid));
    this.choices.push(new Choice("Haste", "Speed x2", 1, grid));
    this.choices.push(new Choice("Luck", "Gold +1", 2, grid));
    this.state = "zone";
  }

  click(position: XY) {
    const pos = xy_to_cr(position, this.grid);
    const tile = this.current_zone.tiles[pos.c][pos.r];
    if (tile.light !== 5 || !tile.is_empty()) {
      return;
    }
    const target = cr_to_xy(pos, this.grid);
    this.player.destination = target;
  }

  tick(ms: number) {
    this.player.tick(ms);
  }
}
