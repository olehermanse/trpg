import { randint, text_wrap } from "@olehermanse/utils/funcs.js";
import { Battle, BattleEvent, Creature, Player } from "./game.ts";

export type SkillApply = () => void;
export type EffectApply = () => BattleEvent[];
export type SkillPerform = (
  user: Creature,
  target: Creature,
  battle: Battle,
) => SkillApply;

export type UpgradeEligible = (creature: Creature) => boolean;

export type UpgradePassive = (creature: Creature) => void;

export class Effect {
  constructor(
    public name: string,
    public turns: number,
    public apply_stats?: SkillApply,
    public apply_tick?: EffectApply,
  ) {
  }
}
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
    "description": "Light radius +1",
    "max": 5,
    "passive": (creature: Creature) => {
      creature.stats.light += 1;
    },
  },
  "Vitality": {
    "description": "Max HP +2",
    "max": 99,
    "passive": (creature: Creature) => {
      creature.stats.max_hp += 2;
    },
  },
  "Strength": {
    "description": "Attack damage +1",
    "max": 99,
    "passive": (creature: Creature) => {
      creature.stats.strength += 1;
    },
    "eligible": (creature: Creature) => {
      return creature.level >= 3;
    },
  },
  "Willpower": {
    "description": "Magic dmg +1",
    "max": 99,
    "passive": (creature: Creature) => {
      creature.stats.magic += 1;
    },
    "eligible": (creature: Creature) => {
      return creature.level >= 3;
    },
  },
  "Attack": {
    "description": "Swing weapon",
    "skill": (user: Creature, target: Creature, _battle: Battle) => {
      const damage = 5 + user.stats.strength - target.stats.strength;
      return () => {
        target.apply_damage(damage);
      };
    },
  },
  "Heal": {
    "description": "Use magic to heal yourself",
    "skill": (user: Creature, _target: Creature, battle: Battle) => {
      const cost = 2;
      const success = user.mp >= cost;
      const healing = user.stats.magic + cost;
      return () => {
        if (success) {
          user.hp += healing;
          user.mp -= cost;
        } else {
          battle.events.push(new BattleEvent("Not enough mana"));
        }
      };
    },
  },
  "Fireball": {
    "description": "Damage and burn the enemy",
    "skill": (user: Creature, target: Creature, battle: Battle) => {
      const cost = 3;
      const success = user.mp >= cost;
      const damage = user.stats.magic + cost - target.stats.magic;
      const burn_damage = Math.floor(damage / 10);
      const has_burn = target.has_effect("Burn");
      return () => {
        if (!success) {
          battle.events.push(new BattleEvent("Not enough mana"));
          return;
        }
        target.hp -= damage > 0 ? damage : 1;
        user.mp -= cost;
        if (has_burn) {
          return;
        }
        battle.events.push(new BattleEvent(`${target.name} got burned.`));
        target.add_effect(
          new Effect("Burn", 3, () => {
            target.stats.strength -= 2;
          }, () => {
            const msg = `Burn damaged ${target.name}.`;
            return [
              new BattleEvent(msg, () => {
                target.apply_damage(burn_damage);
              }),
            ];
          }),
        );
      };
    },
  },
  "Might": {
    "description": "+1 strength for 5 turns",
    "skill": (user: Creature, _target: Creature, battle: Battle) => {
      const has_might = user.has_effect("Might");
      return () => {
        if (has_might) {
          battle.events.push(
            new BattleEvent(`${user.name} already has Might.`),
          );
          return;
        }

        battle.events.push(
          new BattleEvent(`${user.name}'s strength increased by Might.`),
        );
        user.add_effect(
          new Effect("Might", 5, () => {
            user.stats.strength += 1;
          }),
        );
      };
    },
  },
  "Run": {
    "description": "Escape battle",
    "skill": (user: Creature, _target: Creature, _battle: Battle) => {
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

  // 5. Sort:
  const sorted: NamedUpgrade[] = [];
  for (const name in all_upgrades) {
    if (choices.includes(<UpgradeName> name)) {
      sorted.push(upgrade(<UpgradeName> name));
    }
  }

  return sorted;
}

export function upgrade(name: UpgradeName): NamedUpgrade {
  const obj = { "name": name, ...all_upgrades[name] };
  obj.description = text_wrap(obj.description, 11);
  return obj;
}

export function skill(name: UpgradeName): SkillPerform {
  const upgrade = { "name": name, ...all_upgrades[name] };
  console.assert(upgrade.skill !== undefined);
  return <SkillPerform> upgrade.skill;
}
