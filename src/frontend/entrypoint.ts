import { Application } from "./application.ts";

function start(canvas: HTMLCanvasElement) {
  let scale = window.devicePixelRatio;
  let columns = 16;
  let rows = 12;
  const ctx = canvas.getContext("2d");
  const application: Application = new Application(
    canvas,
    ctx,
    columns,
    rows,
    columns * 16,
    rows * 16,
    scale,
  );
  canvas.style.width = `${application.width * 4}px`;
  // canvas.style.height = `${application.height * 4}px`;
  canvas.width = columns * 16;
  canvas.height = rows * 16;
  // application.setup_events(canvas, on_start_click, on_victory);
  const ms = 10;
  window.setInterval(() => {
    application.tick(ms);
    application.draw();
  }, ms);
}

start(<HTMLCanvasElement> document.getElementById("trpg_canvas"));
