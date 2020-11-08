const Draw = require("./draw.js");

function xy(x, y) {
    return { "x": x, "y": y };
}

class UIRect {
    constructor(x, y, w, h, c, padding = 0, margin = 0) {
        this.x = x + margin;
        this.y = y + margin;
        this.w = w - 2 * margin;
        this.h = h - 2 * margin;
        this.c = c;
        this.padding = padding;
        this.padded = this;
        if (padding > 0) {
            this.padded = this.get_padded();
        }
        this.children = [];
    }

    get_padded() {
        return new UIRect(
            this.x + this.padding,
            this.y + this.padding,
            this.w - 2 * this.padding,
            this.h - 2 * this.padding,
            this.c,
            0,
            0);
    }

    draw_self(ctx) {
        Draw.rectangle(ctx, this.x, this.y, this.w, this.h, null, this.c);
    }

    draw(ctx) {
        this.draw_self(ctx);
        this.children.map((c) => { c.draw(ctx); });
    }

    top_left() {
        return xy(this.x, this.y);
    }

    top_right() {
        return xy(this.x + this.w, this.y);
    }

    bottom_left() {
        return xy(this.x, this.y + this.h);
    }

    bottom_right() {
        return xy(this.x + this.w, this.y + this.h);
    }

    top() {
        return xy(this.x + this.w / 2, this.y);
    }

    bottom() {
        return xy(this.x + this.w / 2, this.y + this.h);
    }

    left() {
        return xy(this.x, this.y + this.h / 2);
    }

    right() {
        return xy(this.x + this.w, this.y + this.h / 2);
    }
}

class UIText {
    constructor(x, y, color, textAlign) {
        this.x = x;
        this.y = y;
        this.c = color;
        this.text = "0";
        this.textAlign = textAlign;
    }

    draw(ctx) {
        ctx.font = '48px monospace';
        ctx.textAlign = this.textAlign;
        ctx.textBaseline = "middle";
        ctx.fillStyle = this.c;
        ctx.fillText(this.text, this.x, this.y);
    }
}

class UI extends UIRect {
    constructor(x, y, w, h, c, padding = 0, margin = 0) {
        super(x, y, w, h, c, padding, margin);

        const inner = this.get_padded();
        this.inner = inner;
        this.inner.c = null;
        this.children.push(inner);

        const right = this.inner.padded.right();
        const text = new UIText(right.x, right.y, this.c, "right");
        this.text = text;
        this.children.push(text);
    }
}

module.exports = {
    UI,
};
