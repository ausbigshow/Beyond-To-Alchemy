// Strip characters that are invalid in file names, plus trailing spaces/dots ("Dipsy " -> "Dipsy")
export function safeFileName(name: string): string {
    return name.replace(/[/\\:*?"<>|]/g, '').replace(/[. ]+$/, '');
}

// Returns name, or "name (2)", "name (3)"... if already used, and records the result
export function deduplicateName(name: string, usedNames: Set<string>): string {
    let resolved = name;
    for (let count = 2; usedNames.has(resolved); count++) {
        resolved = `${name} (${count})`;
    }
    usedNames.add(resolved);
    return resolved;
}

export function alchemyFileName(
    characterName: string,
    usedNames?: Set<string>,
): string {
    const safe = safeFileName(characterName) || 'Character';
    const base = usedNames ? deduplicateName(safe, usedNames) : safe;
    return `${base} - Alchemy.json`;
}

export function campaignName(title: string): string {
    let raw = '';
    const campIndex = title.indexOf(' - Campaigns');
    if (campIndex !== -1) {
        raw = title.slice(0, campIndex);
    } else {
        const dashIndex = title.indexOf(' - ');
        if (dashIndex !== -1) {
            raw = title.slice(0, dashIndex);
        } else {
            raw = title;
        }
    }
    const safe = safeFileName(raw);
    return safe || 'Campaign';
}

export function campaignZipName(title: string): string {
    return `${campaignName(title)}-Characters-Alchemy.zip`;
}
