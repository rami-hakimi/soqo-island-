# Translation review — Arabic

All 455 Arabic strings in `src/locales/ar.json` were written during the migration by the
engineering work, not by a second native speaker. They read naturally but have not been
reviewed. Priority for review, highest first:

1. **Religious and cultural wording** (never the source texts themselves, which are untouched):
   `prayer.*` names and messages (`prayer.nowSub`, `prayer.soonToast`, `prayer.iftarWish`,
   `prayer.ramadan`), `islamicPrompt.*`, `p.islamic.*`, `p.faith.*`, `reminder.*`,
   `prayer.method.*` (names of calculation authorities).
2. **Onboarding and companion voice**: `onboarding.*`, `welcome.*`, `greet.*`, `care.*`,
   `brief.*`, `water.*`, `p.soqi.*` (tone should be warm, informal but respectful).
3. **Settings labels and hints**: `p.general.*`, `p.island.*`, `p.alerts.*`, `p.privacy.*`,
   `p.cal.*`, `p.dl.*`, `p.trouble.*`, `p.support.*`.
4. **Toasts and status**: `dl.*`, `net.*`, `shot.*`, `upd.*`, `clip.*`, `battery.*`, `timer.*`,
   `focus.*`, `weather.*`.
5. **Plural forms**: `shelf.count_*`, `brief.meetings_*` (zero / one / two / few / many / other).

Conventions used (please confirm or correct):
- Latin digits everywhere in Arabic (`ar-u-nu-latn`) for consistency with times and counts.
- Product and brand names unchanged: Soqo Island is also written سوكو آيلاند; Soqi is سوقي;
  IDM Nova, Spotify, YouTube, Chrome, Wi-Fi stay Latin.
- Unit abbreviations: د (minutes), س (hours), ث (seconds).
- Imperative, second person masculine singular as the neutral UI form (Arabic UI convention);
  tell us if you prefer gender-neutral phrasing.

How to submit: edit `src/locales/ar.json` only, run `npm run i18n:check`, open a pull
request titled "ar: review …". Mark anything ambiguous in the PR description.

Also to review in context (not in the dictionaries): the installer's Arabic language pack
comes from NSIS itself; the Windows tray menu uses the dictionary.

## Dutch (nl.json)
All 473 strings were written in one pass for Netherlands usage (informal "je", Dutch date and
time formats via `nl-NL`, "Plank" for the Shelf, "Metgezel" for the Companion page, "Eiland"
for the island). Points a reviewer should look at first: the Settings hints (long sentences),
the prayer-method names (kept in their official language where one exists), and whether
"Starten met Windows" / "Verbergen bij volledig scherm" read naturally in context. Religious
terms (Fajr, Dhuhr, adhan, dhikr, du'a) are left untranslated on purpose.
