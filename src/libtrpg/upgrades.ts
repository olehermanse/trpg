import { randint } from "@olehermanse/utils/funcs.js";
import { Creature, Player } from "./game.ts";

export type SkillApply = () => void;
export type SkillPerform = (user: Creature, target: Creature) => SkillApply;

export type UpgradeEligible = (creature: Creature) => boolean;

export type UpgradePassive = (creature: Creature) => void;

interface Upgrade {
  description: string;
  passive?: UpgradePassive;
  eligible?: UpgradeEligible;
  max?: number; // Default is only 1
  skill?: SkillPerform;
}

const _all_upgrades = {
  "Haste": {
    "description": "Speed +1",
    "max": 5,
    "passive": (creature: Creature) => {
      creature.stats.speed += 1;
    },
  },
  "Vision": {
    "description": "Light +1",
    "max": 5,
    "passive": (creature: Creature) => {
      creature.stats.light += 1;
    },
  },
  "Luck": {
    "description": "Luck +1",
    "max": 99,
    "passive": (creature: Creature) => {
      creature.stats.luck += 1;
    },
  },
  "Strength": {
    "description": "Damage +1",
    "max": 99,
    "passive": (creature: Creature) => {
      creature.stats.strength += 1;
    },
    "eligible": (creature: Creature) => {
      return creature.level >= 3;
    },
  },
  "Intellect": {
    "description": "Magic +1",
    "max": 99,
    "passive": (creature: Creature) => {
      creature.stats.magic += 1;
    },
    "eligible": (creature: Creature) => {
      return creature.level >= 3;
    },
  },
  "Attack": {
    "description": "Swing weapon to deal damage",
    "skill": (user: Creature, target: Creature) => {
      let damage = 5 + user.stats.strength - target.stats.strength;
      if (damage <= 0) {
        damage = 1;
      }
      return () => {
        target.hp -= damage;
      };
    },
  },
  "Heal": {
    "description": "Use magic \nto heal\nyourself",
    "skill": (user: Creature, _target: Creature) => {
      const healing = user.stats.magic + 10;
      const cost = 2;
      return () => {
        user.hp += healing;
        user.mp -= cost;
      };
    },
  },
  "Buff": {
    "description": "TODO",
    "skill": (_user: Creature, _target: Creature) => {
      return () => {};
    },
  },
  "Run": {
    "description": "Escape battle",
    "skill": (user: Creature, _target: Creature) => {
      return () => {
        user.run = true;
      };
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

function _is_available(upgrade: NamedUpgrade, player: Player) {
  if (upgrade.max !== undefined) {
    console.assert(upgrade.max > 1);
  }

  // Check eligibility function:
  if (upgrade.eligible !== undefined && upgrade.eligible(player) === false) {
    return false;
  }

  // Check number of stacks acquired already:
  const count = player.count_upgrade(upgrade.name);
  console.assert(count >= 0);
  if (count === 0) {
    return true; // No stacks
  }
  // At least 1 stack
  console.assert(count >= 1);
  if (upgrade.max === undefined) {
    return false; // No maximum, default is 1
  }
  if (count >= upgrade.max) {
    return false; // Reached maximum stacks
  }
  return true; // Not reached maximum stacks
}

export function get_upgrade_choices(player: Player): NamedUpgrade[] {
  // 1. Get the names of all the upgrades:
  const upgrade_names: UpgradeName[] = <UpgradeName[]> Object.keys(
    all_upgrades,
  );

  // 2. Filter out the names of upgrades which are not available:
  const unlocked: UpgradeName[] = upgrade_names.filter((k: UpgradeName) => {
    return _is_available(upgrade(k), player);
  });

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
      sorted.push(upgrade(<UpgradeName> name));
    }
  }
  console.log(sorted);

  return sorted;
}

export function upgrade(name: UpgradeName): NamedUpgrade {
  return { "name": name, ...all_upgrades[name] };
}

export function skill(name: UpgradeName): SkillPerform {
  const upgrade = { "name": name, ...all_upgrades[name] };
  console.assert(upgrade.skill !== undefined);
  return <SkillPerform> upgrade.skill;
}
