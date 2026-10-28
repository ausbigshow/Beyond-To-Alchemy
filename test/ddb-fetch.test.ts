/**
 * @jest-environment jsdom
 */

import { afterEach, describe, expect, jest, test } from '@jest/globals';
import {
    collectCharacterIds,
    fetchCharacter,
    getAuthHeaders,
} from '../src/ddb-fetch';

describe('collectCharacterIds', () => {
    test('extracts unique character ids in page order and ignores non-character links', () => {
        const html = `
            <div>
                <a href="/characters/101">Character 101</a>
                <a href="https://www.dndbeyond.com/characters/202/edit">Character 202</a>
                <a href="/characters/101">Duplicate 101</a>
                <a href="https://www.dndbeyond.com/campaigns/555">Campaign link</a>
                <a href="/spells/fireball">Spell link</a>
                <a href="/characters/303">Character 303</a>
            </div>
        `;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        expect(collectCharacterIds(doc)).toEqual(['101', '202', '303']);
    });
});

describe('fetchCharacter', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
    });

    test('ok path fetches character and appends subclass always-prepared spells', async () => {
        const mockCharacter = {
            id: 12345,
            name: 'Test Hero',
            classes: [
                {
                    level: 3,
                    subclassDefinition: { id: 987 },
                },
            ],
            campaign: { id: 555 },
            classSpells: [],
        };

        const mockSpells = [
            { id: 1, name: 'Always Prepared Spell 1' },
            { id: 2, name: 'Always Prepared Spell 2' },
        ];

        global.fetch = jest.fn(async (url: any) => {
            const urlStr = String(url);
            if (urlStr.includes('/character/v5/character/12345')) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ data: mockCharacter }),
                };
            }
            if (urlStr.includes('/always-prepared-spells')) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ data: mockSpells }),
                };
            }
            throw new Error(`Unexpected URL: ${urlStr}`);
        }) as any;

        const char = await fetchCharacter('12345', {
            Authorization: 'Bearer test-token',
        });

        expect(char.name).toBe('Test Hero');
        expect(char.classSpells).toEqual([
            {
                entityTypeId: 0,
                characterClassId: 987,
                spells: mockSpells,
            },
        ]);
    });

    test('403 path throws an error containing 403', async () => {
        global.fetch = jest.fn(async () => ({
            ok: false,
            status: 403,
            json: async () => ({ error: 'Forbidden' }),
        })) as any;

        await expect(fetchCharacter('12345', {})).rejects.toThrow(/403/);
    });
});

describe('getAuthHeaders', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
    });

    test('returns Authorization header when token is present', async () => {
        global.fetch = jest.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({ token: 'mock-token-abc' }),
        })) as any;

        const headers = await getAuthHeaders();
        expect(headers).toEqual({ Authorization: 'Bearer mock-token-abc' });
    });

    test('returns empty object on network failure', async () => {
        global.fetch = jest.fn(async () => {
            throw new Error('network down');
        }) as any;

        const headers = await getAuthHeaders();
        expect(headers).toEqual({});
    });
});
