import { xy } from "../libtowers/utils.js";
import { ClickCallback, XY } from "../libtowers/interfaces";
import { Draw } from "./draw.js";
import { Game, Card } from "../libtowers/libtowers.js";

class UIRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string | null;
  stroke: string | null;
  padding: number;
  margin: number;
  line_width: number | null;
  padded: UIRect;
  children: any[];

  constructor(
    x,
    y,
    w,
    h,
    fill = null,
    stroke = null,
    padding = 0,
    margin = 0,
    line_width = null
  ) {
    this.x = x + margin;
    this.y = y + margin;
    this.w = w - 2 * margin;
    this.h = h - 2 * margin;
    this.fill = fill;
    this.stroke = stroke;
    this.padding = padding;
    this.padded = this;
    if (padding > 0) {
      this.padded = this.get_padded();
    }
    this.line_width = line_width;
    this.children = [];
  }

  get_padded() {
    return new UIRect(
      this.x + this.padding,
      this.y + this.padding,
      this.w - 2 * this.padding,
      this.h - 2 * this.padding,
      this.fill,
      this.stroke,
      0,
      0
    );
  }

  draw_children(ctx: CanvasRenderingContext2D) {
    this.children.map((c) => {
      c.draw(ctx);
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    Draw.rectangle(
      ctx,
      this.x,
      this.y,
      this.w,
      this.h,
      this.fill,
      this.stroke,
      this.line_width
    );
    this.draw_children(ctx);
  }

  center(): XY {
    return xy(this.x + this.w / 2, this.y + this.h / 2);
  }

  top_left(): XY {
    return xy(this.x, this.y);
  }

  top_right(): XY {
    return xy(this.x + this.w, this.y);
  }

  bottom_left(): XY {
    return xy(this.x, this.y + this.h);
  }

  bottom_right(): XY {
    return xy(this.x + this.w, this.y + this.h);
  }

  top(): XY {
    return xy(this.x + this.w / 2, this.y);
  }

  bottom(): XY {
    return xy(this.x + this.w / 2, this.y + this.h);
  }

  left(): XY {
    return xy(this.x, this.y + this.h / 2);
  }

  right() {
    return xy(this.x + this.w, this.y + this.h / 2);
  }

  is_inside(x: number, y: number): boolean {
    return (
      x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h
    );
  }
}

class UIText {
  x: number;
  y: number;
  c: string;
  text: string;
  textAlign: string;
  textBaseline: string;
  font: number;
  w: number;

  constructor(
    x: number,
    y: number,
    color: string,
    font: number,
    text: string = "",
    n: number = 5
  ) {
    this.x = x;
    this.y = y;
    this.c = color;
    this.text = text;
    this.textAlign = "center";
    this.textBaseline = "middle";
    this.font = font;
    this.w = 0.6 * font * n;
  }

  left(): XY {
    return xy(this.x - this.w, this.y);
  }

  draw(ctx: CanvasRenderingContext2D) {
    Draw.fill_text(
      ctx,
      this.text,
      this.x,
      this.y,
      this.c,
      this.font,
      this.textAlign,
      this.textBaseline
    );
  }
}

class UIButton extends UIRect {
  label: UIText | null;
  on_click: ClickCallback;
  state: string;
  base_color: string;
  draw_tower: boolean;
  painter: any;
  tooltip_card: Card | null;
  name: string;
  card: Card | null; // TODO remove this in favor of tooltip_card

  constructor(
    x,
    y,
    w,
    h,
    fill = null,
    stroke = null,
    label = null,
    line_width = null
  ) {
    super(x, y, w, h, fill, stroke);
    this.line_width = line_width;
    if (label === null) {
      this.label = null;
    } else {
      this.label = new UIText(x + w / 2, y + h / 2, stroke, h / 2, label);
      this.children.push(this.label);
    }
    this.on_click = null;
    this.state = "active";
    this.base_color = stroke;
    this.draw_tower = false;
    this.painter = null;
    this.tooltip_card = null;
  }

  hide() {
    this.state = "hidden";
  }

  show() {
    if (this.state === "hidden") {
      this.state = "active";
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.state === "hidden") {
      return;
    }
    if (this.draw_tower) {
      this.painter.paint_xy("tower", this.name, this.center(), this.w, {
        draw_price: true,
      });
    }
    super.draw(ctx);
  }

  set_temporary_color(label = null, rect = null) {
    if (this.label != null) {
      if (label != null) {
        this.label.c = label;
      } else {
        this.label.c = this.base_color;
      }
    }
    if (rect != null) {
      this.stroke = rect;
    } else {
      this.stroke = this.base_color;
    }
  }

  transition(state: string) {
    console.assert(this.state != state);
    this.state = state;
    const blue = "rgba(0,128,255,1)";
    const grey = "rgba(180,180,180,1)";
    const red = "rgba(255,0,0,1)";
    if (state === "active") {
      this.set_temporary_color();
    } else if (state === "hovered") {
      this.set_temporary_color(blue, blue);
    } else if (state === "clicked") {
      this.set_temporary_color(blue, grey);
    } else if (state === "disabled") {
      this.set_temporary_color(grey, grey);
    } else if (state === "selected") {
      this.set_temporary_color(blue, blue);
    } else {
      this.set_temporary_color(red, red);
    }
  }

  click(x: number, y: number) {
    if (this.state === "hidden") {
      return;
    }
    if (["active", "hovered"].includes(this.state) && this.is_inside(x, y)) {
      this.transition("clicked");
    }
  }

  release(x: number, y: number) {
    if (this.state === "hidden") {
      return;
    }
    if (this.state === "clicked") {
      if (this.is_inside(x, y)) {
        this.transition("hovered");
        if (this.on_click != null) {
          this.on_click(this);
        }
      } else {
        this.transition("active");
      }
    }
  }

  hover(x: number, y: number): any[] {
    if (this.state === "hidden") {
      return [];
    }
    const inside: boolean = this.is_inside(x, y);
    if (this.state === "hovered" && !inside) {
      this.transition("active");
    } else if (this.state === "active" && inside) {
      this.transition("hovered");
    }
    if (inside) {
      return [this];
    }
    return [];
  }
}

class UI extends UIRect {
  grid_size: number;
  spacing: number;
  btn_h: number;
  btn_y: number;
  painter: any;
  buttons: any[];
  inventory_buttons: any[];
  next_x: number;
  selected: UIButton | null;
  start_button: UIButton;
  interest: UIText;
  money: UIText;
  lives: UIText;
  level: UIText;

  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string,
    grid_size: number,
    line_width: number,
    painter: any
  ) {
    super(x, y, w, h, fill, stroke, 0, 0);
    this.line_width = line_width;
    this.grid_size = grid_size;
    this.spacing = grid_size / 4;

    this.btn_h = h - 4 * this.spacing;
    this.btn_y = y + 2 * this.spacing;

    this.painter = painter;

    this.buttons = [];
    this.inventory_buttons = [];

    this.next_x = x + grid_size;
    this.add_tower_button();
    this.add_tower_button();
    this.add_tower_button();
    this.add_tower_button();
    this.add_tower_button();
    this.selected = null;

    let flow: XY = xy(x, y);
    flow.x += w - grid_size;
    flow.y += h / 2;
    {
      const btn_w = w / 10;
      const btn_h = h / 3;
      const btn_x = flow.x - btn_w;
      const btn_y = flow.y - btn_h / 2;
      const button = new UIButton(
        btn_x,
        btn_y,
        btn_w,
        btn_h,
        fill,
        stroke,
        "Start",
        this.line_width
      );
      this.buttons.push(button);
      this.start_button = button;
      this.children.push(button);
      flow = button.left();
    }
    {
      let top = this.btn_y + h / 8;
      const interest = new UIText(
        flow.x - 2 * this.spacing,
        top,
        stroke,
        0.2 * h,
        "",
        3
      );
      interest.textAlign = "right";
      this.interest = interest;
      this.children.push(interest);
    }
    {
      let top = this.btn_y + (3 * h) / 8;
      const money = new UIText(flow.x - 2 * this.spacing, top, stroke, 0.2 * h);
      money.textAlign = "right";
      this.money = money;
      this.children.push(money);
    }

    // Life counter:
    {
      this.lives = new UIText(
        this.grid_size,
        this.grid_size,
        this.stroke,
        0.3 * h,
        "",
        8
      );
      this.lives.textBaseline = "middle";
      this.lives.textAlign = "left";
      this.children.push(this.lives);
    }

    // Level counter:
    {
      this.level = new UIText(w - grid_size, this.grid_size, stroke, 0.3 * h);
      this.level.textBaseline = "middle";
      this.level.textAlign = "right";
      this.children.push(this.level);
    }
  }

  refresh(game: Game) {
    for (let i = 0; i < game.inventory.length; ++i) {
      const card = game.inventory[i];
      const button = this.inventory_buttons[i];
      button.name = card.name; // TODO: Remove button name
      button.card = card;
      button.tooltip_card = card;
      button.show();
    }
    if (this.selected === null) {
      let btn = this.inventory_buttons[0];
      btn.on_click(btn);
    }
  }

  add_tower_button() {
    const btn_h = this.btn_h;
    const btn_w = btn_h;
    const btn_y = this.btn_y;

    const button = new UIButton(
      this.next_x,
      btn_y,
      btn_w,
      btn_h,
      null,
      this.stroke,
      null,
      this.line_width
    );

    button.on_click = (btn: UIButton) => {
      this.selected = btn;
      if (btn.state != "selected") {
        btn.transition("selected");
        this.painter.canvas_manager.preview = null;
      }
      for (let button of this.inventory_buttons) {
        if (button != btn && button.state === "selected") {
          button.transition("active");
        }
      }
    };
    button.draw_tower = true;
    button.painter = this.painter;

    this.inventory_buttons.push(button);
    this.buttons.push(button);
    this.children.push(button);
    this.next_x += btn_w + this.spacing;
    button.hide();
    return button;
  }

  click(x: number, y: number) {
    for (let button of this.buttons) {
      button.click(x, y);
    }
  }

  release(x: number, y: number) {
    for (let button of this.buttons) {
      button.release(x, y);
    }
  }

  hover(x: number, y: number) {
    let match = [];
    for (let button of this.buttons) {
      let r = button.hover(x, y);
      if (r.length > 0) {
        match.push(...r);
      }
    }
    return match;
  }

  draw(ctx: CanvasRenderingContext2D) {
    Draw.rectangle(ctx, this.x, this.y, this.w, this.h, this.fill, null);
    this.draw_children(ctx);
  }
}

export { UI };
