import { convertCharacter } from './convert';
import {
    collectCharacterIds,
    fetchCharacter,
    getAuthHeaders,
} from './ddb-fetch';
import {
    CampaignFetchResult,
    buildCampaignRows,
    formatSelectionCount,
} from './extension-dialog';
import { alchemyFileName, campaignZipName } from './files';
import { summaryLines } from './summary';
import { createZip } from './zip';

declare global {
    interface Window {
        __b2a_run_id?: number;
        showSaveFilePicker?: (options?: any) => Promise<any>;
    }
}

function downloadJson(filename: string, data: any): void {
    downloadBlob(
        filename,
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
}

function downloadZip(filename: string, data: Uint8Array): void {
    downloadBlob(filename, new Blob([data], { type: 'application/zip' }));
}

function downloadBlob(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function createButton(text: string, primary = false): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.style.cssText = [
        `background-color: ${primary ? '#2563eb' : '#2b2b36'}`,
        `border: 1px solid ${primary ? '#3b82f6' : '#4a4a58'}`,
        'border-radius: 4px',
        'color: #ffffff',
        'padding: 6px 12px',
        'font-size: 12px',
        'font-family: inherit',
        'font-weight: 500',
        'cursor: pointer',
        'line-height: 1.4',
    ].join('; ');
    btn.addEventListener('mouseenter', () => {
        if (!btn.disabled) {
            btn.style.backgroundColor = primary ? '#1d4ed8' : '#3c3c4a';
        }
    });
    btn.addEventListener('mouseleave', () => {
        if (!btn.disabled) {
            btn.style.backgroundColor = primary ? '#2563eb' : '#2b2b36';
        }
    });
    return btn;
}

function updateButtonDisabled(btn: HTMLButtonElement, disabled: boolean): void {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.5' : '1';
    btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
}

function createLinkButton(text: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.style.cssText = [
        'background: transparent',
        'border: none',
        'color: #8ab4f8',
        'text-decoration: underline',
        'cursor: pointer',
        'padding: 0',
        'font-family: inherit',
        'font-size: 12px',
        'line-height: 1.4',
    ].join('; ');
    btn.addEventListener('mouseenter', () => {
        btn.style.color = '#aecbfa';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.color = '#8ab4f8';
    });
    return btn;
}

function createContainer(titleText: string): {
    container: HTMLDivElement;
    body: HTMLDivElement;
    close: () => void;
} {
    const existing = document.getElementById('b2a-overlay') as
        | (HTMLDivElement & { _cleanup?: () => void })
        | null;
    if (existing) {
        if (typeof existing._cleanup === 'function') {
            existing._cleanup();
        } else {
            existing.remove();
        }
    }

    const container = document.createElement('div') as HTMLDivElement & {
        _cleanup?: () => void;
    };
    container.id = 'b2a-overlay';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-label', titleText);
    container.tabIndex = -1;
    container.style.cssText = [
        'position: fixed',
        'top: 16px',
        'right: 16px',
        'z-index: 2147483647',
        'width: 380px',
        'max-width: calc(100vw - 32px)',
        'max-height: calc(100vh - 32px)',
        'overflow-y: auto',
        'background-color: #1e1e24',
        'color: #f0f0f4',
        'border: 1px solid #4a4a55',
        'border-radius: 8px',
        'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5)',
        'padding: 16px',
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        'font-size: 13px',
        'line-height: 1.4',
        'box-sizing: border-box',
    ].join('; ');

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            close();
        }
    };
    document.addEventListener('keydown', onKeyDown);

    function close() {
        document.removeEventListener('keydown', onKeyDown);
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    }
    container._cleanup = close;

    const header = document.createElement('div');
    header.style.cssText =
        'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;';

    const title = document.createElement('div');
    title.style.cssText =
        'font-weight: 600; font-size: 14px; color: #ffffff; line-height: 1.2;';
    title.textContent = titleText;
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.cssText = [
        'background: transparent',
        'border: none',
        'color: #a0a0a8',
        'font-size: 20px',
        'line-height: 1',
        'cursor: pointer',
        'padding: 0 4px',
        'margin: -4px -4px 0 0',
    ].join('; ');
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.color = '#ffffff';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.color = '#a0a0a8';
    });
    closeBtn.addEventListener('click', close);
    header.appendChild(closeBtn);

    container.appendChild(header);

    const body = document.createElement('div');
    container.appendChild(body);

    document.body.appendChild(container);
    return { container, body, close };
}

async function run(): Promise<void> {
    const runId = (window.__b2a_run_id ?? 0) + 1;
    window.__b2a_run_id = runId;

    const href = window.location.href;
    const charMatch = href.match(/dndbeyond\.com\/characters\/(\d+)/);
    const campMatch = href.match(/dndbeyond\.com\/campaigns\/(\d+)/);

    if (charMatch) {
        const { body, close } = createContainer('D&D Beyond to Alchemy');
        const statusEl = document.createElement('div');
        statusEl.textContent = 'Fetching character from D&D Beyond…';
        body.appendChild(statusEl);

        try {
            const headers = await getAuthHeaders();
            if (window.__b2a_run_id !== runId) return;

            const raw = await fetchCharacter(charMatch[1], headers);
            if (window.__b2a_run_id !== runId) return;

            const converted = convertCharacter(raw);
            body.innerHTML = '';

            const nameEl = document.createElement('div');
            nameEl.style.cssText =
                'font-weight: 600; font-size: 15px; color: #ffffff; margin-bottom: 8px;';
            nameEl.textContent = converted.name;
            body.appendChild(nameEl);

            const lines = summaryLines(converted);
            const ul = document.createElement('ul');
            ul.style.cssText =
                'margin: 0 0 16px 0; padding-left: 20px; color: #d0d0d8; font-size: 12px;';
            for (const line of lines) {
                const li = document.createElement('li');
                li.textContent = line;
                li.style.marginBottom = '2px';
                ul.appendChild(li);
            }
            body.appendChild(ul);

            const buttonRow = document.createElement('div');
            buttonRow.style.cssText =
                'display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 12px;';

            const saveDownloadsBtn = createButton('Save to Downloads', true);
            buttonRow.appendChild(saveDownloadsBtn);

            let savePickerBtn: HTMLButtonElement | null = null;
            if (typeof window.showSaveFilePicker === 'function') {
                savePickerBtn = createButton('Save to another location…');
                buttonRow.appendChild(savePickerBtn);
            }

            const cancelBtn = createButton('Cancel');
            cancelBtn.addEventListener('click', close);
            buttonRow.appendChild(cancelBtn);

            body.appendChild(buttonRow);

            const resultEl = document.createElement('div');
            resultEl.style.cssText =
                'margin-top: 10px; font-size: 12px; min-height: 16px;';
            body.appendChild(resultEl);

            saveDownloadsBtn.addEventListener('click', () => {
                const filename = alchemyFileName(converted.name);
                downloadJson(filename, converted);
                resultEl.textContent = 'Saved ✓ to Downloads';
                resultEl.style.color = '#81c995';
            });

            if (savePickerBtn) {
                savePickerBtn.addEventListener('click', async () => {
                    const filename = alchemyFileName(converted.name);
                    try {
                        const handle = await window.showSaveFilePicker!({
                            suggestedName: filename,
                            types: [
                                {
                                    description: 'Alchemy character',
                                    accept: {
                                        'application/json': ['.json'],
                                    },
                                },
                            ],
                        });
                        const writable = await handle.createWritable();
                        await writable.write(
                            JSON.stringify(converted, null, 2),
                        );
                        await writable.close();
                        resultEl.textContent = `Saved ✓ to ${handle.name}`;
                        resultEl.style.color = '#81c995';
                    } catch (e: any) {
                        if (e.name === 'AbortError') return;
                        resultEl.textContent = `Error: ${e.message}`;
                        resultEl.style.color = '#f28b82';
                    }
                });
            }

            saveDownloadsBtn.focus();
        } catch (e: any) {
            if (window.__b2a_run_id !== runId) return;
            statusEl.textContent = `Error: ${e.message}`;
            statusEl.style.color = '#ff6b6b';
        }
    } else if (campMatch) {
        const charIds = collectCharacterIds(document);
        if (charIds.length === 0) {
            const { body } = createContainer('D&D Beyond to Alchemy');
            body.textContent = 'No characters found on this campaign page.';
            return;
        }

        const { body, close } = createContainer('Campaign Characters');
        const progressEl = document.createElement('div');
        progressEl.style.cssText =
            'color: #9999a4; font-size: 13px; margin-bottom: 8px;';
        progressEl.textContent = `Loading 1 of ${charIds.length}…`;
        body.appendChild(progressEl);

        const results: CampaignFetchResult[] = [];
        const headers = await getAuthHeaders();

        for (let i = 0; i < charIds.length; i++) {
            if (window.__b2a_run_id !== runId) return;
            const id = charIds[i];
            progressEl.textContent = `Loading ${i + 1} of ${charIds.length}…`;

            try {
                const raw = await fetchCharacter(id, headers);
                if (window.__b2a_run_id !== runId) return;

                const converted = convertCharacter(raw);
                results.push({ id, character: converted });
            } catch (e: any) {
                if (window.__b2a_run_id !== runId) return;
                results.push({ id, error: e.message });
            }
        }

        if (window.__b2a_run_id !== runId) return;
        body.innerHTML = '';

        const rowModels = buildCampaignRows(results);

        const toolbar = document.createElement('div');
        toolbar.style.cssText =
            'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 12px;';

        const linksDiv = document.createElement('div');
        linksDiv.style.cssText =
            'display: flex; gap: 8px; align-items: center;';

        const selectAllBtn = createLinkButton('Select all');
        linksDiv.appendChild(selectAllBtn);

        const sep = document.createElement('span');
        sep.textContent = '|';
        sep.style.color = '#555562';
        linksDiv.appendChild(sep);

        const selectNoneBtn = createLinkButton('Select none');
        linksDiv.appendChild(selectNoneBtn);

        toolbar.appendChild(linksDiv);

        const countSpan = document.createElement('span');
        countSpan.style.color = '#9999a4';
        toolbar.appendChild(countSpan);

        body.appendChild(toolbar);

        const listEl = document.createElement('div');
        listEl.style.cssText =
            'display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto; margin-bottom: 12px; padding-right: 4px;';
        body.appendChild(listEl);

        const renderedRows: Array<{
            checkbox: HTMLInputElement;
            resultSpan: HTMLSpanElement;
            character?: any;
        }> = [];

        for (const rowModel of rowModels) {
            const row = document.createElement('div');
            row.style.cssText =
                'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #33333d; padding-bottom: 6px; gap: 8px;';

            const label = document.createElement('label');
            label.style.cssText = [
                'display: flex',
                'align-items: center',
                'gap: 8px',
                `cursor: ${rowModel.disabled ? 'not-allowed' : 'pointer'}`,
                'min-width: 0',
                'flex: 1',
            ].join('; ');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = rowModel.checked;
            checkbox.disabled = rowModel.disabled;
            checkbox.style.cssText = `cursor: ${
                rowModel.disabled ? 'not-allowed' : 'pointer'
            }; flex-shrink: 0;`;
            label.appendChild(checkbox);

            const textDiv = document.createElement('div');
            textDiv.style.cssText =
                'display: flex; flex-direction: column; min-width: 0; overflow: hidden;';

            const nameSpan = document.createElement('span');
            nameSpan.style.cssText = [
                'font-weight: 500',
                `color: ${rowModel.disabled ? '#9999a4' : '#f0f0f4'}`,
                'overflow: hidden',
                'text-overflow: ellipsis',
                'white-space: nowrap',
            ].join('; ');
            nameSpan.textContent = rowModel.name;
            textDiv.appendChild(nameSpan);

            if (rowModel.error) {
                const errSpan = document.createElement('span');
                errSpan.style.cssText =
                    'font-size: 11px; color: #f28b82; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                errSpan.textContent = rowModel.error;
                textDiv.appendChild(errSpan);
            } else if (rowModel.subtitle) {
                const subSpan = document.createElement('span');
                subSpan.style.cssText =
                    'font-size: 11px; color: #9999a4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                subSpan.textContent = rowModel.subtitle;
                textDiv.appendChild(subSpan);
            }

            label.appendChild(textDiv);
            row.appendChild(label);

            const resultSpan = document.createElement('span');
            resultSpan.style.cssText =
                'color: #9999a4; font-size: 12px; margin-left: 8px; white-space: nowrap; flex-shrink: 0;';
            row.appendChild(resultSpan);

            listEl.appendChild(row);
            renderedRows.push({
                checkbox,
                resultSpan,
                character: rowModel.character,
            });
        }

        const buttonRow = document.createElement('div');
        buttonRow.style.cssText =
            'display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 12px;';

        const saveDownloadsBtn = createButton('Save to Downloads', true);
        buttonRow.appendChild(saveDownloadsBtn);

        let savePickerBtn: HTMLButtonElement | null = null;
        if (typeof window.showSaveFilePicker === 'function') {
            savePickerBtn = createButton('Save to another location…');
            buttonRow.appendChild(savePickerBtn);
        }

        const cancelBtn = createButton('Cancel');
        cancelBtn.addEventListener('click', close);
        buttonRow.appendChild(cancelBtn);

        body.appendChild(buttonRow);

        const resultEl = document.createElement('div');
        resultEl.style.cssText =
            'margin-top: 10px; font-size: 12px; min-height: 16px;';
        body.appendChild(resultEl);

        const buildCampaignZip = (): Uint8Array => {
            const usedNames = new Set<string>();
            const files: { name: string; data: Uint8Array }[] = [];
            const encoder = new TextEncoder();
            for (const r of renderedRows) {
                if (!r.checkbox.checked || !r.character) continue;
                const filename = alchemyFileName(r.character.name, usedNames);
                const content = encoder.encode(
                    JSON.stringify(r.character, null, 2),
                );
                files.push({ name: filename, data: content });
            }
            return createZip(files);
        };

        const updateSelection = () => {
            const selected = renderedRows.filter(
                (r) => r.checkbox.checked,
            ).length;
            countSpan.textContent = formatSelectionCount(
                selected,
                rowModels.length,
            );
            const disabled = selected === 0;
            updateButtonDisabled(saveDownloadsBtn, disabled);
            if (savePickerBtn) {
                updateButtonDisabled(savePickerBtn, disabled);
            }
        };

        selectAllBtn.addEventListener('click', () => {
            for (const r of renderedRows) {
                if (!r.checkbox.disabled) {
                    r.checkbox.checked = true;
                }
            }
            updateSelection();
        });

        selectNoneBtn.addEventListener('click', () => {
            for (const r of renderedRows) {
                r.checkbox.checked = false;
            }
            updateSelection();
        });

        for (const r of renderedRows) {
            r.checkbox.addEventListener('change', updateSelection);
        }

        updateSelection();

        saveDownloadsBtn.addEventListener('click', () => {
            const zipFilename = campaignZipName(document.title);
            const zipData = buildCampaignZip();
            downloadZip(zipFilename, zipData);
            for (const r of renderedRows) {
                if (!r.checkbox.checked || !r.character) continue;
                r.resultSpan.textContent = 'Saved ✓ (in zip)';
                r.resultSpan.style.color = '#81c995';
            }
            resultEl.textContent = `Saved ${zipFilename}`;
            resultEl.style.color = '#81c995';
        });

        if (savePickerBtn) {
            savePickerBtn.addEventListener('click', async () => {
                const zipFilename = campaignZipName(document.title);
                try {
                    const handle = await window.showSaveFilePicker!({
                        suggestedName: zipFilename,
                        types: [
                            {
                                description: 'Zip archive',
                                accept: {
                                    'application/zip': ['.zip'],
                                },
                            },
                        ],
                    });
                    const zipData = buildCampaignZip();
                    const writable = await handle.createWritable();
                    await writable.write(zipData);
                    await writable.close();
                    for (const r of renderedRows) {
                        if (!r.checkbox.checked || !r.character) continue;
                        r.resultSpan.textContent = 'Saved ✓ (in zip)';
                        r.resultSpan.style.color = '#81c995';
                    }
                    const savedName = handle.name || zipFilename;
                    resultEl.textContent = `Saved ${savedName}`;
                    resultEl.style.color = '#81c995';
                } catch (e: any) {
                    if (e.name === 'AbortError') return;
                    alert(e.message || String(e));
                }
            });
        }

        if (!saveDownloadsBtn.disabled) {
            saveDownloadsBtn.focus();
        } else {
            selectAllBtn.focus();
        }
    } else {
        const { body } = createContainer('D&D Beyond to Alchemy');
        body.textContent =
            'Open a D&D Beyond character or campaign page first.';
    }
}

run();
