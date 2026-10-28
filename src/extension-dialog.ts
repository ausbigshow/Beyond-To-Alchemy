import { AlchemyCharacter } from './alchemy.d';

export interface CampaignFetchResult {
    id: string;
    character?: AlchemyCharacter;
    error?: string;
}

export interface CampaignFetchSuccess extends CampaignFetchResult {
    character: AlchemyCharacter;
}

export interface CampaignFetchFailure extends CampaignFetchResult {
    error: string;
}

export interface CampaignRowViewModel {
    id: string;
    name: string;
    subtitle: string;
    disabled: boolean;
    checked: boolean;
    error?: string;
    character?: AlchemyCharacter;
}

export function formatCharacterSubtitle(c: AlchemyCharacter): string {
    const classStr = (c.classes || [])
        .map((x) => `${x.class} ${x.level}`)
        .join(' / ');
    const parts = [c.race, classStr].filter(Boolean);
    return parts.join(' ').trim();
}

export function formatSelectionCount(
    selectedCount: number,
    totalCount: number,
): string {
    return `${selectedCount} of ${totalCount} selected`;
}

export function buildCampaignRows(
    results: CampaignFetchResult[],
): CampaignRowViewModel[] {
    return results.map((r) => {
        if (r.character && !r.error) {
            return {
                id: r.id,
                name: r.character.name,
                subtitle: formatCharacterSubtitle(r.character),
                disabled: false,
                checked: true,
                character: r.character,
            };
        }
        return {
            id: r.id,
            name: r.character?.name || `Character ${r.id}`,
            subtitle: r.character ? formatCharacterSubtitle(r.character) : '',
            disabled: true,
            checked: false,
            error: r.error || 'Failed to load',
        };
    });
}
