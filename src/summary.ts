import { AlchemyCharacter } from './alchemy.d';

export function summaryLines(c: AlchemyCharacter): string[] {
    const items = c.itemsWithActions ?? [];
    return [
        `${c.name}: ${c.race}, ${c.classes
            .map((x) => `${x.class} ${x.level}`)
            .join(' / ')}`,
        `${
            c.textBlocks?.find((t) => t.title === 'Class Features')?.textBlocks
                ?.length ?? 0
        } class/subclass features`,
        `${c.actions?.length ?? 0} actions`,
        `${items.length} items (${
            items.filter((i) => i.actions?.length).length
        } with weapon attacks)`,
        `${c.spells?.length ?? 0} spells`,
        `${c.trackers?.length ?? 0} trackers: ${c.trackers
            ?.map((t) => t.name)
            .join(', ')}`,
    ];
}
