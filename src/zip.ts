// CRC-32 implementation (IEEE 802.3 polynomial)
const CRC_TABLE: Uint32Array = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[i] = c >>> 0;
    }
    return table;
})();

export function crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileInput {
    name: string;
    data: Uint8Array;
}

export function createZip(files: ZipFileInput[]): Uint8Array {
    const encoder = new TextEncoder();
    const entries = files.map((f) => {
        const nameBytes = encoder.encode(f.name);
        const dataBytes = f.data;
        const crc = crc32(dataBytes);
        return {
            nameBytes,
            data: dataBytes,
            crc,
            size: dataBytes.length,
        };
    });

    // Fixed DOS date & time: 2024-01-01 12:00:00
    // Time: (12 << 11) | (0 << 5) | (0 >> 1) = 0x6000
    // Date: ((2024 - 1980) << 9) | (1 << 5) | 1 = 0x5821
    const dosTime = 0x6000;
    const dosDate = 0x5821;

    let totalSize = 0;
    for (const e of entries) {
        totalSize += 30 + e.nameBytes.length + e.size; // Local file header + data
        totalSize += 46 + e.nameBytes.length; // Central directory header
    }
    totalSize += 22; // End of central directory record

    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);

    let offset = 0;
    const localOffsets: number[] = [];

    // Write local file headers and file data
    for (const e of entries) {
        localOffsets.push(offset);

        // 0x04034b50: Local file header signature
        view.setUint32(offset, 0x04034b50, true);
        view.setUint16(offset + 4, 20, true); // Version needed to extract (2.0)
        view.setUint16(offset + 6, 0x0800, true); // General purpose bit flag (bit 11 = UTF-8)
        view.setUint16(offset + 8, 0, true); // Compression method (0 = STORE)
        view.setUint16(offset + 10, dosTime, true);
        view.setUint16(offset + 12, dosDate, true);
        view.setUint32(offset + 14, e.crc, true);
        view.setUint32(offset + 18, e.size, true); // Compressed size
        view.setUint32(offset + 22, e.size, true); // Uncompressed size
        view.setUint16(offset + 26, e.nameBytes.length, true);
        view.setUint16(offset + 28, 0, true); // Extra field length
        offset += 30;

        buffer.set(e.nameBytes, offset);
        offset += e.nameBytes.length;

        buffer.set(e.data, offset);
        offset += e.size;
    }

    const cdOffset = offset;

    // Write central directory file headers
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const localOffset = localOffsets[i];

        // 0x02014b50: Central directory header signature
        view.setUint32(offset, 0x02014b50, true);
        view.setUint16(offset + 4, 20, true); // Version made by (2.0)
        view.setUint16(offset + 6, 20, true); // Version needed to extract (2.0)
        view.setUint16(offset + 8, 0x0800, true); // General purpose bit flag (bit 11 = UTF-8)
        view.setUint16(offset + 10, 0, true); // Compression method (0 = STORE)
        view.setUint16(offset + 12, dosTime, true);
        view.setUint16(offset + 14, dosDate, true);
        view.setUint32(offset + 16, e.crc, true);
        view.setUint32(offset + 20, e.size, true); // Compressed size
        view.setUint32(offset + 24, e.size, true); // Uncompressed size
        view.setUint16(offset + 28, e.nameBytes.length, true);
        view.setUint16(offset + 30, 0, true); // Extra field length
        view.setUint16(offset + 32, 0, true); // Comment length
        view.setUint16(offset + 34, 0, true); // Disk number start
        view.setUint16(offset + 36, 0, true); // Internal file attributes
        view.setUint32(offset + 38, 0, true); // External file attributes
        view.setUint32(offset + 42, localOffset, true); // Relative offset of local header
        offset += 46;

        buffer.set(e.nameBytes, offset);
        offset += e.nameBytes.length;
    }

    const cdSize = offset - cdOffset;

    // Write End of Central Directory (EOCD) record
    // 0x06054b50: EOCD signature
    view.setUint32(offset, 0x06054b50, true);
    view.setUint16(offset + 4, 0, true); // Number of this disk
    view.setUint16(offset + 6, 0, true); // Disk where central directory starts
    view.setUint16(offset + 8, entries.length, true); // Number of central directory records on this disk
    view.setUint16(offset + 10, entries.length, true); // Total number of central directory records
    view.setUint32(offset + 12, cdSize, true); // Size of central directory
    view.setUint32(offset + 16, cdOffset, true); // Offset of start of central directory
    view.setUint16(offset + 20, 0, true); // Comment length

    return buffer;
}
