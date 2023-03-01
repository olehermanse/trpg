const { CanvasManager } = require("./canvas_manager.js");
const { Painter } = require("./painter.js");

let canvas_manager = null;

function on_victory() {
  const ui = canvas_manager.ui;
  const game = canvas_manager.game;
  ui.refresh(game);
  ui.start_button.transition("active");
}

function on_start_click() {
  canvas_manager.game.start();
  canvas_manager.ui.start_button.transition("disabled");
}

function start(canvas) {
  let scale = window.devicePixelRatio;
  let rows = 13;
  let columns = 20;
  const ctx = canvas.getContext("2d");
  canvas_manager = new CanvasManager(canvas, ctx, columns, rows, 1200, scale);
  canvas.setAttribute("width", canvas_manager.canvas_width);
  canvas.setAttribute("height", canvas_manager.canvas_height);
  canvas_manager.setup_events(canvas, on_start_click, on_victory);
  const ms = 10;
  window.setInterval(() => {
    canvas_manager.tick(ms);
    if (canvas_manager.space_pressed) {
      canvas_manager.tick(ms);
      canvas_manager.tick(ms);
      canvas_manager.tick(ms);
      canvas_manager.tick(ms);
      canvas_manager.tick(ms);
      canvas_manager.tick(ms);
      canvas_manager.tick(ms);
    }
    canvas_manager.draw(ctx);
  }, ms);
}

module.exports = {
  start,
};
