// TODO: Make utils export everything top level
import { xy } from "@olehermanse/utils/funcs.js";
import { CR, XY } from "@olehermanse/utils";

// TODO: Move these to utils package

export function cr(c, r): CR {
  return { c: c, r: r };
}

export class WH {
  width: number;
  height: number;
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
}

export class Grid {
  width: number;
  height: number;
  columns: number;
  rows: number;
  constructor(width, height, columns, rows) {
    this.width = width;
    this.height = height;
    this.columns = columns;
    this.rows = rows;
  }
}

export function wh(width: number, height: number): WH {
  return new WH(width, height);
}

export class OXY {
  // An x, y screen space pixel offset,
  // which forces you to convert it to canvas coordinates
  ox: number;
  oy: number;
  source: HTMLCanvasElement;
  constructor(ox: number, oy: number, source: HTMLCanvasElement) {
    this.ox = ox;
    this.oy = oy;
    this.source = source;
  }

  to_xy(target: WH): XY {
    return offset_to_canvas(this, target);
  }
}

export function oxy(ox: numberm, oy: number, source: HTMLCanvasElement): OXY {
  return new OXY(ox, oy, source);
}

export function offset_to_canvas(p: OXY, target: WH): XY {
  const source = p.source;
  const x = (p.ox / source.getBoundingClientRect().width) * target.width;
  const y = (p.oy / source.getBoundingClientRect().height) * target.height;
  return xy(x, y);
}

export function canvas_to_grid(p: XY, grid: Grid): CR {
  const cell_w = grid.width / grid.columns;
  const cell_h = grid.height / grid.rows;
  const col = Math.floor(cell_w * p.x / grid.width);
  const row = Math.floor(cell_h * p.y / grid.height);
  return cr(col, row);
}
