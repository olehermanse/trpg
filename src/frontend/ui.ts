import { xy } from "../libbasic/utils";
import { XY } from "@olehermanse/utils";
import { Draw } from "../libdraw/draw";
import { Game } from "../libtowers/libtowers";
import { UIButton, UIRect, UIText } from "../libdraw/ui_elements";

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
    button.painter = this.painter;
    const callback = (pos: XY, size: number) => {
      this.painter.paint_xy("tower", button.name, pos, size, {
        draw_price: true,
      });
    };
    button.draw_icon_callback = callback;

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
