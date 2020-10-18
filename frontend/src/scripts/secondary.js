const Game = require("../../../libtowers/libtowers.js").Game;

const GRID_SIZE = 50;
const WIDTH = 800;
const HEIGHT = 600;

const ROWS = HEIGHT / GRID_SIZE;
const COLUMNS = WIDTH / GRID_SIZE;

const PI = 3.14159;

const game = new Game(COLUMNS, ROWS);

function draw_line(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function draw_circle(ctx, x, y, r) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillStyle = 'rgba(128, 128, 128, 1)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * PI);
    ctx.stroke();
    ctx.fill();
}

function draw_background(ctx) {
    ctx.fillStyle = 'rgb(244, 244, 244)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function draw_grid(ctx) {
    for (let x = GRID_SIZE; x < WIDTH; x += GRID_SIZE) {
        draw_line(ctx, x, 0, x, HEIGHT);
    }
    for (let y = GRID_SIZE; y < HEIGHT; y += GRID_SIZE) {
        draw_line(ctx, 0, y, WIDTH, y);
    }
}

function draw_tower(ctx, tower) {
    const x = tower.c * GRID_SIZE + GRID_SIZE / 2;
    const y = tower.r * GRID_SIZE + GRID_SIZE / 2;
    const r = (GRID_SIZE / 2) * 0.7;
    draw_circle(ctx, x, y, r);
}

function draw_towers(ctx) {
    for (let tower of game.towers) {
        draw_tower(ctx, tower);
    }
}

function draw() {
    const canvas = document.getElementById('towers_canvas');
    const ctx = canvas.getContext('2d');

    draw_grid(ctx);
    draw_towers(ctx);
}

function start() {
    game.place_tower(0, 0);
    draw();
}

module.exports = {
    start,
};
