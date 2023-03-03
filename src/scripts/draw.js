const PI = 3.14159;
const GRID_COLOR = "rgba(200,200,200,0.5)";
const LINE_RATIO = 0.1;

function setLineWidth(ctx, r, lineWidth) {
  if (lineWidth === null) {
    ctx.lineWidth = Math.round(r * LINE_RATIO);
  } else {
    ctx.lineWidth = lineWidth;
  }
}

function line(ctx, x1, y1, x2, y2, strokeStyle, lineWidth) {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function circle(ctx, x, y, r, fill = null, stroke = null, lineWidth = null) {
  setLineWidth(ctx, r, lineWidth);
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

function triangle(ctx, x, y, r, angle, fill, stroke = null, lineWidth = null) {
  setLineWidth(ctx, r, lineWidth);
  const height = r * 2;
  const side = height * (2 / Math.sqrt(3));

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
  setLineWidth(ctx, w / 2, lineWidth);

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.strokeRect(x, y, w, h);
  }
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
  ctx.lineWidth = 2;
  ctx.strokeText(string, x, y);
  ctx.fillText(string, x, y);
}

function text(ctx, x, y, string, c, size) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  _text(ctx, x, y, string, c, size);
}

function text_bottom_right(ctx, x, y, string, c, size) {
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  _text(ctx, x, y, string, c, size);
}

function text_top_left(ctx, x, y, string, c, size) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  _text(ctx, x, y, string, c, size);
}

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
  triangle,
  rectangle,
  line,
  text,
  text_bottom_right,
  text_top_left,
  grid,
  healthbar
};

export {Draw}
