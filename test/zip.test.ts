/**
 * @jest-environment jsdom
 */

import { describe, expect, test } from '@jest/globals';
import {
    TextDecoder as NodeTextDecoder,
    TextEncoder as NodeTextEncoder,
} from 'util';
import { crc32, createZip } from '../src/zip';

if (typeof globalThis.TextEncoder === 'undefined') {
    (globalThis as any).TextEncoder = NodeTextEncoder;
    (globalThis as any).TextDecoder = NodeTextDecoder;
}

interface ParsedZipEntry {
    name: string;
    data: Uint8Array;
}

function parseZip(zipBytes: Uint8Array): ParsedZipEntry[] {
    const view = new DataView(
        zipBytes.buffer,
        zipBytes.byteOffset,
        zipBytes.byteLength,
    );
    const eocdOffset = zipBytes.length - 22;
    if (view.getUint32(eocdOffset, true) !== 0x06054b50) {
        throw new Error('EOCD signature not found');
    }
    const totalEntries = view.getUint16(eocdOffset + 10, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);

    const entries: ParsedZipEntry[] = [];
    let curCd = cdOffset;
    const decoder = new TextDecoder();

    for (let i = 0; i < totalEntries; i++) {
        if (view.getUint32(curCd, true) !== 0x02014b50) {
            throw new Error(
                `Central directory signature not found at ${curCd}`,
            );
        }
        const compressedSize = view.getUint32(curCd + 20, true);
        const nameLen = view.getUint16(curCd + 28, true);
        const extraLen = view.getUint16(curCd + 30, true);
        const commentLen = view.getUint16(curCd + 32, true);
        const localOffset = view.getUint32(curCd + 42, true);

        const nameBytes = zipBytes.subarray(curCd + 46, curCd + 46 + nameLen);
        const name = decoder.decode(nameBytes);

        if (view.getUint32(localOffset, true) !== 0x04034b50) {
            throw new Error(
                `Local file header signature not found at ${localOffset}`,
            );
        }
        const localNameLen = view.getUint16(localOffset + 26, true);
        const localExtraLen = view.getUint16(localOffset + 28, true);
        const dataStart = localOffset + 30 + localNameLen + localExtraLen;
        const data = zipBytes.subarray(dataStart, dataStart + compressedSize);

        entries.push({ name, data });
        curCd += 46 + nameLen + extraLen + commentLen;
    }

    return entries;
}

describe('zip', () => {
    test('crc32 of ASCII bytes "123456789" equals 0xCBF43926', () => {
        const input = new TextEncoder().encode('123456789');
        expect(crc32(input)).toBe(0xcbf43926);
    });

    test('createZip with two files produces valid archive and roundtrips', () => {
        const file1 = {
            name: 'Nakudama - Alchemy.json',
            data: new Uint8Array(
                new TextEncoder().encode(
                    JSON.stringify({ name: 'Nakudama', level: 3 }),
                ),
            ),
        };
        const file2 = {
            name: 'Ignis - Alchemy.json',
            data: new Uint8Array(
                new TextEncoder().encode(
                    JSON.stringify({ name: 'Ignis', level: 5 }),
                ),
            ),
        };

        const zipBytes = createZip([file1, file2]);

        // Starts with 0x50 0x4B 0x03 0x04 (local file header signature)
        expect(zipBytes[0]).toBe(0x50);
        expect(zipBytes[1]).toBe(0x4b);
        expect(zipBytes[2]).toBe(0x03);
        expect(zipBytes[3]).toBe(0x04);

        // Contains both file names
        const zipString = new TextDecoder().decode(zipBytes);
        expect(zipString).toContain(file1.name);
        expect(zipString).toContain(file2.name);

        // Ends with an EOCD record whose entry count is 2
        const view = new DataView(
            zipBytes.buffer,
            zipBytes.byteOffset,
            zipBytes.byteLength,
        );
        const eocdOffset = zipBytes.length - 22;
        expect(view.getUint32(eocdOffset, true)).toBe(0x06054b50);
        expect(view.getUint16(eocdOffset + 8, true)).toBe(2);
        expect(view.getUint16(eocdOffset + 10, true)).toBe(2);

        // Parse central directory and verify file content matches input
        const parsed = parseZip(zipBytes);
        expect(parsed).toHaveLength(2);
        expect(parsed[0].name).toBe(file1.name);
        expect(parsed[0].data).toEqual(file1.data);
        expect(parsed[1].name).toBe(file2.name);
        expect(parsed[1].data).toEqual(file2.data);
    });
});
