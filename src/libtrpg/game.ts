import { XY } from "@olehermanse/utils";
import { cr_to_xy, distance_xy, Grid, WH, wh, xy_to_cr } from "../todo_utils";
import { xy } from "@olehermanse/utils/funcs.js";

export class Player {
  xy: XY;
  wh: WH;
  speed = 800.0;

  destination: XY | null;
  constructor(x: number, y: number, w: number, h: number) {
    this.xy = xy(x, y);
    this.wh = wh(w, h);
    this.destination = null;
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
      return;
    }
    const length = step / dist;
    const dx = (this.destination.x - this.xy.x) * length;
    const dy = (this.destination.y - this.xy.y) * length;
    this.xy.x += dx;
    this.xy.y += dy;
  }
}

export class Game {
  grid: Grid;
  rows: number;
  columns: number;
  player: Player;
  constructor(grid: Grid) {
    this.grid = grid;
    this.player = new Player(
      grid.width / 2,
      grid.height / 2,
      grid.cell_width,
      grid.cell_height,
    );
  }

  click(position: XY) {
    const target = cr_to_xy(xy_to_cr(position, this.grid), this.grid);
    target.x += this.grid.cell_width / 2;
    target.y += this.grid.cell_height / 2;
    this.player.destination = target;
  }

  tick(ms: number) {
    this.player.tick(ms);
  }
}
