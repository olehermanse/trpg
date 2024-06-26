import { WH, xy } from "@olehermanse/utils/funcs.js";
import { XY } from "@olehermanse/utils";

function SCALE() {
  // This should be a constant, but I want this file to be importable by deno,
  // so not using a global variable for this.
  return window.devicePixelRatio;
}

type Canvas = HTMLCanvasElement | OffscreenCanvas;
type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/*
function _set_pixel(img: ImageData, x: number, y: number, r: number, g: number, b: number, a: number){
  const i = (x + y*img.width) * 4;
  img.data[i] = r;
  img.data[i+1] = g;
  img.data[i+2] = b;
  img.data[i+3] = a;
}
*/
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
  clear() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const rect = this.ctx.createImageData(width, height);
    // Each pixel is 4 8 bit int (RGBA)
    // Defaults to all zeroes (all black and transparent)
    // Loop through all pixels, removing the transparency:
    for (let i = 0; i < width * height; i++) {
      rect.data[3 + i * 4] = 255; // Set alpha to 100%, not transparent
      // Leave other pixels alone, they are black.
    }
    this.ctx.putImageData(rect, 0, 0);
  }
  text(message: string, font: Record<string, ImageBitmap>, pos: XY) {
    let x = pos.x;
    let y = pos.y;
    for (let i = 0; i < message.length; ++i) {
      let letter = message[i];
      if (letter === " ") {
        x += 6;
        continue;
      }
      if (letter === "\n") {
        x = 5;
        y += 16;
        continue;
      }
      if (font[letter] === undefined) {
        letter = ".";
      }
      this.sprite(font[letter], xy(x, y));
      x += 6;
    }
  }
  rectangle(
    pos: XY,
    size: WH,
  ) {
    let x = pos.x;
    let y = pos.y;
    let width = size.width;
    let height = size.height;
    if (this.autoscale) {
      x = x * SCALE();
      y = y * SCALE();
      width = width * SCALE();
      height = height * SCALE();
    }
    const left = this.ctx.createImageData(1, height);
    const right = this.ctx.createImageData(1, height);
    const top = this.ctx.createImageData(width, 1);
    const bottom = this.ctx.createImageData(width, 1);
    for (let i = 0; i < width; i++) {
      top.data[i * 4 + 0] = 255;
      top.data[i * 4 + 1] = 255;
      top.data[i * 4 + 2] = 255;
      top.data[i * 4 + 3] = 255;
      bottom.data[i * 4 + 0] = 255;
      bottom.data[i * 4 + 1] = 255;
      bottom.data[i * 4 + 2] = 255;
      bottom.data[i * 4 + 3] = 255;
    }
    for (let i = 0; i < height; i++) {
      left.data[i * 4 + 0] = 255;
      left.data[i * 4 + 1] = 255;
      left.data[i * 4 + 2] = 255;
      left.data[i * 4 + 3] = 255;
      right.data[i * 4 + 0] = 255;
      right.data[i * 4 + 1] = 255;
      right.data[i * 4 + 2] = 255;
      right.data[i * 4 + 3] = 255;
    }
    this.ctx.putImageData(top, x, y);
    this.ctx.putImageData(left, x, y);
    this.ctx.putImageData(right, x + width - 1, y);
    this.ctx.putImageData(bottom, x, y + height - 1);
  }
}
