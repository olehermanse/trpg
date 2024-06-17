const PI = 3.14159;
const LINE_RATIO = 0.1;
let custom_scale: number | undefined = undefined;

function set_custom_scale(s: number){
    custom_scale = s;
}
function SCALE() {
    if (custom_scale !== undefined) {
        return custom_scale;
    }
    // This should be a constant, but I want this file to be importable by deno,
    // so not using a global variable for this.
    return window.devicePixelRatio;
}

import type { XY, XYR, XYWH } from "./interfaces.js";

function sxy(x: number, y: number): XY {
  const obj: XY = {
    x: x * SCALE(),
    y: y * SCALE(),
  };
  return obj;
}

function sxyr(x: number, y: number, r: number): XYR {
  const obj: XYR = {
    x: x * SCALE(),
    y: y * SCALE(),
    r: r * SCALE(),
  };
  return obj;
}

function sxywh(x: number, y: number, w: number, h: number): XYWH {
  const obj: XYWH = {
    x: x * SCALE(),
    y: y * SCALE(),
    w: w * SCALE(),
    h: h * SCALE(),
  };
  return obj;
}

function _setLineWidth(
  ctx: CanvasRenderingContext2D,
  r: number,
  lineWidth: number | null,
) {
  if (lineWidth === null) {
    ctx.lineWidth = Math.round(r * LINE_RATIO);
  } else {
    ctx.lineWidth = lineWidth;
  }
}

function _line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeStyle: string,
  lineWidth: number,
) {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeStyle: string,
  lineWidth: number,
) {
  const a = sxy(x1, y1);
  const b = sxy(x2, y2);
  _line(ctx, a.x, a.y, b.x, b.y, strokeStyle, lineWidth);
}

function _circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string | null = null,
  stroke: string | null = null,
  lineWidth: number | null = null,
) {
  _setLineWidth(ctx, r, lineWidth);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * PI);
  if (fill != null) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke != null) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string | null = null,
  stroke: string | null = null,
  lineWidth: number | null = null,
) {
  const c = sxyr(x, y, r);
  _circle(ctx, c.x, c.y, c.r, fill, stroke, lineWidth);
}

function _triangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  angle: number,
  fill: string,
  stroke: string | null = null,
  lineWidth: number | null = null,
) {
  _setLineWidth(ctx, r, lineWidth);

  // Matrix transformation
  ctx.translate(x, y);
  ctx.rotate(-angle);
  ctx.translate(-x, -y);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x - r * (1 / 2), y - r * (Math.sqrt(3) / 2));
  ctx.lineTo(x - r * (1 / 2), y + r * (Math.sqrt(3) / 2));
  ctx.lineTo(x + r, y);

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function triangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  angle: number,
  fill: string,
  stroke: string | null = null,
  lineWidth: number | null = null,
) {
  const t = sxyr(x, y, r);
  _triangle(ctx, t.x, t.y, t.r, angle, fill, stroke, lineWidth);
}

function _rectangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string | null = null,
  stroke: string | null = null,
  lineWidth: number | null = null,
) {
  _setLineWidth(ctx, w / 2, lineWidth);

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.strokeRect(x, y, w, h);
  }
}

function rectangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string | null = null,
  stroke: string | null = null,
  lineWidth: number | null = null,
) {
  const r = sxywh(x, y, w, h);
  _rectangle(ctx, r.x, r.y, r.w, r.h, fill, stroke, lineWidth);
}

function _image(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.drawImage(img, x, y, w, h);
}

function image(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const i = sxywh(x, y, w, h);
  _image(ctx, img, i.x, i.y, i.w, i.h);
}

function _text(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  string: string,
  c: string,
  size: number,
) {
  if (string.includes("\n")) {
    const strings = string.split("\n");
    for (const s of strings) {
      _text(ctx, x, y, s, c, size);
      y += size * 1.2;
    }
    return;
  }
  ctx.font = Math.floor(size) + "px monospace";
  ctx.fillStyle = c;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.strokeText(string, x, y);
  ctx.fillText(string, x, y);
}

function text(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  string: string,
  c: string,
  size: number,
) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const p = sxy(x, y);
  _text(ctx, p.x, p.y, string, c, SCALE() * size);
}

function text_bottom_right(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  string: string,
  c: string,
  size: number,
) {
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  const p = sxy(x, y);
  _text(ctx, p.x, p.y, string, c, SCALE() * size);
}

function text_top_left(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  string: string,
  c: string,
  size: number,
) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const p = sxy(x, y);
  _text(ctx, p.x, p.y, string, c, SCALE() * size);
}

function fill_text(
  ctx: CanvasRenderingContext2D,
  string: string,
  x: number,
  y: number,
  c: string,
  font: number,
  textAlign: string,
  textBaseline: string,
) {
  x = x * SCALE();
  y = y * SCALE();
  ctx.font = "" + Math.floor(SCALE() * font).toString() + "px monospace";
  ctx.textAlign = textAlign as CanvasTextAlign;
  ctx.textBaseline = textBaseline as CanvasTextBaseline;
  ctx.fillStyle = c;
  ctx.fillText(string, x, y);
}

const GRID_COLOR = "rgba(200,200,200,0.5)";

function grid(
  ctx: CanvasRenderingContext2D,
  size: number,
  x0: number,
  y0: number,
  width: number,
  height: number,
) {
  for (let x = size; x < width; x += size) {
    line(ctx, x, y0, x, y0 + height, GRID_COLOR, size / 25);
  }
  for (let y = size; y < height; y += size) {
    line(ctx, x0, y, x0 + width, y, GRID_COLOR, size / 25);
  }
}

const green = "#00ff00";
const yellow = "#ffff00";
const orange = "#ff8800";
const red = "#ff0000";
const white = "#ffffff";
const grey = "#666666";

function healthbar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  current: number,
  max: number,
) {
  const ratio = current / max;
  x -= w / 2;
  y -= h / 2;
  rectangle(ctx, x, y, w, h, white, grey);
  let color = null;
  if (ratio > 0.8) {
    color = green;
  } else if (ratio >= 0.5) {
    color = yellow;
  } else if (ratio >= 0.33) {
    color = orange;
  } else {
    color = red;
  }
  rectangle(ctx, x, y, w * ratio, h, color, null);
}

export const Draw = {
  circle,
  image,
  fill_text,
  triangle,
  rectangle,
  line,
  text,
  text_bottom_right,
  text_top_left,
  grid,
  healthbar,
  set_custom_scale,
};
