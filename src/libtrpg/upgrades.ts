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
  "Physique": {
    "description": "Strength +1",
    "apply": (player: Player) => {
      player.stats.strength += 1;
    },
  },
  "Luck": {
    "description": "Luck +1",
    "apply": (player: Player) => {
      player.stats.luck += 1;
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
  const upgrade_names: UpgradeName[] = <UpgradeName[]> Object.keys(
    all_upgrades,
  );
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
  const choices: NamedUpgrade[] = [];
  for (let _ of [1, 2, 3]) {
    const i: number = randint(0, unlocked.length - 1);
    const name: UpgradeName = unlocked[i];
    const upgrade = all_upgrades[name];
    const choice = { "name": name, ...upgrade };
    unlocked.splice(i, 1);
    choices.push(choice);
  }
  return choices;
}

export function get_ugrade(name: UpgradeName): NamedUpgrade {
  return { "name": name, ...all_upgrades[name] };
}
