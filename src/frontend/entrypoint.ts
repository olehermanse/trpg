import { Application } from "./application.ts";

function start(canvas: HTMLCanvasElement) {
  const scale = window.devicePixelRatio;
  const columns = 16;
  const rows = 12;
  const application: Application = new Application(
    canvas,
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
