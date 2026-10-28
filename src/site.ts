import { AlchemyCharacter } from './alchemy.d';
import { convertCharacter } from './convert';
import { summaryLines } from './summary';

// Accepts a share link (dndbeyond.com/characters/123/abc), a sheet URL or a bare id
export const parseCharacterId = (input: string): string | null =>
    input.trim().match(/characters\/(\d+)/)?.[1] ??
    input.trim().match(/^(\d+)$/)?.[1] ??
    null;

async function convertLink(event: SubmitEvent) {
    event.preventDefault();
    const input = document.getElementById('link') as HTMLInputElement;
    const id = parseCharacterId(input.value);
    if (!id)
        return showError('That doesn’t look like a D&D Beyond character link.');

    showStatus('Fetching character from D&D Beyond…');
    try {
        const response = await fetch(`/api/character/${id}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        convertAndDownload(body);
    } catch (e) {
        showError(
            `Couldn’t load that character (${e.message}). In D&D Beyond, set the character's Privacy to Public, then try again.`,
        );
    }
}

function convertUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files[0];
    if (!file) return;
    file.text().then((text) => {
        const parsed = JSON.parse(text);
        // accept both the bookmarklet file and a raw API response ({ data: ... })
        convertAndDownload(parsed.data ?? parsed);
    });
}

function convertAndDownload(ddbCharacter): void {
    const converted = convertCharacter(ddbCharacter);
    showSummary(converted);
    download(`${ddbCharacter.name} - Alchemy.json`, JSON.stringify(converted));
}

function showStatus(text: string, isError = false): void {
    const status = document.getElementById('status');
    status.textContent = text;
    status.classList.toggle('error', isError);
    document.getElementById('summary').replaceChildren();
}

const showError = (text: string) => showStatus(text, true);

function showSummary(c: AlchemyCharacter): void {
    showStatus(
        `Downloaded “${c.name} - Alchemy.json”. In Alchemy: Library → Characters → Create → Import.`,
    );
    const lines = summaryLines(c);
    const list = document.getElementById('summary');
    list.replaceChildren(
        ...lines.map((line) => {
            const li = document.createElement('li');
            li.textContent = line;
            return li;
        }),
    );
}

function download(filename: string, contents: string): void {
    const element = document.createElement('a');
    element.setAttribute(
        'href',
        'data:application/json;charset=utf-8,' + encodeURIComponent(contents),
    );
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function main() {
    document.getElementById('form').addEventListener('submit', convertLink);
    document.getElementById('upload').addEventListener('change', convertUpload);
}

if (typeof document !== 'undefined')
    document.addEventListener('DOMContentLoaded', main);
