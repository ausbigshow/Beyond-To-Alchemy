/**
 * @jest-environment jsdom
 */

import { describe, expect, test } from '@jest/globals';
import * as ignis from './fixtures/ignis-ddb.json';
import { convertCharacter } from '../src';

// Level 3 Rogue with a homebrew subclass (Waxwork Rogue), class actions and a limited-use pool
const character = JSON.parse(JSON.stringify(ignis));
const converted = convertCharacter(character);
const features = converted.textBlocks
    .find((t) => t.title === 'Class Features')
    .textBlocks.map((t) => t.title);

describe('homebrew-heavy character (Waxwork Rogue)', () => {
    test('only includes class features up to the character level', () => {
        expect(features).toContain('Sneak Attack');
        expect(features).toContain('Cunning Action');
        expect(features).not.toContain('Reliable Talent');
        expect(features).not.toContain('Stroke of Luck');
        expect(features).not.toContain('Ability Score Improvement');
    });

    test('includes the homebrew subclass and its features', () => {
        expect(features).toContain('Waxwork Rogue (Rogue subclass)');
        expect(features).toContain('Wax Enchantments');
        expect(features).not.toContain('Burn Cycle'); // level 9
    });

    test('appends chosen options to the feature that grants them', () => {
        const all = converted.textBlocks
            .find((t) => t.title === 'Class Features')
            .textBlocks.map((t) => t.body)
            .join('\n');
        expect(all).toContain('**Chosen: Candle Pop.**');
    });

    test('converts class actions with damage and saves', () => {
        const whip = converted.actions.find((a) => a.name === 'Wick Whip');
        expect(whip.steps[0].attack.rollsAttack).toBe(true);
        expect(whip.steps[0].attack.damageRolls).toEqual([
            { dice: '3d4', type: 'Fire', abilityName: 'dex' },
        ]);

        const pop = converted.actions.find((a) => a.name === 'Candle Pop');
        expect(pop.steps[0].attack.savingThrow.abilityName).toBe('dex');
        expect(pop.steps[0].attack.actionType).toBe('Bonus Action');
        expect(pop.description).not.toContain('{{');
    });

    test('uses the finesse ability on attack actions', () => {
        const whip = converted.actions.find((a) => a.name === 'Wick Whip');
        expect(whip.steps[0].attack.ability).toBe('dex');
    });

    test('treats Sneak Attack as extra damage, not an attack roll', () => {
        const sneak = converted.actions.find((a) => a.name === 'Sneak Attack');
        expect(sneak.steps[0].attack.rollsAttack).toBe(false);
        expect(sneak.steps[0].attack.ability).toBeUndefined();
    });

    test('adds an Unarmed Strike action', () => {
        const unarmed = converted.actions[0];
        expect(unarmed.name).toBe('Unarmed Strike');
        expect(unarmed.steps[0].attack.damageRolls[0]).toEqual({
            dice: '1d1',
            type: 'Bludgeoning',
            abilityName: 'str',
        });
    });

    test('leaves no DDB placeholders or markup tags in the text', () => {
        const text = JSON.stringify(converted);
        expect(text).not.toMatch(/\{\{/);
        expect(text).not.toMatch(/\[\/?condition\]/);
        expect(text).not.toContain('scalevalue');
        expect(text).toContain('**1d4 + 4** Bludgeoning'); // Maker's Mark option
        expect(text).toContain('Enchantment Save DC: 14');
    });

    test('turns limited-use pools into pip trackers, not actions', () => {
        const wick = converted.trackers.find((t) => t.name === 'Wick Points');
        expect(wick).toMatchObject({ max: 3, value: 3, type: 'Pip' });
        expect(
            converted.actions.find((a) => a.name.includes('Wick Points')),
        ).toBeUndefined();
    });

    test('gives weapons an attack action', () => {
        const sword = converted.itemsWithActions.find(
            (i) => i.item.name === 'Shortsword',
        );
        const attack = sword.actions[0].steps[0].attack;
        expect(attack.isProficient).toBe(true);
        expect(attack.isRanged).toBe(false);
        expect(attack.damageRolls[0]).toMatchObject({
            dice: '1d6',
            type: 'Piercing',
        });
        const bow = converted.itemsWithActions.find(
            (i) => i.item.name === 'Shortbow',
        );
        expect(bow.actions[0].steps[0].attack.isRanged).toBe(true);
        expect(attack.ability).toBe('dex'); // finesse, DEX > STR
        expect(bow.actions[0].steps[0].attack).toMatchObject({
            ability: 'dex',
            range: 80,
            longRange: 320,
        });
        const rope = converted.itemsWithActions.find((i) =>
            i.item.name.startsWith('Rope'),
        );
        expect(rope.actions).toEqual([]);
    });

    test('includes DDB custom items', () => {
        const withCustom = convertCharacter({
            ...character,
            customItems: [
                { name: 'Fishfins', description: '40 ft. swim', quantity: 1 },
            ],
        });
        expect(
            withCustom.itemsWithActions.find((i) => i.item.name === 'Fishfins')
                .item,
        ).toMatchObject({ quantity: 1, description: '40 ft. swim' });
    });

    test('applies natural armor like a Tortle shell', () => {
        const tortle = convertCharacter({
            ...character,
            modifiers: {
                ...character.modifiers,
                natural: [
                    {
                        type: 'set',
                        subType: 'unarmored-armor-class',
                        value: 7,
                    },
                    { type: 'ignore', subType: 'unarmored-dex-ac-bonus' },
                ],
            },
        });
        expect(tortle.armorClass).toBe(17); // 10 + 7, no DEX
        expect(converted.armorClass).toBe(14); // unchanged without it: 10 + DEX 4
    });

    test('applies stat overrides and custom speeds', () => {
        const custom = convertCharacter({
            ...character,
            overrideStats: [{ id: 1, value: 19 }],
            customSpeeds: [{ movementId: 5, distance: 40 }],
        });
        expect(custom.abilityScores.find((s) => s.name === 'str').value).toBe(
            19,
        );
        expect(custom.movementModes).toContainEqual({
            mode: 'Swim',
            distance: 40,
        });
    });
});
