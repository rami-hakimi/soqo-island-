# Qur'an text: proposal to move to the Tanzil Project text

Status: **applied on 2 November 2026** with the owner's approval. The table below is the
verification that preceded the change; after it, the data file was compared again against the
official download (25 of 25 passages identical, word for word) and its checksum re-pinned in
`test/religious-text.test.js`.

## Why
No explicit licence could be found for the KFGQPC Hafs text as obtained through the
Quran.com API (see `NOTICE.md`, "Qur'an text: status"). The Tanzil Project publishes its
Uthmani text under explicit terms.

## Tanzil licence (the header of the downloaded file, verbatim)
```
# PLEASE DO NOT REMOVE OR CHANGE THIS COPYRIGHT BLOCK
#====================================================================
#
#  Tanzil Quran Text (Uthmani, Version 1.1)
#  Copyright (C) 2007-2026 Tanzil Project
#  License: Creative Commons Attribution 3.0
#
#  This copy of the Quran text is carefully produced, highly
#  verified and continuously monitored by a group of specialists
#  at Tanzil Project.
#
#  TERMS OF USE:
#
#  - Permission is granted to copy and distribute verbatim copies
#    of this text, but CHANGING IT IS NOT ALLOWED.
#
#  - This Quran text can be used in any website or application,
#    provided that its source (Tanzil Project) is clearly indicated,
#    and a link is made to tanzil.net to enable users to keep
#    track of changes.
#
#  - This copyright notice shall be included in all verbatim copies
#    of the text, and shall be reproduced appropriately in all files
#    derived from or containing substantial portion of this text.
#
#  Please check updates at: http://tanzil.net/updates/
#
#====================================================================
```
Source: tanzil.net download, type "Uthmani", plain text (`surah|ayah|text`), 6236 verses,
fetched 2026-11-02.

## Script compatibility
Both texts are Unicode Arabic. KFGQPC's encoding writes sukun as U+06E1 (small high dotless
head of khah) and uses its own small-letter and pause-mark conventions; Tanzil's Uthmani text
uses U+0652 (sukun), U+0671 (alef wasla), U+0670 (superscript alef), writes some final yaa as
alef maksura (U+0649, as in the Madinah mushaf) and uses the standard Qur'anic pause marks
(U+06D6–U+06DC). The KFGQPC Hafs font is a Unicode font and renders all of these; the visual
result differs in a few mark shapes and in where pause marks sit. A rendering check of every
passage in the island card is part of applying the change.

## Passage-by-passage comparison
"MATCH" means the two texts have the same letters, word for word, once every vowel mark, small
letter, pause mark and verse number is removed and the letter-form conventions above are
folded; the Tanzil column shows the Tanzil words (with Tanzil's own marks) that would replace
the bundled text. **25 of 25 passages match.**

| # | Kind | Reference | Bundled (KFGQPC) | Tanzil Uthmani | Result |
|---|---|---|---|---|---|
| 1 | ayah | الرعد ٢٨ (13:28) | <span dir="rtl">ٱلَّذِينَ ءَامَنُواْ وَتَطۡمَئِنُّ قُلُوبُهُم بِذِكۡرِ ٱللَّهِۗ أَلَا بِذِكۡرِ ٱللَّهِ تَطۡمَئِنُّ ٱلۡقُلُوبُ ٢٨</span> | <span dir="rtl">ٱلَّذِينَ ءَامَنُوا۟ وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ ٱللَّهِ أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ</span> | MATCH · whole verse(s) |
| 2 | ayah | البقرة ١٥٢ (2:152) | <span dir="rtl">فَٱذۡكُرُونِيٓ أَذۡكُرۡكُمۡ وَٱشۡكُرُواْ لِي وَلَا تَكۡفُرُونِ ١٥٢</span> | <span dir="rtl">فَٱذْكُرُونِىٓ أَذْكُرْكُمْ وَٱشْكُرُوا۟ لِى وَلَا تَكْفُرُونِ</span> | MATCH · whole verse(s) |
| 3 | ayah | غافر ٦٠ (40:60) | <span dir="rtl">وَقَالَ رَبُّكُمُ ٱدۡعُونِيٓ أَسۡتَجِبۡ لَكُمۡۚ</span> | <span dir="rtl">وَقَالَ رَبُّكُمُ ٱدْعُونِىٓ أَسْتَجِبْ لَكُمْ</span> | MATCH · excerpt |
| 4 | ayah | الشرح ٥–٦ (94:5–6) | <span dir="rtl">فَإِنَّ مَعَ ٱلۡعُسۡرِ يُسۡرًا ٥ إِنَّ مَعَ ٱلۡعُسۡرِ يُسۡرٗا ٦</span> | <span dir="rtl">فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا</span> | MATCH · whole verse(s) |
| 5 | ayah | الطلاق ٣ (65:3) | <span dir="rtl">وَمَن يَتَوَكَّلۡ عَلَى ٱللَّهِ فَهُوَ حَسۡبُهُۥٓۚ</span> | <span dir="rtl">وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُۥٓ</span> | MATCH · excerpt |
| 6 | ayah | البقرة ٢٨٦ (2:286) | <span dir="rtl">لَا يُكَلِّفُ ٱللَّهُ نَفۡسًا إِلَّا وُسۡعَهَاۚ</span> | <span dir="rtl">لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا</span> | MATCH · excerpt |
| 7 | ayah | البقرة ١٨٦ (2:186) | <span dir="rtl">وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌۖ أُجِيبُ دَعۡوَةَ ٱلدَّاعِ إِذَا دَعَانِۖ</span> | <span dir="rtl">وَإِذَا سَأَلَكَ عِبَادِى عَنِّى فَإِنِّى قَرِيبٌ أُجِيبُ دَعْوَةَ ٱلدَّاعِ إِذَا دَعَانِ</span> | MATCH · excerpt |
| 8 | ayah | الزمر ٥٣ (39:53) | <span dir="rtl">قُلۡ يَٰعِبَادِيَ ٱلَّذِينَ أَسۡرَفُواْ عَلَىٰٓ أَنفُسِهِمۡ لَا تَقۡنَطُواْ مِن رَّحۡمَةِ ٱللَّهِۚ إِنَّ ٱللَّهَ يَغۡفِرُ ٱلذُّنُوبَ جَمِيعًاۚ إِنَّهُۥ هُوَ ٱلۡغَفُورُ ٱلرَّحِيمُ ٥٣</span> | <span dir="rtl">قُلْ يَٰعِبَادِىَ ٱلَّذِينَ أَسْرَفُوا۟ عَلَىٰٓ أَنفُسِهِمْ لَا تَقْنَطُوا۟ مِن رَّحْمَةِ ٱللَّهِ إِنَّ ٱللَّهَ يَغْفِرُ ٱلذُّنُوبَ جَمِيعًا إِنَّهُۥ هُوَ ٱلْغَفُورُ ٱلرَّحِيمُ</span> | MATCH · whole verse(s) |
| 9 | ayah | النحل ١٢٧ (16:127) | <span dir="rtl">وَٱصۡبِرۡ وَمَا صَبۡرُكَ إِلَّا بِٱللَّهِۚ</span> | <span dir="rtl">وَٱصْبِرْ وَمَا صَبْرُكَ إِلَّا بِٱللَّهِ</span> | MATCH · excerpt |
| 10 | ayah | الضحى ٥ (93:5) | <span dir="rtl">وَلَسَوۡفَ يُعۡطِيكَ رَبُّكَ فَتَرۡضَىٰٓ ٥</span> | <span dir="rtl">وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰٓ</span> | MATCH · whole verse(s) |
| 11 | ayah | البقرة ١٥٣ (2:153) | <span dir="rtl">يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ ٱسۡتَعِينُواْ بِٱلصَّبۡرِ وَٱلصَّلَوٰةِۚ إِنَّ ٱللَّهَ مَعَ ٱلصَّٰبِرِينَ ١٥٣</span> | <span dir="rtl">يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ إِنَّ ٱللَّهَ مَعَ ٱلصَّٰبِرِينَ</span> | MATCH · whole verse(s) |
| 12 | ayah | هود ٨٨ (11:88) | <span dir="rtl">وَمَا تَوۡفِيقِيٓ إِلَّا بِٱللَّهِۚ عَلَيۡهِ تَوَكَّلۡتُ وَإِلَيۡهِ أُنِيبُ ٨٨</span> | <span dir="rtl">وَمَا تَوْفِيقِىٓ إِلَّا بِٱللَّهِ عَلَيْهِ تَوَكَّلْتُ وَإِلَيْهِ أُنِيبُ</span> | MATCH · excerpt |
| 13 | ayah | الروم ٦٠ (30:60) | <span dir="rtl">فَٱصۡبِرۡ إِنَّ وَعۡدَ ٱللَّهِ حَقّٞۖ</span> | <span dir="rtl">فَٱصْبِرْ إِنَّ وَعْدَ ٱللَّهِ حَقٌّ</span> | MATCH · excerpt |
| 14 | ayah | الجمعة ١١ (62:11) | <span dir="rtl">وَٱللَّهُ خَيۡرُ ٱلرَّٰزِقِينَ ١١</span> | <span dir="rtl">وَٱللَّهُ خَيْرُ ٱلرَّٰزِقِينَ</span> | MATCH · excerpt |
| 15 | ayah | النصر ٣ (110:3) | <span dir="rtl">فَسَبِّحۡ بِحَمۡدِ رَبِّكَ وَٱسۡتَغۡفِرۡهُۚ إِنَّهُۥ كَانَ تَوَّابَۢا ٣</span> | <span dir="rtl">فَسَبِّحْ بِحَمْدِ رَبِّكَ وَٱسْتَغْفِرْهُ إِنَّهُۥ كَانَ تَوَّابًۢا</span> | MATCH · whole verse(s) |
| 16 | ayah | الأحزاب ٤١–٤٢ (33:41–42) | <span dir="rtl">يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ ٱذۡكُرُواْ ٱللَّهَ ذِكۡرٗا كَثِيرٗا ٤١ وَسَبِّحُوهُ بُكۡرَةٗ وَأَصِيلًا ٤٢</span> | <span dir="rtl">يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱذْكُرُوا۟ ٱللَّهَ ذِكْرًا كَثِيرًا وَسَبِّحُوهُ بُكْرَةً وَأَصِيلًا</span> | MATCH · whole verse(s) |
| 17 | ayah | التوبة ١٢٩ (9:129) | <span dir="rtl">فَإِن تَوَلَّوۡاْ فَقُلۡ حَسۡبِيَ ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَۖ عَلَيۡهِ تَوَكَّلۡتُۖ وَهُوَ رَبُّ ٱلۡعَرۡشِ ٱلۡعَظِيمِ ١٢٩</span> | <span dir="rtl">فَإِن تَوَلَّوْا۟ فَقُلْ حَسْبِىَ ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ ٱلْعَرْشِ ٱلْعَظِيمِ</span> | MATCH · whole verse(s) |
| 18 | dua | البقرة ٢٠١ (2:201) | <span dir="rtl">رَبَّنَآ ءَاتِنَا فِي ٱلدُّنۡيَا حَسَنَةٗ وَفِي ٱلۡأٓخِرَةِ حَسَنَةٗ وَقِنَا عَذَابَ ٱلنَّارِ ٢٠١</span> | <span dir="rtl">رَبَّنَآ ءَاتِنَا فِى ٱلدُّنْيَا حَسَنَةً وَفِى ٱلْـَٔاخِرَةِ حَسَنَةً وَقِنَا عَذَابَ ٱلنَّارِ</span> | MATCH · excerpt |
| 19 | dua | طه ٢٥–٢٦ (20:25–26) | <span dir="rtl">رَبِّ ٱشۡرَحۡ لِي صَدۡرِي ٢٥ وَيَسِّرۡ لِيٓ أَمۡرِي ٢٦</span> | <span dir="rtl">رَبِّ ٱشْرَحْ لِى صَدْرِى وَيَسِّرْ لِىٓ أَمْرِى</span> | MATCH · excerpt |
| 20 | dua | طه ١١٤ (20:114) | <span dir="rtl">رَبِّ زِدۡنِي عِلۡمٗا ١١٤</span> | <span dir="rtl">رَّبِّ زِدْنِى عِلْمًا</span> | MATCH · excerpt |
| 21 | dua | الأنبياء ٨٧ (21:87) | <span dir="rtl">لَآ إِلَٰهَ إِلَّآ أَنتَ سُبۡحَٰنَكَ إِنِّي كُنتُ مِنَ ٱلظَّٰلِمِينَ ٨٧</span> | <span dir="rtl">لَّآ إِلَٰهَ إِلَّآ أَنتَ سُبْحَٰنَكَ إِنِّى كُنتُ مِنَ ٱلظَّٰلِمِينَ</span> | MATCH · excerpt |
| 22 | dua | آل عمران ٨ (3:8) | <span dir="rtl">رَبَّنَا لَا تُزِغۡ قُلُوبَنَا بَعۡدَ إِذۡ هَدَيۡتَنَا وَهَبۡ لَنَا مِن لَّدُنكَ رَحۡمَةًۚ إِنَّكَ أَنتَ ٱلۡوَهَّابُ ٨</span> | <span dir="rtl">رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً إِنَّكَ أَنتَ ٱلْوَهَّابُ</span> | MATCH · whole verse(s) |
| 23 | dua | إبراهيم ٤١ (14:41) | <span dir="rtl">رَبَّنَا ٱغۡفِرۡ لِي وَلِوَٰلِدَيَّ وَلِلۡمُؤۡمِنِينَ يَوۡمَ يَقُومُ ٱلۡحِسَابُ ٤١</span> | <span dir="rtl">رَبَّنَا ٱغْفِرْ لِى وَلِوَٰلِدَىَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ ٱلْحِسَابُ</span> | MATCH · whole verse(s) |
| 24 | dua | آل عمران ١٧٣ (3:173) | <span dir="rtl">حَسۡبُنَا ٱللَّهُ وَنِعۡمَ ٱلۡوَكِيلُ ١٧٣</span> | <span dir="rtl">حَسْبُنَا ٱللَّهُ وَنِعْمَ ٱلْوَكِيلُ</span> | MATCH · excerpt |
| 25 | dhikr | الفاتحة ٢ (1:2) | <span dir="rtl">ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ ٢</span> | <span dir="rtl">ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ</span> | MATCH · whole verse(s) |

## How the change would be applied (separate commit, after approval)
1. Replace the `text` of each matching passage with the Tanzil words above; keep the Arabic
   references and verse numbers; do not touch dhikr and du'a texts that are not Qur'anic.
2. Add `assets/quran/TANZIL-LICENSE.txt` with the copyright notice above (packaged), add the
   Tanzil Project line and link to `NOTICE.md`, `THIRD_PARTY_NOTICES.md` and the Settings ›
   Features sources text (`p.islamic.sources`) in English, Arabic and Dutch, with a link to
   tanzil.net.
3. Update the checksum in `test/religious-text.test.js` in the same commit, with the source
   named in the commit message.
4. Render every passage in the island card, in Arabic and English UI, and compare against
   tanzil.net for the same verse before merging.
5. Only after that is merged: publish the installer.
