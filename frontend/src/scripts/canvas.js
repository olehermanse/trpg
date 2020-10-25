const Game = require("../../../libtowers/libtowers.js").Game;
const Draw = require("./draw.js");

const GRID_SIZE = 50;
const WIDTH = 800;
const HEIGHT = 600;

const ROWS = HEIGHT / GRID_SIZE;
const COLUMNS = WIDTH / GRID_SIZE;

const game = new Game(COLUMNS, ROWS);

function draw_tower(ctx, tower) {
    const x = tower.c * GRID_SIZE + GRID_SIZE / 2;
    const y = tower.r * GRID_SIZE + GRID_SIZE / 2;
    const r = (GRID_SIZE / 2) * 0.7;
    const angle = tower.rotation;
    Draw.circle(ctx, x, y, r);

    if (tower.target) {
        const tx = tower.target.c * GRID_SIZE + GRID_SIZE / 2;
        const ty = tower.target.r * GRID_SIZE + GRID_SIZE / 2;
        Draw.line(ctx, x, y, tx, ty, 'rgba(0, 0, 255, 0.25)', 4);
    }
    Draw.triangle(ctx, x, y, r, angle);
}

function draw_towers(ctx) {
    for (let tower of game.towers) {
        draw_tower(ctx, tower);
    }
}

function draw_enemy(ctx, enemy) {
    const x = enemy.c * GRID_SIZE + GRID_SIZE / 2;
    const y = enemy.r * GRID_SIZE + GRID_SIZE / 2;
    const r = (GRID_SIZE / 2) * 0.7;
    const angle = enemy.rotation;
    Draw.triangle(ctx, x, y, r, angle, "#ff0000", "#000000");
}

function draw_enemies(ctx) {
    for (let enemy of game.enemies) {
        draw_enemy(ctx, enemy);
    }
}

function draw(ctx) {
    Draw.background(ctx, WIDTH, HEIGHT);
    Draw.grid(ctx, GRID_SIZE, WIDTH, HEIGHT);
    draw_towers(ctx);
    draw_enemies(ctx);
}

function to_grid(p) {
    return Math.floor(p / GRID_SIZE);
}

function grid_click(c, r) {
    if (!game.has_tower(c, r)) {
        game.place_tower(c, r);
    }
}

function mouse_click(x, y) {
    grid_click(to_grid(x), to_grid(y));
}

function mouse_move(x, y) {

}

function mouse_release() {

}

function setup_events(canvas) {
    canvas.addEventListener('mousedown', e => {
        mouse_click(e.offsetX, e.offsetY);
    });

    canvas.addEventListener('mousemove', e => {
        mouse_move(e.offsetX, e.offsetY);
    });

    window.addEventListener('mouseup', e => {
        mouse_release();
    });
}

function start(canvas) {
    const ctx = canvas.getContext('2d');
    setup_events(canvas);
    window.setInterval(() => {
        game.tick(10);
        draw(ctx);
    }, 10)
}

module.exports = {
    start,
};
