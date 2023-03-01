function xy(x, y) {
  return { x: x, y: y };
}

function position(c, r) {
  return { c: c, r: r };
}

function fill_stroke(f, s) {
  return { fill: f, stroke: s };
}

function seconds(ms) {
  return ms / 1000;
}

function dps(dps, ms) {
  return dps * seconds(ms);
}

function number_string(n) {
  const num = Number(n);
  if (num < 0) {
    return "-" + number_string(-1 * num);
  }
  const s = "" + num;
  if (s.includes("e") || s.length <= 3) {
    return s;
  }

  let result = "";
  let length = 0;
  for (let c of s.split("").reverse()) {
    result += c;
    length += 1;
    if (length % 3 === 0) {
      result += " ";
    }
  }
  return result.split("").reverse().join("").trim();
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

function randint(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randint(0, i);
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

module.exports = {
  xy,
  position,
  fill_stroke,
  seconds,
  dps,
  number_string,
  distance,
  limit,
  get_rotation,
  randint,
  shuffle,
};
