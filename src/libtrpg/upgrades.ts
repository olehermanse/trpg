import { randint, text_wrap } from "@olehermanse/utils/funcs.js";
import { Battle, BattleEvent, Creature, Player } from "./game.ts";

export function damage(
  offensive_stat: number,
  defensive_stat: number,
  constant: number = 5,
  minimum: number = 1,
) {
  const raw = 2 * offensive_stat + constant;
  let damage: number = Math.floor(raw - defensive_stat);
  if (damage < minimum) {
    damage = minimum;
  }
  return damage;
}

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
  minimum_level?: number;
  eligible?: UpgradeEligible;
  max?: number; // Default is only 1
  skill?: SkillPerform;
  permanent?: true;
}

const _all_upgrades = {
  "Haste": {
    "description": "Speed +1",
    "max": 3,
    "passive": (creature: Creature) => {
      creature.stats.speed += 1;
    },
  },
  "Vision": {
    "description": "Light radius +1",
    "max": 3,
    "passive": (creature: Creature) => {
      creature.stats.light += 1;
    },
  },
  "Permahaste": {
    "description": "Movement speed +1",
    "permanent": true,
    "max": 3,
    "passive": (creature: Creature) => {
      creature.stats.movement_speed += 1;
    },
    "eligible": (creature: Creature) => {
      return creature.count_upgrade("Haste") === 3;
    },
    "minimum_level": 10,
  },
  "Permavision": {
    "description": "Light radius +1",
    "permanent": true,
    "max": 3,
    "passive": (creature: Creature) => {
      creature.stats.light += 1;
    },
    "eligible": (creature: Creature) => {
      return creature.count_upgrade("Vision") === 3;
    },
    "minimum_level": 10,
  },
  "Growth": {
    "description": "Increased XP +5%",
    "max": 2,
    "passive": (creature: Creature) => {
      creature.stats.increased_xp += 5;
    },
    "minimum_level": 6,
  },
  "Permagrowth": {
    "description": "Increased XP +3%",
    "permanent": true,
    "max": 2,
    "passive": (creature: Creature) => {
      creature.stats.increased_xp += 3;
    },
    "eligible": (creature: Creature) => {
      return creature.count_upgrade("Growth") === 2;
    },
    "minimum_level": 10,
  },
  "Vitality": {
    "description": "Max HP +5",
    "max": 99,
    "passive": (creature: Creature) => {
      creature.stats.max_hp += 5;
    },
  },
  "Physique": {
    "description": "Strength +1",
    "max": 99,
    "passive": (creature: Creature) => {
      creature.stats.strength += 1;
    },
    "minimum_level": 3,
  },
  "Willpower": {
    "description": "Magic +1",
    "max": 99,
    "passive": (creature: Creature) => {
      creature.stats.magic += 1;
    },
    "minimum_level": 3,
  },
  "Attack": {
    "description": "Swing weapon",
    "skill": (user: Creature, target: Creature, _battle: Battle) => {
      // Standard damage calculation used as basis for all other skills
      // Minimum 1 damage
      // raw damage is 5 + 2x user strength
      // mitigation is 1x target strength
      const dmg = damage(user.stats.strength, target.stats.strength);
      return () => {
        target.apply_damage(dmg);
      };
    },
  },
  "Heal": {
    "description": "Use magic to heal yourself",
    "skill": (user: Creature, _target: Creature, battle: Battle) => {
      // Healing is based on mana spent with a small boost from magic stat
      // Cost (mana spent) scales with maximum mana
      // Base rule is that 1 mana = 1 hit point healed
      const cost = 2 + Math.floor(user.stats.max_mp / 10);
      const success = user.mp >= cost;
      const increase = (100 + user.stats.magic) / 100;
      const healing = Math.floor(increase * cost);
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
      // Same damage calc as Attack, but slightly better
      // Mana cost should balance it out
      // Mana cost scales with damage dealt
      // Burn is 10% of damage dealt
      // TODO: Should burn and mana cost scale with raw damage instead?
      const dmg = damage(user.stats.magic, target.stats.magic, 6, 2);
      const burn_dmg = Math.floor(dmg / 10);
      const has_burn = target.has_effect("Burn");
      const cost = 2 + Math.floor(dmg / 10);
      const success = user.mp >= cost;
      return () => {
        if (!success) {
          battle.events.push(new BattleEvent("Not enough mana"));
          return;
        }
        target.hp -= dmg > 0 ? dmg : 1;
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
                target.apply_damage(burn_dmg);
              }),
            ];
          }),
        );
      };
    },
  },
  "Elixir": {
    "description": "Restore mana",
    "eligible": (creature: Creature) => {
      return creature.get_skill_names().length >= 4;
    },
    "skill": (user: Creature, _target: Creature, battle: Battle) => {
      // Restore mana per turn
      // scales with magic stat, and to a very limited extent max mana
      const power = 2 +
        Math.floor(user.stats.magic / 10 + user.stats.max_mp / 100);
      const has_elixir = user.has_effect("Elixir");
      return () => {
        if (has_elixir) {
          battle.events.push(
            new BattleEvent(`${user.name} Already has elixir.`),
          );
          return;
        }
        user.add_effect(
          new Effect("Elixir", 3, undefined, () => {
            const msg = `Elixir restored ${user.name}'s mana.`;
            return [
              new BattleEvent(msg, () => {
                user.mp += power;
              }),
            ];
          }),
        );
      };
    },
  },
  "Pact": {
    "description": "Sacrifice blood to damage everyone",
    "eligible": (creature: Creature) => {
      return creature.get_skill_names().length >= 4;
    },
    "skill": (user: Creature, target: Creature, battle: Battle) => {
      // Deals damage to both user and target based on user
      // max HP. Will kill both if there is no healing and if
      // target has less HP than user max HP.
      // 1 damage immediately
      // 20% of max hp per turn for 5 turns
      // Balanced around the fact that it damages both equally
      const power = Math.ceil(user.stats.max_hp / 5);
      const user_has_bleed = user.has_effect("Bleed");
      const target_has_bleed = target.has_effect("Bleed");
      return () => {
        user.apply_damage(1);
        target.apply_damage(1);
        if (user_has_bleed) {
          battle.events.push(
            new BattleEvent(`${user.name} is already bleeding.`),
          );
        } else {
          user.add_effect(
            new Effect("Bleed", 5, undefined, () => {
              const msg = `${user.name} was damaged by Bleed.`;
              return [
                new BattleEvent(msg, () => {
                  user.apply_damage(power, 1);
                }),
              ];
            }),
          );
        }
        if (target_has_bleed) {
          battle.events.push(
            new BattleEvent(`${target.name} is already bleeding.`),
          );
        } else {
          target.add_effect(
            new Effect("Bleed", 5, undefined, () => {
              const msg = `${target.name} was damaged by Bleed.`;
              return [
                new BattleEvent(msg, () => {
                  target.apply_damage(power, 1);
                }),
              ];
            }),
          );
        }
      };
    },
  },
  "Rend": {
    "description": "Causes enemy to bleed",
    "skill": (user: Creature, target: Creature, battle: Battle) => {
      // About 1/3 as strong as normal attack, but applies bleed
      // for same amount every turn for 5 turns. (So almost break even at 2nd turn).
      const dmg = Math.floor(
        damage(user.stats.strength, target.stats.strength, 1, 1) / 3,
      );
      const target_has_bleed = target.has_effect("Bleed");
      return () => {
        target.apply_damage(dmg);
        if (target_has_bleed) {
          battle.events.push(
            new BattleEvent(`${target.name} is already bleeding.`),
          );
        } else {
          target.add_effect(
            new Effect("Bleed", 5, undefined, () => {
              const msg = `${target.name} was damaged by Bleed.`;
              return [
                new BattleEvent(msg, () => {
                  target.apply_damage(dmg, 1);
                }),
              ];
            }),
          );
        }
      };
    },
  },
  "Might": {
    "description": "+1 strength for 5 turns",
    "skill": (user: Creature, _target: Creature, battle: Battle) => {
      // Doesn't scale with anything
      // Something like:
      // 2x5=10 extra damage, 5x1=5 healing
      // Okay early, terrible later(?)
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
      // Run from battle, getting 0 xp.
      // If lower speed, enemy can attack and kill you first.
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

  if (
    upgrade.minimum_level !== undefined && player.level < upgrade.minimum_level
  ) {
    return false;
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

  const hastes = player.count_upgrade("Haste") +
    player.count_upgrade("Permahaste");
  const visions = player.count_upgrade("Vision") +
    player.count_upgrade("Permavision");
  if (player.level <= 5 && hastes < 3 || visions < 3) {
    const try_to_add: UpgradeName[] = [];

    if (hastes === visions) {
      try_to_add.push("Haste");
      try_to_add.push("Vision");
    } else if (hastes < visions) {
      try_to_add.push("Haste");
      try_to_add.push("Vision");
    } else if (visions < hastes) {
      try_to_add.push("Vision");
      try_to_add.push("Haste");
    }

    for (const name of try_to_add) {
      if (_is_available(upgrade(name), player)) {
        unlocked.splice(unlocked.indexOf(name), 1);
        choices.push(name);
        break;
      }
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
  let description = obj.description;
  if (obj.permanent === true) {
    description += ". Permanent.";
  }
  obj.description = text_wrap(description, 11);
  return obj;
}

export function skill(name: UpgradeName): SkillPerform {
  const upgrade = { "name": name, ...all_upgrades[name] };
  console.assert(upgrade.skill !== undefined);
  return <SkillPerform> upgrade.skill;
}
