const PI = 3.14159;
const LINE_RATIO = 0.1;
const SCALE = window.devicePixelRatio;

function sxy(x, y) {
  const obj : any = {};
  obj.x = x * SCALE;
  obj.y = y * SCALE;
  return obj;
}

function sxyr(x, y, r) {
  const obj : any = {};
  obj.x = x * SCALE;
  obj.y = y * SCALE;
  obj.r = r * SCALE;
  return obj;
}

function sxywh(x, y, w, h) {
  const obj : any = {};
  obj.x = x * SCALE;
  obj.y = y * SCALE;
  obj.w = w * SCALE;
  obj.h = h * SCALE;
  return obj;
}

function _setLineWidth(ctx, r, lineWidth) {
  if (lineWidth === null) {
    ctx.lineWidth = Math.round(r * LINE_RATIO);
  } else {
    ctx.lineWidth = lineWidth;
  }
}

function _line(ctx, x1, y1, x2, y2, strokeStyle, lineWidth) {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function line(ctx, x1, y1, x2, y2, strokeStyle, lineWidth) {
  const a = sxy(x1, y1);
  const b = sxy(x2, y2);
  _line(ctx, a.x, a.y, b.x, b.y, strokeStyle, lineWidth);
}

function _circle(ctx, x, y, r, fill = null, stroke = null, lineWidth = null) {
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

function circle(ctx, x, y, r, fill = null, stroke = null, lineWidth = null) {
  const c = sxyr(x, y, r);
  _circle(ctx, c.x, c.y, c.r, fill, stroke, lineWidth);
}

function _triangle(ctx, x, y, r, angle, fill, stroke = null, lineWidth = null) {
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

function triangle(ctx, x, y, r, angle, fill, stroke = null, lineWidth = null) {
  const t = sxyr(x, y, r);
  _triangle(ctx, t.x, t.y, t.r, angle, fill, stroke, lineWidth);
}

function _rectangle(
  ctx,
  x,
  y,
  w,
  h,
  fill = null,
  stroke = null,
  lineWidth = null
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
  ctx,
  x,
  y,
  w,
  h,
  fill = null,
  stroke = null,
  lineWidth = null
) {
  const r = sxywh(x, y, w, h);
  _rectangle(ctx, r.x, r.y, r.w, r.h, fill, stroke, lineWidth);
}

function _image(ctx, img, x, y, w, h) {
  ctx.drawImage(img, x, y, w, h);
}

function image(ctx, img, x, y, w, h) {
  const i = sxywh(x, y, w, h);
  _image(ctx, img, i.x, i.y, i.w, i.h);
}

function _text(ctx, x, y, string, c, size) {
  if (string.includes("\n")) {
    const strings = string.split("\n");
    for (let s of strings) {
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

function text(ctx, x, y, string, c, size) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const p = sxy(x, y);
  _text(ctx, p.x, p.y, string, c, SCALE * size);
}

function text_bottom_right(ctx, x, y, string, c, size) {
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  const p = sxy(x, y);
  _text(ctx, p.x, p.y, string, c, SCALE * size);
}

function text_top_left(ctx, x, y, string, c, size) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const p = sxy(x, y);
  _text(ctx, p.x, p.y, string, c, SCALE * size);
}

function fill_text(ctx, string, x, y, c, font, textAlign, textBaseline) {
  x = x * SCALE;
  y = y * SCALE;
  ctx.font = "" + Math.floor(SCALE * font) + "px monospace";
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
  ctx.fillStyle = c;
  ctx.fillText(string, x, y);
}

const GRID_COLOR = "rgba(200,200,200,0.5)";

function grid(ctx, size, x0, y0, width, height) {
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

function healthbar(ctx, x, y, w, h, current, max) {
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

const Draw = {
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
};

export { Draw };
