function xy(x, y) {
  return { "x": x, "y": y };
}

function position(c, r) {
  return { "c": c, "r": r };
}

function fill_stroke(f, s) {
  return { "fill": f, "stroke": s };
}

function seconds(ms) {
  return (ms / 1000);
}

function dps(dps, ms) {
  return dps * seconds(ms);
}

function distance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.c - b.c) ** 2);
}

function limit(min, x, max) {
  if (x < min) {
    return min;
  }
  if (x > max) {
    return max;
  }
  return x;
}

function get_rotation(a, b) {
  const rot = Math.atan2(a.r - b.r, b.c - a.c);
  if (rot > 0.0) {
    return rot;
  }
  return rot + 2 * Math.PI;
}

module.exports = {
  xy,
  position,
  fill_stroke,
  seconds,
  dps,
  distance,
  limit,
  get_rotation,
};
