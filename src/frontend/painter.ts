import { Draw } from "@olehermanse/utils/draw.js";
import { Application } from "./application.ts"; // For access to width, height, game object
import { Player } from "../libtrpg/game.ts";

export class Painter {
  ctx: CanvasRenderingContext2D;
  application: Application;

  constructor(application: Application, ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.application = application;
  }

  draw_player() {
    const player: Player = this.application.game.player;
    const x = player.xy.x;
    const y = player.xy.y;
    const width = player.wh.width;
    const height = player.wh.height;
    Draw.rectangle(
      this.ctx,
      x - width / 2,
      y - height / 2,
      width,
      height,
      "white",
      "white",
    );
  }

  draw() {
    const width = this.application.width;
    const height = this.application.height;
    Draw.rectangle(this.ctx, 0, 0, width, height, "black", "black");
    this.draw_player();
  }
}
