const CHARACTER_API =
    'https://character-service.dndbeyond.com/character/v5/character';
const GAME_DATA_API =
    'https://character-service.dndbeyond.com/character/v5/game-data';
// Same endpoint the DDB site uses to turn your login cookie into an API token
const TOKEN_API = 'https://auth-service.dndbeyond.com/v1/cobalt-token';

// prompts the user to download a file with the given filename and contents
const download = (filename, contents) => {
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
};

// Logged-in token unlocks custom items and private characters; anonymous still works for public ones
const getAuthHeaders = async () => {
    try {
        const response = await fetch(TOKEN_API, {
            method: 'POST',
            credentials: 'include',
        });
        const { token } = await response.json();
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
        return {};
    }
};

// get the character data and download it as a JSON file named for the character
const run = async (characterId) => {
    const headers = await getAuthHeaders();
    const response = await fetch(
        `${CHARACTER_API}/${characterId}?includeCustomItems=true`,
        { headers },
    );
    const { data: char } = await response.json();
    if (!char) throw new Error('Could not load character. Are you logged in?');

    for (const { level, subclassDefinition } of char.classes) {
        if (!subclassDefinition) continue;

        const response = await fetch(
            `${GAME_DATA_API}/always-prepared-spells?classLevel=${level}&classId=${
                subclassDefinition.id
            }&campaign=${char.campaign ? char.campaign.id : undefined}`,
            { headers },
        );
        const { data: spells } = await response.json();

        if (spells && spells.length !== 0) {
            char.classSpells.push({
                entityTypeId: 0,
                characterClassId: subclassDefinition.id,
                spells,
            });
        }
    }

    download(`${char.name}.json`, JSON.stringify(char));
};

// only act on a character page
const parts = window.location
    .toString()
    .match(/https:\/\/www\.dndbeyond\.com\/characters\/(\d+)/);
if (parts) run(parts[1]).catch((e) => alert(e.message));
