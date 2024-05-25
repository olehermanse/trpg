import { Application } from "./application";

let application = null;

function start(canvas) {
  let scale = window.devicePixelRatio;
  let rows = 13;
  let columns = 20;
  const ctx = canvas.getContext("2d");
  application = new Application(canvas, ctx, columns, rows, 1600, 1200, scale);
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

start(document.getElementById("trpg_canvas"));
