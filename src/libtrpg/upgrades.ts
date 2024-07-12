import { randint } from "@olehermanse/utils/funcs.js";
import { Player } from "./game.ts";

interface EligibleFunction {
  (player: Player): boolean;
}

interface ApplyFunction {
  (player: Player): void;
}

interface Upgrade {
  description: string;
  apply: ApplyFunction;
  eligible?: EligibleFunction;
}

const _all_upgrades = {
  "Haste": {
    "description": "Speed +1",
    "apply": (player: Player) => {
      player.stats.speed += 1;
    },
    "eligible": (player: Player) => {
      return player.stats.speed <= 10;
    },
  },
  "Luck": {
    "description": "Luck +1",
    "apply": (player: Player) => {
      player.stats.luck += 1;
    },
  },
  "Physique": {
    "description": "Strength +1",
    "apply": (player: Player) => {
      player.stats.strength += 1;
    },
    "eligible": (player: Player) => {
      return player.level >= 3;
    },
  },
  "Intellect": {
    "description": "Magic +1",
    "apply": (player: Player) => {
      player.stats.magic += 1;
    },
    "eligible": (player: Player) => {
      return player.level >= 3;
    },
  },
  "Vision": {
    "description": "Light +1",
    "apply": (player: Player) => {
      player.stats.light += 1;
    },
    "eligible": (player: Player) => {
      return player.stats.light <= 10;
    },
  },
} as const;

export type UpgradeName = keyof typeof _all_upgrades;

const all_upgrades: Record<UpgradeName, Upgrade> = _all_upgrades;

export interface NamedUpgrade extends Upgrade {
  name: UpgradeName;
}

export type UpgradeAtlas = {
  [key in UpgradeName]?: Upgrade;
};

export function get_upgrade_choices(player: Player): NamedUpgrade[] {
  // 1. Get the names of all the upgrades:
  const upgrade_names: UpgradeName[] = <UpgradeName[]> Object.keys(
    all_upgrades,
  );

  // 2. Filter out the names of upgrades which are not available:
  const unlocked: UpgradeName[] = upgrade_names.filter((k: UpgradeName) => {
    const upgrade: Upgrade = all_upgrades[k];
    if (upgrade === undefined) {
      return false;
    }
    if (upgrade.eligible === undefined) {
      return true;
    }
    return upgrade.eligible(player);
  });
  console.log(unlocked);

  // 3. Add guaranteed options:
  const choices: UpgradeName[] = [];

  if (player.stats.light < 5 || player.stats.speed < 5) {
    if (player.stats.light < player.stats.speed) {
      unlocked.splice(unlocked.indexOf("Vision"), 1);
      choices.push("Vision");
    } else if (player.stats.light > player.stats.speed) {
      unlocked.splice(unlocked.indexOf("Haste"), 1);
      choices.push("Haste");
    } else {
      unlocked.splice(unlocked.indexOf("Vision"), 1);
      choices.push("Vision");
      unlocked.splice(unlocked.indexOf("Haste"), 1);
      choices.push("Haste");
    }
  }

  // 4. Pick the rest randomly
  while (choices.length < 3) {
    const i: number = randint(0, unlocked.length - 1);
    const name: UpgradeName = unlocked[i];
    unlocked.splice(i, 1);
    choices.push(name);
  }
  console.log(choices);

  // 5. Sort:
  const sorted: NamedUpgrade[] = [];
  for (const name in all_upgrades) {
    if (choices.includes(<UpgradeName> name)) {
      sorted.push(get_ugrade(<UpgradeName> name));
    }
  }
  console.log(sorted);

  return sorted;
}

export function get_ugrade(name: UpgradeName): NamedUpgrade {
  return { "name": name, ...all_upgrades[name] };
}
