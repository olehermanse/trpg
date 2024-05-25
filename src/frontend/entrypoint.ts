import { Application } from "./application.ts";

function start(canvas: HTMLCanvasElement) {
  let scale = window.devicePixelRatio;
  let columns = 24;
  let rows = 18;
  const ctx = canvas.getContext("2d");
  const application: Application = new Application(
    canvas,
    ctx,
    columns,
    rows,
    1600,
    1200,
    scale,
  );
  // canvas.style.width = `${application.width}px`;
  // canvas.style.height = `${application.height}px`;
  canvas.width = application.real_width;
  canvas.height = application.real_height;
  // application.setup_events(canvas, on_start_click, on_victory);
  const ms = 10;
  window.setInterval(() => {
    application.tick(ms);
    application.draw();
  }, ms);
}

start(<HTMLCanvasElement> document.getElementById("trpg_canvas"));
