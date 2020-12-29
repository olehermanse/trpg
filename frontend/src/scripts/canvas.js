const { Game, Tower } = require("../../../libtowers/libtowers.js");
const { xy, fill_stroke, number_string } = require("../../../libtowers/utils.js");
const Draw = require("./draw.js");
const { UI } = require("./ui.js");

const FG = "rgb(256,256,256)";
const BG = "rgb(16,16,16)";
const black = BG;
const green = "rgb(0,255,0)";
const bright_blue = "#a9d1fa";
const dark_blue = "#330bd8";
const grey = "rgb(200,200,200)";
const bright_purple = "rgb(255,0,255)";
const dark_purple = "rgb(128,0,128)";

let canvas_manager = null;

function draw_tower_generic(ctx, x, y, s, rotation, circle, triangle) {
    const r = (s / 2) * 0.7;
    if (circle != null) {
        Draw.circle(ctx, x, y, r, circle.fill, circle.stroke, 4);
    }
    if (triangle != null) {
        Draw.triangle(ctx, x, y, r, rotation, triangle.fill, triangle.stroke);
    }
}

function draw_rock(ctx, t, target = null) {
    const circle = fill_stroke(grey, black);
    draw_tower_generic(ctx, t.x, t.y, t.w, t.rotation, circle, null);
}

function draw_gun_tower(ctx, t, target = null) {
    const circle = fill_stroke(grey, black);
    const triangle = fill_stroke(green, black);
    if (target != null) {
        const stroke = green;
        Draw.line(ctx, t.x, t.y, target.x, target.y, stroke, 5 * t.intensity);
    }
    draw_tower_generic(ctx, t.x, t.y, t.w, t.rotation, circle, triangle);
}

function draw_slow_tower(ctx, t, target = null) {
    const circle = fill_stroke(grey, black);
    const triangle = fill_stroke(bright_blue, dark_blue);
    if (target != null) {
        const stroke = bright_blue;
        Draw.line(ctx, t.x, t.y, target.x, target.y, stroke, 5 * t.intensity);
    }
    draw_tower_generic(ctx, t.x, t.y, t.w, t.rotation, circle, triangle);
}

function draw_laser_tower(ctx, t, target = null) {
    const circle = fill_stroke(grey, black);
    const triangle = fill_stroke(bright_purple, dark_purple);
    if (target != null) {
        const stroke = bright_purple;
        Draw.line(ctx, t.x, t.y, target.x, target.y, stroke, 5 * t.intensity);
    }
    draw_tower_generic(ctx, t.x, t.y, t.w, t.rotation, circle, triangle);
}

function draw_bank(ctx, t, target = null) {
    const s = (t.w / 2) * 0.5;
    Draw.rectangle(ctx, t.x - s, t.y - s, 2 * s, 2 * s, "yellow", black, 4);
}

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
        case 8:
            ui.tower_buttons[3].show();
            break;
        case 11:
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

class CanvasManager {
    constructor(columns=20, rows=13, width=1200) {
        this.columns = columns;
        this.rows = rows;
        this.width = width;

        this.canvas_width = width;
        this.grid_width = width;

        this.grid_size = this.grid_width / this.columns;
        this.grid_start = this.grid_size;

        this.grid_height = this.rows * this.grid_size;
        this.grid_end = this.grid_start + this.grid_height;
        this.canvas_height = this.grid_end + this.grid_size;

        this.game = new Game(this.columns, this.rows);
        const UI_X = 0;
        const UI_Y = this.grid_end - this.grid_size;
        const UI_W = this.width;
        const UI_H = this.grid_size * 2;
        const UI_C = FG;
        this.ui = new UI(UI_X, UI_Y, UI_W, UI_H, BG, UI_C, this.grid_size);
        this.space_pressed = false;
        this.preview = null;
    }

    canvas_to_grid_int(p, offset = 0) {
        return Math.floor((p - offset) / this.grid_size);
    }

    grid_to_canvas(p, offset=0) {
        if (p === null) {
            return p;
        }
        if (isNaN(p)) {
            return xy(this.grid_to_canvas(p.c), this.grid_to_canvas(p.r, this.grid_start));
        }
        return (offset + p * this.grid_size + this.grid_size / 2);
    }

    offset_to_canvas(p, canvas) {
        return (p / canvas.getBoundingClientRect().width) * this.width;
    }

    draw_tower(ctx, tower) {
        const t = this.grid_to_canvas(tower);
        t.w = this.grid_size;
        t.rotation = tower.rotation;
        t.intensity = tower.intensity;
        const target = this.grid_to_canvas(tower.target);
        tower.draw(ctx, t, target);
    }

    draw_towers(ctx) {
        for (let tower of this.game.towers) {
            this.draw_tower(ctx, tower);
        }
    }

    draw_wall(ctx, c, r) {
        Draw.rectangle(ctx, c * this.grid_size, this.grid_start + r * this.grid_size, this.grid_size, this.grid_size, BG);
    }

    draw_path(ctx, c, r) {
        const color = "rgba(200,200,200,0.5)";
        Draw.rectangle(ctx, c * this.grid_size, this.grid_start + r * this.grid_size, this.grid_size, this.grid_size, color);
    }

    draw_spawn(ctx, c, r) {
        const color = "rgba(0,128,0,1)";
        Draw.rectangle(ctx, c * this.grid_size, this.grid_start + r * this.grid_size, this.grid_size, this.grid_size, color);
    }

    draw_goal(ctx, c, r) {
        const color = "rgba(200,200,0,1)";
        Draw.rectangle(ctx, c * this.grid_size, this.grid_start + r * this.grid_size, this.grid_size, this.grid_size, color);
    }

    draw_tile(ctx, c, r) {
        const tile = this.game.tiles[c][r];
        if (tile === "wall") {
            this.draw_wall(ctx, c, r)
        } else if (tile === "path") {
            this.draw_path(ctx, c, r);
        } else if (tile === "spawn") {
            this.draw_spawn(ctx, c, r);
        } else if (tile === "goal") {
            this.draw_goal(ctx, c, r);
        }
    }

    draw_tiles(ctx) {
        for (let c = 0; c < this.columns; ++c) {
            for (let r = 0; r < this.rows; ++r) {
                this.draw_tile(ctx, c, r);
            }
        }
    }

    draw_enemy(ctx, enemy) {
        const pos = this.grid_to_canvas(enemy);
        const r = (this.grid_size / 2) * 0.7;
        const angle = enemy.rotation;
        Draw.triangle(ctx, pos.x, pos.y, r, angle, enemy.color, "#000000");
        if (enemy.health < enemy.max_health) {
            Draw.healthbar(ctx, pos.x, pos.y - this.grid_size / 2, this.grid_size * 0.75, this.grid_size / 10, enemy.health, enemy.max_health);
        }
    }

    draw_enemies(ctx) {
        for (let enemy of this.game.enemies) {
            this.draw_enemy(ctx, enemy);
        }
    }

    draw_preview(ctx) {
        if (this.preview === null) {
            return;
        }
        ctx.globalAlpha = 0.3;
        let pos = this.grid_to_canvas(this.preview);
        let r = this.grid_size * this.preview.range;
        Draw.circle(ctx, pos.x, pos.y, r, null, "black");
        this.draw_tower(ctx, this.preview);
        ctx.globalAlpha = 1.0;
    }

    draw(ctx) {
        // Background:
        Draw.rectangle(ctx, 0, 0, this.canvas_width, this.canvas_height, BG);

        if (this.game.lives <= 0) {
            Draw.text(ctx, this.canvas_width / 2, this.canvas_height / 2, "Game over", FG, this.canvas_height / 5);
            return;
        }

        // Grid:
        Draw.rectangle(ctx, 0, this.grid_start, this.grid_width, this.grid_height, FG);
        Draw.grid(ctx, this.grid_size, 0, this.grid_start, this.width, this.grid_height);
        // Game elements:
        this.draw_tiles(ctx);
        this.draw_towers(ctx);
        this.draw_enemies(ctx);
        // UI:
        this.draw_preview(ctx);
        Draw.rectangle(ctx, 0, 0, this.width, this.grid_start, BG);
        this.ui.draw(ctx);
    }

    mouse_click(x, y) {
        const name = this.ui.selected.name;
        const tower = this.game.grid_click(this.canvas_to_grid_int(x), this.canvas_to_grid_int(y, this.grid_start), name);
        if (tower != null) {
            tower.draw = this.ui.selected.icon;
            if (tower.name === "bank") {
                this.ui.selected.price.text = this.game.price("bank");
            }
        }
        this.ui.click(x, y);
    }

    mouse_move(x, y) {
        this.ui.hover(x, y);
        let c = this.canvas_to_grid_int(x);
        let r = this.canvas_to_grid_int(y, this.grid_start);
        let name = this.ui.selected.name;

        if (!this.game.can_place(c, r, name)) {
            this.preview = null;
            return;
        }

        if (this.preview === null) {
            this.preview = new Tower(c, r, name, this.game.price(name), this.ui.selected.icon);
        } else {
            this.preview.r = r;
            this.preview.c = c;
        }
    }

    mouse_release(x, y) {
        this.ui.release(x, y);
    }

    key_down(key) {
        if (key === "å") {
            for (let b of this.ui.tower_buttons) {
                b.show();
            }
            this.game.level = 10;
            this.game.money = 10000;
        }
        if (key === " ") {
            if (!this.space_pressed && this.game.paused) {
                on_start_click();
            }
            this.space_pressed = true;
        }
    }

    key_up(key) {
        if (key === " ") {
            this.space_pressed = false;
        }
    }

    setup_events(canvas) {
        this.ui.start_button.on_click = on_start_click;
        this.game.on_victory = on_victory;

        this.ui.add_tower_button("rock", draw_rock, select).hide();
        select(this.ui.add_tower_button("gun", draw_gun_tower, select));
        this.ui.add_tower_button("slow", draw_slow_tower, select).hide();
        this.ui.add_tower_button("laser", draw_laser_tower, select).hide();
        this.ui.add_tower_button("bank", draw_bank, select).hide();

        canvas.addEventListener("mousedown", e => {
            const x = this.offset_to_canvas(e.offsetX, canvas);
            const y = this.offset_to_canvas(e.offsetY, canvas);
            this.mouse_click(x, y);
            this.mouse_move(x, y);
        });

        canvas.addEventListener("mousemove", e => {
            const x = this.offset_to_canvas(e.offsetX, canvas);
            const y = this.offset_to_canvas(e.offsetY, canvas);
            this.mouse_move(x, y);
        });

        window.addEventListener("mouseup", e => {
            const x = this.offset_to_canvas(e.offsetX, canvas);
            const y = this.offset_to_canvas(e.offsetY, canvas);
            this.mouse_release(x, y);
            this.mouse_move(x, y);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === " ") {
                // Prevent spacebar from scrolling page
                event.preventDefault();
            }
            this.key_down(event.key);
        }, false);

        document.addEventListener("keyup", (event) => {
            this.key_up(event.key);
        }, false);
    }

    tick(ms) {
        if (this.game.lives <= 0) {
            return;
        }
        if (!this.game.paused) {
            this.game.tick(ms);
        }
        this.ui.interest.text = "+ " + number_string(this.game.reward()) + "";
        this.ui.money.text = "$ " + number_string(this.game.money) + "";
        this.ui.level.text = "Level: " + this.game.level;
        this.ui.lives.text = "Lives: " + this.game.lives;
    }
}

function start(canvas) {
    canvas_manager = new CanvasManager();
    const ctx = canvas.getContext("2d");
    canvas.setAttribute("width", canvas_manager.canvas_width);
    canvas.setAttribute("height", canvas_manager.canvas_height);
    canvas_manager.setup_events(canvas);
    const ms = 10;
    window.setInterval(() => {
        canvas_manager.tick(ms);
        if (canvas_manager.space_pressed) {
            canvas_manager.tick(ms);
            canvas_manager.tick(ms);
        }
        canvas_manager.draw(ctx);
    }, ms)
}

module.exports = {
    start,
};
