import { XY } from "@olehermanse/utils";
import { Grid, WH, wh } from "../todo_utils";
import { xy } from "@olehermanse/utils/funcs.js";

export class Player {
  xy: XY;
  wh: WH;
  constructor(x: number, y: number, w: number, h: number) {
    this.xy = xy(x, y);
    this.wh = wh(w, h);
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
    this.player.xy = position;
  }
}
