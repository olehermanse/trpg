import { Application } from "./application.ts";

function start(canvas: HTMLCanvasElement) {
  let scale = window.devicePixelRatio;
  let columns = 12;
  let rows = 9;
  const ctx = canvas.getContext("2d");
  const application: Application = new Application(
    canvas,
    ctx,
    columns,
    rows,
    12 * 16,
    9 * 16,
    scale,
  );
  canvas.style.width = `${application.width * 4}px`;
  canvas.style.height = `${application.height * 4}px`;
  canvas.width = 12 * 16;
  canvas.height = 9 * 16;
  // application.setup_events(canvas, on_start_click, on_victory);
  const ms = 10;
  window.setInterval(() => {
    application.tick(ms);
    application.draw();
  }, ms);
}

start(<HTMLCanvasElement> document.getElementById("trpg_canvas"));
