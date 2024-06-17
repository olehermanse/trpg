import { WH } from "@olehermanse/utils/funcs.js";
import { XY } from "@olehermanse/utils";

const LINE_RATIO = 0.1;

function SCALE() {
  // This should be a constant, but I want this file to be importable by deno,
  // so not using a global variable for this.
  return window.devicePixelRatio;
}

type Canvas = HTMLCanvasElement | OffscreenCanvas;
type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function _set_line_width(
  ctx: Context,
  r: number,
  lineWidth?: number | null,
) {
  if (lineWidth === null || lineWidth === undefined) {
    ctx.lineWidth = Math.round(r * LINE_RATIO);
  } else {
    ctx.lineWidth = lineWidth;
  }
}

function _rectangle(
  ctx: Context,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string | null,
  stroke?: string | null,
  lineWidth?: number,
) {
  _set_line_width(ctx, w / 2, lineWidth);

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.strokeRect(x, y, w, h);
  }
}

export class Drawer<T extends Canvas> {
  ctx: Context;
  canvas: T;
  autoscale: boolean;
  constructor(canvas: T, autoscale?: boolean) {
    this.canvas = canvas;
    this.ctx = <Context> canvas.getContext("2d");
    this.autoscale = true;
    if (autoscale === false) {
      this.autoscale = false;
    }
  }
  sprite(sprite: ImageBitmap, pos: XY, reversed?: boolean) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    if (reversed) {
      ctx.scale(-1, 1);
      ctx.translate(-16, 0);
    }
    ctx.drawImage(sprite, 0, 0);
    ctx.restore();
  }
  rectangle(
    pos: XY,
    size: WH,
    fill: string | null,
    stroke?: string,
    lineWidth?: number,
  ) {
    if (this.autoscale) {
      return _rectangle(
        this.ctx,
        SCALE() * pos.x,
        SCALE() * pos.y,
        SCALE() * size.width,
        SCALE() * size.height,
        fill,
        stroke,
        lineWidth ? SCALE() * lineWidth : undefined,
      );
    }
    return _rectangle(
      this.ctx,
      pos.x,
      pos.y,
      size.width,
      size.height,
      fill,
      stroke,
      lineWidth,
    );
  }
}
