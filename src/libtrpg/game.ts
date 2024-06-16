import { CR, XY } from "@olehermanse/utils";
import {
  array_remove,
  cr,
  cr_to_xy,
  cr_to_xy_centered,
  distance_cr,
  distance_xy,
  Grid,
  WH,
  wh,
  xy_to_cr,
} from "../todo_utils";
import { randint, xy } from "@olehermanse/utils/funcs.js";

const BASE_SPEED = 16.0;

export class Entity {
  name: string;
  zone: Zone;
  xy: XY;
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
  }

  get center(): XY {
    const r = xy(this.xy.x, this.xy.y);
    r.x += this.wh.width / 2;
    r.y += this.wh.height / 2;
    return r;
  }
}

function get_neighbors(entity: Entity, zone: Zone): CR[] {
  const radius = 2.1;
  const bound = Math.floor(radius) + 1;
  const results: CR[] = [];
  const center = entity.cr;

  for (let c = center.c - bound; c <= center.c + bound; c++) {
    for (let r = center.r - bound; r <= center.r + bound; r++) {
      const pos = cr(c, r);
      if (!zone.inside(pos)) {
        continue;
      }
      const distance = distance_cr(pos, center);
      if (distance > radius) {
        continue;
      }
      results.push(pos);
    }
  }
  return results;
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

  defog() {
    const tiles = get_neighbors(this, this.zone);
    for (let tile of tiles) {
      this.zone.tiles[tile.c][tile.r].fog = false;
    }
  }

  _animate(ms: number) {
    const factor = this.speed / BASE_SPEED;
    this.walk_counter += (4 * (ms * factor)) / 1000;
    if (this.walk_counter >= 2) {
      this.walk_counter = 0;
    }
  }

  tick(ms: number) {
    if (this.destination === null) {
      return;
    }
    const step = (this.speed * ms) / 1000.0;
    const dist = distance_xy(this.xy, this.destination);
    if (isNaN(dist) || dist <= step) {
      this.xy = this.destination;
      this.destination = null;
      this.walk_counter = 0;
      return;
    }
    this._animate(ms);
    const length = step / dist;
    const dx = (this.destination.x - this.xy.x) * length;
    if (dx > 0) {
      // Moving right
      this.reversed = false;
    } else if (dx < 0) {
      // Moving left
      this.reversed = true;
    }
    const dy = (this.destination.y - this.xy.y) * length;
    this.xy.x += dx;
    this.xy.y += dy;

    const new_pos = xy_to_cr(this.xy, this.zone);
    if (new_pos.c === this.cr.c && new_pos.r === this.cr.r) {
      return;
    }
    this.cr.c = new_pos.c;
    this.cr.r = new_pos.r;
    this.defog();
  }
}

export class Tile {
  fog: boolean;
  entities: Entity[];
  constructor() {
    this.fog = true;
    this.entities = [];
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
        column.push(new Tile());
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

export class Game {
  grid: Grid;
  rows: number;
  columns: number;
  player: Player;
  current_zone: Zone;
  constructor(grid: Grid) {
    this.grid = grid;
    this.current_zone = new Zone(grid);
    this.player = new Player(cr(1, 1), this.current_zone);
  }

  click(position: XY) {
    const target = cr_to_xy_centered(xy_to_cr(position, this.grid), this.grid);
    this.player.destination = target;
  }

  tick(ms: number) {
    this.player.tick(ms);
  }
}
