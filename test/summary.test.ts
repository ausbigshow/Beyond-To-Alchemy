/**
 * @jest-environment jsdom
 */

import { describe, expect, test } from '@jest/globals';
import * as ignis from './fixtures/ignis-ddb.json';
import { convertCharacter } from '../src/convert';
import { summaryLines } from '../src/summary';

describe('summaryLines', () => {
    test('produces expected summary lines for the test Rogue', () => {
        const character = JSON.parse(JSON.stringify(ignis));
        const converted = convertCharacter(character);
        const lines = summaryLines(converted);

        expect(lines).toContain('Test Rogue: Nakudama, Rogue 3');
        expect(lines).toContain('3 trackers: XP, HP, Wick Points');
    });
});
