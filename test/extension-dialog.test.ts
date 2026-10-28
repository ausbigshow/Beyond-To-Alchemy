/**
 * @jest-environment jsdom
 */

import { describe, expect, test } from '@jest/globals';
import { AlchemyCharacter } from '../src/alchemy.d';
import {
    buildCampaignRows,
    formatCharacterSubtitle,
    formatSelectionCount,
} from '../src/extension-dialog';

describe('formatCharacterSubtitle', () => {
    test('formats race, class and level as "Race Class Level"', () => {
        const char = {
            race: 'Nakudama',
            classes: [{ class: 'Rogue', level: 3 }],
        } as AlchemyCharacter;
        expect(formatCharacterSubtitle(char)).toBe('Nakudama Rogue 3');
    });

    test('formats multiclass characters', () => {
        const char = {
            race: 'Elf',
            classes: [
                { class: 'Rogue', level: 3 },
                { class: 'Fighter', level: 1 },
            ],
        } as AlchemyCharacter;
        expect(formatCharacterSubtitle(char)).toBe('Elf Rogue 3 / Fighter 1');
    });

    test('handles missing race', () => {
        const char = {
            race: '',
            classes: [{ class: 'Wizard', level: 5 }],
        } as AlchemyCharacter;
        expect(formatCharacterSubtitle(char)).toBe('Wizard 5');
    });

    test('handles missing classes', () => {
        const char = {
            race: 'Human',
            classes: [],
        } as AlchemyCharacter;
        expect(formatCharacterSubtitle(char)).toBe('Human');
    });
});

describe('formatSelectionCount', () => {
    test('formats selected vs total count', () => {
        expect(formatSelectionCount(4, 6)).toBe('4 of 6 selected');
        expect(formatSelectionCount(0, 6)).toBe('0 of 6 selected');
    });
});

describe('buildCampaignRows', () => {
    test('converts fetch results into row view models with correct enabled and disabled states', () => {
        const charA = {
            name: 'Nakudama',
            race: 'Nakudama',
            classes: [{ class: 'Rogue', level: 3 }],
        } as AlchemyCharacter;

        const charB = {
            name: 'Ignis',
            race: 'Tiefling',
            classes: [{ class: 'Sorcerer', level: 5 }],
        } as AlchemyCharacter;

        const results = [
            { id: '101', character: charA },
            { id: '102', error: '403: not visible to you' },
            { id: '103', character: charB },
            { id: '104', error: 'D&D Beyond returned 500' },
        ];

        const rows = buildCampaignRows(results);
        expect(rows).toHaveLength(4);

        expect(rows[0]).toEqual({
            id: '101',
            name: 'Nakudama',
            subtitle: 'Nakudama Rogue 3',
            disabled: false,
            checked: true,
            character: charA,
            error: undefined,
        });

        expect(rows[1]).toEqual({
            id: '102',
            name: 'Character 102',
            subtitle: '',
            disabled: true,
            checked: false,
            character: undefined,
            error: '403: not visible to you',
        });

        expect(rows[2]).toEqual({
            id: '103',
            name: 'Ignis',
            subtitle: 'Tiefling Sorcerer 5',
            disabled: false,
            checked: true,
            character: charB,
            error: undefined,
        });

        expect(rows[3]).toEqual({
            id: '104',
            name: 'Character 104',
            subtitle: '',
            disabled: true,
            checked: false,
            character: undefined,
            error: 'D&D Beyond returned 500',
        });
    });
});
