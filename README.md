# Beyond-To-Alchemy

A Chrome extension that converts [D&D Beyond](https://www.dndbeyond.com) characters into files you can import into [Alchemy RPG](https://alchemyrpg.com), keeping the details Alchemy's built-in importer drops. DMs can convert a whole campaign at once.

> This is an unofficial, community project. It is not affiliated with or endorsed by Alchemy (Arboreal, LLC) or D&D Beyond / Wizards of the Coast. It is a fork of Alchemy's open-source [ddb2alchemy](https://github.com/alchemyrpg/ddb2alchemy) (MIT).

## What it carries over

-   Subclass (including homebrew) and only the class features you have at your level
-   Chosen options (fighting styles, invocations, homebrew picks) under the feature that grants them
-   Class, race, feat and custom actions with damage dice, ability modifiers and saving throws
-   Weapon attacks (to-hit and damage with the right ability, finesse/ranged, range)
-   Monk Martial Arts dice from the character's own sheet (2014 and 2024 rules)
-   A generic Unarmed Strike for non-Monks
-   Limited-use resources (Ki, Rage, homebrew pools) as pip trackers
-   Natural armor (e.g. Tortle), ability score overrides, custom speeds, custom items, spells granted by items
-   Full race name, custom proficiencies (as text), clean descriptions without D&D Beyond placeholders

## Install

Works in Chrome and Chromium-based browsers (Edge, Brave, Helium, …).

1. Download `beyond-to-alchemy-extension-v1.0.0.zip` from the [latest release](../../releases/latest).
2. Unzip it to a folder you'll keep (the browser loads the extension from that folder).
3. Open `chrome://extensions` and turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose the unzipped folder.
5. Optional: pin **D&D Beyond to Alchemy** from the puzzle-piece menu so its button is always visible.

Some browsers ask you to allow the extension on dndbeyond.com the first time you click it. Allow it and click again.

To update, download the new release, replace the folder's contents, and click the reload arrow on the extension in `chrome://extensions`.

## Use

1. Log in to D&D Beyond.
2. Open a **character** page (`dndbeyond.com/characters/…`) or, as a DM, your **campaign** page (`dndbeyond.com/campaigns/…`).
3. Click the extension button. A dialog opens on the page.
    - **Character page**: check the summary, then **Save to Downloads** or **Save to another location…**. You get `<Name> - Alchemy.json`.
    - **Campaign page**: tick the characters you want, then save. You get one `<Campaign>-Characters-Alchemy.zip` with a file per character. Unzip it before importing.
4. In Alchemy: **Library → Characters → Create → Import**, and pick the `.json` file.

DMs can convert any player character their D&D Beyond account can see in the campaign. Characters you can't access are listed as unavailable with the reason.

## Privacy

The extension only runs when you click its button, only on dndbeyond.com, and only asks for the `activeTab` and `scripting` permissions. It reads character data with your existing D&D Beyond login, converts it in your browser, and saves files to your computer. Nothing is sent anywhere else.

## Known limits

-   D&D Beyond "Customize" AC/HP overrides are not applied yet.
-   Magic weapon bonuses only count `bonus/magic` modifiers on the item itself.
-   Alchemy's action editor shows the non-Monk Unarmed Strike die (stored as `1d1`, a flat 1) as 1d4. It rolls correctly; re-saving that action in the editor changes it to a real 1d4.

## Build from source

```bash
yarn install
yarn test              # test suite
yarn build:extension   # loadable extension in dist-extension/
yarn package:extension # zip for release
```

There is also a local web page (`yarn start`, then http://localhost:8000) that converts a public character from its share link, and a bookmarklet in `public/bookmarklet.min.js`.

## AI disclosure

This project was built with AI assistance. Claude (Anthropic) planned the work, reviewed every change and ran the tests and in-browser checks; Gemini (Google, via the Antigravity CLI) wrote parts of the code. Conversions were checked by importing characters into Alchemy and rolling their attacks in a game. All changes were directed and accepted by a human maintainer. Please report anything that converts incorrectly.

## License

[MIT](LICENSE). Original ddb2alchemy © 2022 Nicholas Budak; changes in this fork © 2026 ausbigshow.
