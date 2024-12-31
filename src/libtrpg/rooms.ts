import { cr, randint } from "@olehermanse/utils/funcs.js";
import { Creature, Entity, Zone } from "./game.ts";
import { inside_rectangle } from "../todo_utils.ts";

export type RoomType = "generic" | "chest" | "empty" | "spawn";

function _chest_room(zone: Zone) {
  // room is 16 columns and 12 rows
  let pos = cr(randint(7, 8), randint(5, 6));
  while (!zone.empty(pos)) {
    pos = cr(randint(7, 8), randint(5, 6));
  }
  const entity = new Entity("chest", pos, zone);
  if (entity.cr.c >= 8) {
    entity.reversed = true;
  }
  zone.append(entity);
}

function _generic_room(zone: Zone) {
  for (let i = 0; i < 7; i++) {
    let pos = cr(randint(1, zone.columns - 2), randint(2, zone.rows - 3));
    while (!zone.empty(pos)) {
      pos = cr(randint(1, zone.columns - 2), randint(2, zone.rows - 3));
    }
    const entity = new Entity("crystal", pos, zone);
    zone.append(entity);
  }
  for (let i = 0; i < 2; i++) {
    let pos = cr(randint(1, zone.columns - 2), randint(2, zone.rows - 3));
    while (!zone.empty(pos)) {
      pos = cr(randint(1, zone.columns - 2), randint(2, zone.rows - 3));
    }
    const entity = new Creature("skeleton", pos, zone, zone.game);
    if (entity.cr.c > zone.columns / 2) {
      entity.reversed = true;
    }
    zone.append(entity);
  }
}

function _spawn_room(zone: Zone) {
  const pos = cr(8, 9);
  const entity = new Entity("pickaxe", pos, zone);
  zone.append(entity);
}

function _generate_entities(zone: Zone) {
  if (zone.room_type === "empty") {
    return;
  }
  if (zone.room_type === "spawn") {
    return _spawn_room(zone);
  }
  if (zone.room_type === "chest") {
    return _chest_room(zone);
  }
  if (zone.room_type === "generic") {
    return _generic_room(zone);
  }
  return _generic_room(zone);
}

function _select_room_type(zone: Zone) {
  if (zone.pos.c === 0 && zone.pos.r === 0) {
    zone.room_type = "spawn";
    return;
  }
  if (inside_rectangle(zone.pos.c, zone.pos.r, -1, -1, 1, 1)) {
    zone.room_type = "generic";
    return;
  }
  const percentage = randint(1, 100);
  if (percentage <= 1) { // 1%
    zone.room_type = "empty";
    return;
  }
  if (percentage <= 1 + 10) { // 10%
    zone.room_type = "chest";
    return;
  }
  zone.room_type = "generic";
}

function _discover_neighbors(zone: Zone) {
  const left = zone.game.get_zone(cr(zone.pos.c - 1, zone.pos.r));
  const right = zone.game.get_zone(cr(zone.pos.c + 1, zone.pos.r));
  const top = zone.game.get_zone(cr(zone.pos.c, zone.pos.r - 1));
  const bottom = zone.game.get_zone(cr(zone.pos.c, zone.pos.r + 1));
  if (left !== null) {
    zone.left_entry = left.right_entry;
  }
  if (right !== null) {
    zone.right_entry = right.left_entry;
  }
  if (top !== null) {
    zone.top_entry = top.bottom_entry;
  }
  if (bottom !== null) {
    zone.bottom_entry = bottom.top_entry;
  }
}

function _generate_walls(zone: Zone) {
  if (zone.starting_zone()) {
    zone.left_entry = -1;
    zone.right_entry = -1;
    zone.top_entry = -1;
    zone.bottom_entry = -1;
    switch (randint(1, 4)) {
      case 1:
        zone.left_entry = randint(1, zone.rows - 2);
        break;
      case 2:
        zone.right_entry = randint(1, zone.rows - 2);
        break;
      case 3:
        zone.top_entry = randint(1, zone.columns - 2);
        break;
      case 4:
        zone.bottom_entry = randint(1, zone.columns - 2);
        break;
    }
  } else {
    zone.left_entry ??= randint(1, zone.rows - 2);
    zone.right_entry ??= randint(1, zone.rows - 2);
    zone.top_entry ??= randint(1, zone.columns - 2);
    zone.bottom_entry ??= randint(1, zone.columns - 2);
  }
  for (let r = 0; r < zone.rows; r++) {
    if (r !== zone.left_entry) {
      zone.append(
        new Entity("rock", cr(0, r), zone, randint(0, 2), randint(0, 1) === 0),
      );
    }
    if (r !== zone.right_entry) {
      zone.append(
        new Entity(
          "rock",
          cr(zone.columns - 1, r),
          zone,
          randint(0, 2),
          randint(0, 1) === 0,
        ),
      );
    }
  }
  for (let c = 1; c < zone.columns - 1; c++) {
    if (c !== zone.top_entry) {
      zone.append(
        new Entity("rock", cr(c, 0), zone, randint(0, 2), randint(0, 1) === 0),
      );
    }
    if (c !== zone.bottom_entry) {
      zone.append(
        new Entity(
          "rock",
          cr(c, zone.rows - 1),
          zone,
          randint(0, 2),
          randint(0, 1) === 0,
        ),
      );
    }
  }
}

export function generate_room(zone: Zone) {
  _discover_neighbors(zone);
  _generate_walls(zone);
  _select_room_type(zone);
  _generate_entities(zone);
}
