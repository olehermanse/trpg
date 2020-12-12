const PI = 3.14159;
const GRID_COLOR = "rgba(200,200,200,0.5)";

function line(ctx, x1, y1, x2, y2, strokeStyle, lineWidth = 2) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function circle(ctx, x, y, r, fill = null, stroke = null, lineWidth = 2) {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * PI);
    if (fill != null) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke != null) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }
}

function triangle(ctx, x, y, r, angle, fill, stroke = null, lineWidth = 2) {
    const height = r * 2;
    const side = height * (2 / (Math.sqrt(3)));

    // Matrix transformation
    ctx.translate(x, y);
    ctx.rotate(-angle);
    ctx.translate(-x, -y);

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x - r * (1 / 2), y - r * (Math.sqrt(3) / 2));
    ctx.lineTo(x - r * (1 / 2), y + r * (Math.sqrt(3) / 2));
    ctx.lineTo(x + r, y);

    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function rectangle(ctx, x, y, w, h, fill = null, stroke = null, lineWidth = 2) {
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, w, h);
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(x, y, w, h);
    }
}

function text(ctx, x, y, string, c, size) {
    ctx.font = Math.floor(size) + "px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = c;
    ctx.fillText(string, x, y);
}

function grid(ctx, size, x0, y0, width, height) {
    for (let x = size; x < width; x += size) {
        line(ctx, x, y0, x, y0 + height, GRID_COLOR, 2);
    }
    for (let y = size; y < height; y += size) {
        line(ctx, x0, y, x0 + width, y, GRID_COLOR, 2);
    }
}

module.exports = {
    circle,
    triangle,
    rectangle,
    line,
    text,
    grid,
};
