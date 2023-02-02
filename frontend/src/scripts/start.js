const { CanvasManager } = require("./canvas_manager.js");
const { Painter } = require("./painter.js");

let canvas_manager = null;

function on_victory() {
    const ui = canvas_manager.ui;
    const game = canvas_manager.game;
    ui.start_button.transition("active");
    switch (game.level) {
        case 2:
            ui.tower_buttons[0].show();
            break;
        case 5:
            ui.tower_buttons[2].show();
            break;
        case 11:
            ui.tower_buttons[3].show();
            ui.tower_buttons[4].show();
            break;
        default:
            break;
    }
}

function on_start_click() {
    canvas_manager.game.start();
    canvas_manager.ui.start_button.transition("disabled");
}

function select(btn) {
    canvas_manager.ui.selected = btn;
    if (btn.state != "selected") {
        btn.transition("selected");
    }
    for (let button of canvas_manager.ui.tower_buttons) {
        if (button != btn && button.state === "selected") {
            button.transition("active");
        }
    }
}

function add_legend_icon(scale, id, func) {
    const element = document.getElementById(id);
    element.setAttribute("width", scale * 50);
    element.setAttribute("height", scale * 50);
    const context = element.getContext("2d");
    const tower = {};
    tower.x = scale * 25;
    tower.y = scale * 25;
    tower.w = scale * 50;
    tower.rotation = Math.PI / 2;
    tower.level = 1;
    func(context, tower, null);
}

function start(canvas) {
    let scale = window.devicePixelRatio;
    let rows = 13;
    let columns = 20;
    if (window.matchMedia("screen and (orientation:portrait), (max-width: 600px)").matches) {
        rows = 14;
        columns = 12;
        if (scale > 2.0) {
            scale = 2.0;
        }
    }
    const ctx = canvas.getContext("2d");
    canvas_manager = new CanvasManager(canvas, ctx, columns, rows, 1200, scale);
    canvas.setAttribute("width", canvas_manager.canvas_width);
    canvas.setAttribute("height", canvas_manager.canvas_height);
    let draw_function = Painter.draw_building;
    canvas_manager.setup_events(canvas, select, draw_function, on_start_click, on_victory);
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
    add_legend_icon(scale, "rock_icon", Painter.draw_rock);
    add_legend_icon(scale, "gun_tower_icon", Painter.draw_gun_tower);
    add_legend_icon(scale, "slow_tower_icon", Painter.draw_slow_tower);
    add_legend_icon(scale, "laser_tower_icon", Painter.draw_laser_tower);
    add_legend_icon(scale, "bank_icon", Painter.draw_bank);
}

module.exports = {
    start,
};
