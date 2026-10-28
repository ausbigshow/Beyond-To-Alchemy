const CHARACTER_API =
    'https://character-service.dndbeyond.com/character/v5/character';
const GAME_DATA_API =
    'https://character-service.dndbeyond.com/character/v5/game-data';
const TOKEN_API = 'https://auth-service.dndbeyond.com/v1/cobalt-token';

export async function getAuthHeaders(): Promise<Record<string, string>> {
    try {
        const response = await fetch(TOKEN_API, {
            method: 'POST',
            credentials: 'include',
        });
        if (!response.ok) return {};
        const data = await response.json();
        const token = data?.token;
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
        return {};
    }
}

export async function fetchCharacter(
    id: string,
    headers: Record<string, string> = {},
): Promise<any> {
    const response = await fetch(
        `${CHARACTER_API}/${id}?includeCustomItems=true`,
        { headers },
    );
    if (!response.ok) {
        if (response.status === 403) {
            throw new Error('403: not visible to you');
        }
        throw new Error(`D&D Beyond returned ${response.status}`);
    }
    const { data: char } = await response.json();
    if (!char) {
        throw new Error('Character not found');
    }

    for (const { level, subclassDefinition } of char.classes || []) {
        if (!subclassDefinition) continue;

        try {
            const resp = await fetch(
                `${GAME_DATA_API}/always-prepared-spells?classLevel=${level}&classId=${
                    subclassDefinition.id
                }&campaign=${char.campaign ? char.campaign.id : undefined}`,
                { headers },
            );
            if (resp.ok) {
                const { data: spells } = await resp.json();
                if (spells && spells.length !== 0) {
                    if (!char.classSpells) {
                        char.classSpells = [];
                    }
                    char.classSpells.push({
                        entityTypeId: 0,
                        characterClassId: subclassDefinition.id,
                        spells,
                    });
                }
            }
        } catch {
            // ignore failures of that sub-request
        }
    }

    return char;
}

export function collectCharacterIds(doc: Document): string[] {
    const ids: string[] = [];
    const seen = new Set<string>();
    const links = doc.querySelectorAll('a');
    for (const link of Array.from(links)) {
        const href =
            link.getAttribute('href') ??
            (typeof link.href === 'string' ? link.href : '');
        const match = href.match(/\/characters\/(\d+)/);
        if (match && match[1]) {
            const id = match[1];
            if (!seen.has(id)) {
                seen.add(id);
                ids.push(id);
            }
        }
    }
    return ids;
}
