// Serves the converter page and fetches D&D Beyond characters for it,
// since DDB's API sends no CORS headers and browsers block direct requests.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const CHARACTER_API =
    'https://character-service.dndbeyond.com/character/v5/character';
const GAME_DATA_API =
    'https://character-service.dndbeyond.com/character/v5/game-data';
const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.map': 'application/json',
};

const getJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`D&D Beyond returned ${response.status}`);
    return response.json();
};

// Same data the bookmarklet gathers: the character plus subclass always-prepared spells
const fetchCharacter = async (id) => {
    const { data: char } = await getJson(
        `${CHARACTER_API}/${id}?includeCustomItems=true`,
    );
    if (!char) throw new Error('Character not found. Is it set to public?');
    for (const { level, subclassDefinition } of char.classes || []) {
        if (!subclassDefinition) continue;
        const { data: spells } = await getJson(
            `${GAME_DATA_API}/always-prepared-spells?classLevel=${level}&classId=${
                subclassDefinition.id
            }&campaign=${char.campaign ? char.campaign.id : undefined}`,
        ).catch(() => ({ data: [] }));
        if (spells && spells.length)
            char.classSpells.push({
                entityTypeId: 0,
                characterClassId: subclassDefinition.id,
                spells,
            });
    }
    return char;
};

const send = (res, status, type, body) => {
    res.writeHead(status, { 'Content-Type': type });
    res.end(body);
};

http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    // only numeric ids are forwarded, so this can't be used to fetch arbitrary URLs
    const match = url.pathname.match(/^\/api\/character\/(\d+)$/);
    if (match) {
        try {
            const char = await fetchCharacter(match[1]);
            return send(res, 200, 'application/json', JSON.stringify(char));
        } catch (e) {
            return send(
                res,
                502,
                'application/json',
                JSON.stringify({ error: e.message }),
            );
        }
    }

    const file = path.join(
        PUBLIC_DIR,
        path.normalize(url.pathname === '/' ? '/index.html' : url.pathname),
    );
    if (!file.startsWith(PUBLIC_DIR))
        return send(res, 403, 'text/plain', 'Forbidden');
    fs.readFile(file, (err, data) =>
        err
            ? send(res, 404, 'text/plain', 'Not found')
            : send(
                  res,
                  200,
                  TYPES[path.extname(file)] || 'application/octet-stream',
                  data,
              ),
    );
}).listen(PORT, () =>
    console.log(`Converter running at http://localhost:${PORT}`),
);
