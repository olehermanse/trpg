import type { XY, CR, FillStroke } from "../libtowers/interfaces";

function xy(x: number, y: number): XY {
  return { x: x, y: y };
}

function position(c: number, r: number): CR {
  return { c: c, r: r };
}

function fill_stroke(f: string, s: string): FillStroke {
  return { fill: f, stroke: s };
}

function seconds(ms: number): number {
  return ms / 1000;
}

function dps(dps: number, ms: number): number {
  return dps * seconds(ms);
}

function number_string(n: number | string): string {
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

function distance(a: CR, b: CR): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.c - b.c) ** 2);
}

function limit(min: number, x: number, max: number): number {
  if (x < min) {
    return min;
  }
  if (x > max) {
    return max;
  }
  return x;
}

function get_rotation(a: CR, b: CR): number {
  const rot = Math.atan2(a.r - b.r, b.c - a.c);
  if (rot > 0.0) {
    return rot;
  }
  return rot + 2 * Math.PI;
}

function randint(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function shuffle(array: any[]): any[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randint(0, i);
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

class TextWrapper {
  original: string;
  remaining: string;
  word: string;
  words: string[];
  lines: string[];
  line_length: number;
  fragment_length: number;

  constructor(text, line_length) {
    this.original = text;
    this.remaining = text.trim().replace("  ", " ");
    this.word = "";
    this.words = [];
    this.lines = [];
    this.line_length = line_length;
    this.fragment_length = line_length - 1;
  }

  push_line() {
    if (this.words.length > 0) {
      this.lines.push(this.words.join(" "));
      this.words = [];
    }
  }

  line_overflow(): boolean {
    const line = this.words.join(" ") + " " + this.word;
    return line.length > this.line_length;
  }

  push_word() {
    if (this.word === "") {
      return;
    }
    if (this.word.length > this.line_length) {
      this.fragment_word();
      return;
    }
    if (this.line_overflow()) {
      this.push_line();
    }
    this.words.push(this.word);
    this.word = "";
  }

  get_fragments(word: string): string[] {
    let fragments = [];
    if (word.includes("-")) {
      for (let fragment of word.split("-")) {
        if (fragment.length > this.fragment_length) {
          fragments.push(...this.get_fragments(fragment));
        } else {
          fragments.push(fragment);
        }
      }
      return fragments;
    }
    while (word.length > 0) {
      let fragment = word.slice(0, this.fragment_length);
      fragments.push(fragment);
      word = word.slice(this.fragment_length);
    }
    return fragments;
  }

  fragment_word() {
    const fragments = this.get_fragments(this.word).join("-\n").split("\n");
    for (let fragment of fragments) {
      this.word = fragment;
      this.push_word();
    }
    // By this point, we have pushed 2 or more words,
    // and this.word is empty
  }

  main_loop() {
    for (let c of this.remaining) {
      if (c === " ") {
        this.push_word();
      } else {
        this.word = this.word + c;
      }
    }
    this.push_word();
    this.push_line();
  }

  run(): string {
    if (this.original === "" || this.original.includes("\n")) {
      return this.original;
    }
    if (this.remaining === "") {
      return "";
    }
    this.main_loop();
    return this.lines.join("\n");
  }
}

function text_wrap(text: any, line_length: any): string {
  let tw = new TextWrapper(text, line_length);
  return tw.run();
}

export {
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
  text_wrap,
};
