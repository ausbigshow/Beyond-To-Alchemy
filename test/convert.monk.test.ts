/**
 * @jest-environment jsdom
 */

import { describe, expect, test } from '@jest/globals';
import * as monk2014 from './fixtures/monk-2014-ddb.json';
import * as monk2024 from './fixtures/monk-2024-ddb.json';
import { convertCharacter } from '../src';

describe('Monk martial arts unarmed strikes', () => {
    test('converts 2014 Monk unarmed strike actions', () => {
        const character = JSON.parse(JSON.stringify(monk2014));
        const converted = convertCharacter(character);

        const unarmed = converted.actions.find(
            (a) => a.name === 'Unarmed Strike',
        );
        expect(unarmed).toBeDefined();
        expect(unarmed.steps[0].attack.rollsAttack).toBe(true);
        expect(unarmed.steps[0].attack.damageRolls[0]).toEqual({
            dice: '1d4',
            type: 'Bludgeoning',
            abilityName: 'dex',
        });

        const unarmedDex = converted.actions.find(
            (a) => a.name === 'Unarmed Strike (Dex.)',
        );
        expect(unarmedDex).toBeDefined();
        expect(unarmedDex.steps[0].attack.rollsAttack).toBe(true);
        expect(unarmedDex.steps[0].attack.damageRolls[0]).toEqual({
            dice: '1d4',
            type: 'Bludgeoning',
            abilityName: 'dex',
        });
    });

    test('converts 2024 Monk unarmed strike action', () => {
        const character = JSON.parse(JSON.stringify(monk2024));
        const converted = convertCharacter(character);

        const unarmed = converted.actions.find(
            (a) => a.name === 'Unarmed Strike',
        );
        expect(unarmed).toBeDefined();
        expect(unarmed.steps[0].attack.rollsAttack).toBe(true);
        expect(unarmed.steps[0].attack.damageRolls[0]).toEqual({
            dice: '1d6',
            type: 'Bludgeoning',
            abilityName: 'dex',
        });
    });
});
