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

export type Keyword =
  | "skill"
  | "damaging"
  | "healing"
  | "buff"
  | "debuff"
  | "dot"
  | "hot"
  | "class"
  | "permanent";

export type SkillApply = () => void;
export type EffectApply = () => BattleEvent[];
export type SkillPerform = (
  user: Creature,
  target: Creature,
  battle: Battle,
  skill: NamedUpgrade,
) => SkillApply;

export type UpgradeEligible = (creature: Creature) => boolean;
export type UpgradeBoost = (skill: NamedUpgrade) => number;

export type UpgradePassive = (creature: Creature) => void;
export type UpgradeApply = (creature: Creature) => void;
export type CostFunction = (creature: Creature) => number;

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
  boost?: UpgradeBoost;
  max?: number; // Default is only 1
  skill?: SkillPerform;
  keywords?: Readonly<Keyword[]>;
  consumed?: true;
  on_pickup?: UpgradeApply;
  mana_cost?: CostFunction;
  unobtainable?: true;
}

const _all_upgrades = {
  // "Special" skills (attack, forget attack)
  "Attack": {
    "description": "Swing weapon",
    "eligible": (creature: Creature) => {
      return creature.get_skill_names().length === 0;
    },
    "skill": (
      user: Creature,
      target: Creature,
      _battle: Battle,
      _skill: NamedUpgrade,
    ) => {
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
  "Forget": {
    "description": "Remove attack",
    "minimum_level": 10,
    "consumed": true,
    "on_pickup": (creature: Creature) => {
      creature.remove_upgrade("Attack");
    },
    "eligible": (creature: Creature) => {
      return creature.has_upgrade("Attack") &&
        creature.get_skill_names().length == 8;
    },
  },
  // Healing:
  "Heal": {
    "description": "Use magic to heal yourself",
    "keywords": ["healing"],
    "mana_cost": (user: Creature) => {
      return 2 + Math.floor(user.stats.max_mp / 5);
    },
    "skill": (
      user: Creature,
      _target: Creature,
      battle: Battle,
      skill: NamedUpgrade,
    ) => {
      // Healing is based on mana spent with a small boost from magic stat
      // Cost (mana spent) scales with maximum mana
      // Base rule is that 1 mana = 1 hit point healed
      const cost = skill.mana_cost?.(user);
      console.assert(cost !== undefined && cost !== 0 && user.mp >= cost);
      if (cost === undefined || user.mp < cost) {
        return () => {
          battle.events.push(new BattleEvent("Not enough mana"));
        };
      }
      const increase = (100 + user.stats.magic) / 100;
      const boost = user.get_boost(skill);
      const healing = Math.floor(increase * cost * boost);
      return () => {
        battle.events.push(
          new BattleEvent(`${user.name} restored ${healing} health.`, () => {
            user.hp += healing;
            user.mp -= cost;
          }),
        );
      };
    },
  },
  "Nourish": {
    "description": "Heal over time",
    "keywords": ["healing", "buff", "hot", "skill"],
    "mana_cost": (user: Creature) => {
      return 1 + Math.floor(user.stats.max_mp / 6);
    },
    "skill": (
      user: Creature,
      _target: Creature,
      battle: Battle,
      skill: NamedUpgrade,
    ) => {
      const cost = skill.mana_cost?.(user);
      console.assert(cost !== undefined && cost !== 0 && user.mp >= cost);
      if (cost === undefined || user.mp < cost) {
        return () => {
          battle.events.push(new BattleEvent("Not enough mana"));
        };
      }
      const increase = (100 + 2 * user.stats.magic) / 100;
      const boost = user.get_boost(skill);
      const healing = Math.floor(increase * cost * boost / 5);

      const has_buff = user.has_effect("Nourish");
      return () => {
        if (has_buff) {
          battle.events.push(
            new BattleEvent(`${user.name} already has Nourish.`),
          );
          return;
        }
        user.mp -= cost;
        battle.events.push(
          new BattleEvent(`${user.name} received Nourish.`),
        );
        user.add_effect(
          new Effect("Nourish", 5, () => {
          }, () => {
            const msg = `Nourish healed ${user.name}.`;
            return [
              new BattleEvent(msg, () => {
                user.apply_healing(healing);
              }),
            ];
          }),
        );
      };
    },
  },
  // Other skills:
  "Rend": {
    "description": "Causes enemy to bleed",
    "skill": (
      user: Creature,
      target: Creature,
      battle: Battle,
      _skill: NamedUpgrade,
    ) => {
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
          return;
        }
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
      };
    },
  },
  "Might": {
    "description": "+5 strength for 5 turns",
    "skill": (
      user: Creature,
      _target: Creature,
      battle: Battle,
      _skill: NamedUpgrade,
    ) => {
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
            user.stats.strength += 5;
          }),
        );
      };
    },
  },
  "Fireball": {
    "description": "Damage and burn the enemy",
    "mana_cost": (user: Creature) => {
      return 2 + Math.floor(user.stats.magic / 2);
    },
    "skill": (
      user: Creature,
      target: Creature,
      battle: Battle,
      skill: NamedUpgrade,
    ) => {
      // Same damage calc as Attack, but slightly better
      // Mana cost should balance it out
      // Burn is 10% of damage dealt
      const cost = skill.mana_cost?.(user);
      console.assert(cost !== undefined && cost !== 0 && user.mp >= cost);
      if (cost === undefined || user.mp < cost) {
        return () => {
          battle.events.push(new BattleEvent("Not enough mana"));
        };
      }
      const dmg = damage(user.stats.magic, target.stats.magic, 6, 2);
      const burn_dmg = Math.floor(dmg / 10);
      const has_burn = target.has_effect("Burn");
      return () => {
        target.apply_damage(dmg);
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
  "Pact": {
    "description": "Sacrifice blood to damage everyone",
    "eligible": (creature: Creature) => {
      return creature.get_skill_names().length >= 4;
    },
    "skill": (
      user: Creature,
      target: Creature,
      battle: Battle,
      _skill: NamedUpgrade,
    ) => {
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
  // Passives:
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
    "keywords": ["permanent"],
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
    "keywords": ["permanent"],
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
    "description": "5% more experience",
    "max": 2,
    "passive": (creature: Creature) => {
      creature.stats.increased_xp += 5;
    },
    "minimum_level": 6,
  },
  "Permagrowth": {
    "description": "3% more experience",
    "keywords": ["permanent"],
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
    "description": "Max HP +10",
    "max": 99,
    "passive": (creature: Creature) => {
      creature.stats.max_hp += 10;
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
  // Classes:
  "Warrior": {
    "description": "2x strength, 0.5x magic",
    "keywords": ["class"],
    "minimum_level": 10,
    "passive": (creature: Creature) => {
      creature.stats.strength *= 2;
      creature.stats.magic = Math.floor(creature.stats.magic / 2);
    },
    "eligible": (creature: Creature) => {
      return creature.get_upgrades_by_keyword("class").length === 0;
    },
  },
  "Monk": {
    "description": "+1 to all stats",
    "keywords": ["class"],
    "minimum_level": 10,
    "passive": (creature: Creature) => {
      creature.stats.strength += 1;
      creature.stats.magic += 1;
      creature.stats.speed += 1;
      creature.stats.light += 1;
      creature.stats.movement_speed += 1;
      creature.stats.max_hp += 1;
      creature.stats.max_mp += 1;
    },
    "eligible": (creature: Creature) => {
      return creature.get_upgrades_by_keyword("class").length === 0;
    },
  },
  "Mage": {
    "description": "2x magic, 0.5x strength",
    "keywords": ["class"],
    "minimum_level": 10,
    "passive": (creature: Creature) => {
      creature.stats.magic *= 2;
      creature.stats.strength = Math.floor(creature.stats.strength / 2);
    },
    "eligible": (creature: Creature) => {
      return creature.get_upgrades_by_keyword("class").length === 0;
    },
  },
  "Priest": {
    "description": "2x healing, 0.5x strength",
    "keywords": ["class"],
    "minimum_level": 10,
    "passive": (creature: Creature) => {
      creature.stats.strength = Math.floor(creature.stats.strength / 2);
    },
    "boost": (skill: NamedUpgrade): number => {
      if (has_keyword(skill, "healing")) {
        return 100;
      }
      return 0;
    },
    "eligible": (creature: Creature) => {
      return creature.get_upgrades_by_keyword("class").length === 0;
    },
  },
  // Run is always last
  "Run": {
    "description": "Escape battle",
    "skill": (
      user: Creature,
      _target: Creature,
      _battle: Battle,
      _skill: NamedUpgrade,
    ) => {
      // Run from battle, getting 0 xp.
      // If lower speed, enemy can attack and kill you first.
      return () => {
        user.run = true;
      };
    },
  },
} as const;

export type UpgradeName = keyof typeof _all_upgrades;

export const all_upgrades: Record<UpgradeName, Upgrade> = _all_upgrades;

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

  if (upgrade.unobtainable === true) {
    return false;
  }

  if (upgrade.skill !== undefined && player.get_skill_names().length === 8) {
    return false;
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
    return _is_available(get_upgrade(k), player);
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
      if (_is_available(get_upgrade(name), player)) {
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
      sorted.push(get_upgrade(<UpgradeName> name));
    }
  }

  return sorted;
}

export function has_keyword(upgrade: NamedUpgrade, keyword: Keyword) {
  if (upgrade.keywords === undefined) {
    return false;
  }
  if (keyword === "skill" && upgrade.skill !== undefined) {
    return true; // Implicit
  }
  return upgrade.keywords.includes(keyword);
}

export function is_permanent(upgrade: NamedUpgrade) {
  return has_keyword(upgrade, "permanent");
}

export function get_upgrade(name: UpgradeName): NamedUpgrade {
  const obj: NamedUpgrade = { name: name, ...all_upgrades[name] };
  let description = obj.description;
  if (is_permanent(obj)) {
    description += " (Permanent)";
  } else if (has_keyword(obj, "skill")) {
    description += " (Skill)";
  }

  obj.description = text_wrap(description, 11);
  return obj;
}

export function get_skill(name: UpgradeName): SkillPerform {
  const upgrade = { name: name, ...all_upgrades[name] };
  console.assert(upgrade.skill !== undefined);
  return <SkillPerform> upgrade.skill;
}
