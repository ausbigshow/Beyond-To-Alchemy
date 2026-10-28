import { describe, expect, test } from '@jest/globals';
import {
    alchemyFileName,
    campaignName,
    campaignZipName,
    deduplicateName,
    safeFileName,
} from '../src/files';

describe('safeFileName', () => {
    test.each([
        ['Dipsy ', 'Dipsy'],
        ["Cinn'o Mahn ", "Cinn'o Mahn"],
        ['a/b:c', 'abc'],
        ['valid-name_123', 'valid-name_123'],
        ['forbidden/\\:*?"<>|chars', 'forbiddenchars'],
        ['trailing dots...', 'trailing dots'],
        ['trailing dot and spaces.  ', 'trailing dot and spaces'],
        ['trailing space and dot .', 'trailing space and dot'],
        ['', ''],
    ])('sanitizes %j to %j', (input, expected) => {
        expect(safeFileName(input)).toBe(expected);
    });
});

describe('duplicate naming helper', () => {
    test('appends (2) and (3) on duplicate names', () => {
        const used = new Set<string>();
        expect(deduplicateName('Nakudama', used)).toBe('Nakudama');
        expect(deduplicateName('Nakudama', used)).toBe('Nakudama (2)');
        expect(deduplicateName('Nakudama', used)).toBe('Nakudama (3)');
        expect(deduplicateName('Other', used)).toBe('Other');
    });

    test('alchemyFileName sanitizes and resolves duplicates', () => {
        const used = new Set<string>();
        expect(alchemyFileName('Dipsy ', used)).toBe('Dipsy - Alchemy.json');
        expect(alchemyFileName('Dipsy ', used)).toBe(
            'Dipsy (2) - Alchemy.json',
        );
        expect(alchemyFileName('a/b:c', used)).toBe('abc - Alchemy.json');
    });
});

describe('campaign naming helpers', () => {
    test('extracts and sanitizes campaign name from title', () => {
        expect(campaignName('Obojima - Campaigns - D&D Beyond')).toBe(
            'Obojima',
        );
        expect(campaignName('A/B: Test - Campaigns - D&D Beyond')).toBe(
            'AB Test',
        );
        expect(campaignName('')).toBe('Campaign');
    });

    test('campaignZipName formats zip file name', () => {
        expect(campaignZipName('Obojima - Campaigns - D&D Beyond')).toBe(
            'Obojima-Characters-Alchemy.zip',
        );
    });
});
