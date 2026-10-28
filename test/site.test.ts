/**
 * @jest-environment jsdom
 */

import { describe, expect, test } from '@jest/globals';
import { parseCharacterId } from '../src/site';

describe('share link parsing', () => {
    test.each([
        ['https://www.dndbeyond.com/characters/123456789/AbCdEf', '123456789'],
        ['https://www.dndbeyond.com/characters/123456789', '123456789'],
        ['dndbeyond.com/characters/123456789/AbCdEf ', '123456789'],
        ['123456789', '123456789'],
    ])('reads the id from %s', (input, id) => {
        expect(parseCharacterId(input)).toBe(id);
    });

    test('rejects other text', () => {
        expect(parseCharacterId('https://www.dndbeyond.com/monsters/1')).toBe(
            null,
        );
    });
});
