import { Draw } from "@olehermanse/utils/draw.js";
import { Application } from "./application.ts"; // For access to width, height, game object

export class Painter {
  ctx: CanvasRenderingContext2D;
  application: Application;

  constructor(application: Application, ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.application = application;
  }

  draw() {
    const width = this.application.width;
    const height = this.application.height;
    Draw.rectangle(this.ctx, 0, 0, width, height, "black", "black");
    Draw.rectangle(this.ctx, 0, 0, 100, 100, "white", "white");
    Draw.rectangle(
      this.ctx,
      width - 100,
      height - 100,
      100,
      100,
      "white",
      "white",
    );
  }
}
