// TODO: Make utils export everything top level
import { xy } from "@olehermanse/utils/funcs.js";
import { CR, XY } from "@olehermanse/utils";

// TODO: Move these to utils package

export function cr(c: number, r: number): CR {
  return { c: c, r: r };
}

export class WH {
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}

export function wh(width: number, height: number): WH {
  return new WH(width, height);
}

export class Grid {
  width: number;
  height: number;
  columns: number;
  rows: number;
  constructor(width: number, height: number, columns: number, rows: number) {
    this.width = width;
    this.height = height;
    this.columns = columns;
    this.rows = rows;
  }

  get cell_width(): number {
    return this.width / this.columns;
  }

  get cell_height(): number {
    return this.height / this.rows;
  }
}

export function deep_copy<T>(obj: T): T {
  return structuredClone(obj);
}

export function array_remove<T>(arr: T[], obj: T) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === obj) {
      arr.splice(i, 1);
      i--;
    }
  }
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
    return offset_to_xy(this, target);
  }
}

export function oxy(ox: number, oy: number, source: HTMLCanvasElement): OXY {
  return new OXY(ox, oy, source);
}

export function offset_to_xy(offset: OXY, target: WH): XY {
  const source = offset.source;
  const x = target.width * offset.ox / source.getBoundingClientRect().width;
  const y = target.height * offset.oy / source.getBoundingClientRect().height;
  return xy(x, y);
}

export function xy_to_cr(p: XY, grid: Grid): CR {
  const col = Math.floor(grid.columns * p.x / grid.width);
  const row = Math.floor(grid.rows * p.y / grid.height);
  return cr(col, row);
}

export function cr_to_xy(p: CR, grid: Grid): XY {
  return xy(
    Math.round((0.5 + p.c) * grid.cell_width),
    Math.round((0.5 + p.r) * grid.cell_height),
  );
}

export function distance_xy(a: XY, b: XY) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function distance_cr(a: CR, b: CR) {
  return Math.sqrt((b.c - a.c) ** 2 + (b.r - a.r) ** 2);
}

export async function http_get(url: string): Promise<object> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.json();
}

export async function get_png(url: string): Promise<Blob> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "image/png",
    },
  });
  return response.blob();
}

export async function http_delete(url: string): Promise<object> {
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.json();
}

export async function http_put(url: string, data: object): Promise<object> {
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function http_post(url: string, data: object): Promise<object> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}
