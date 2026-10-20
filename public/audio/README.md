# Audio files (Phase 3)

Put recorded MP3s here, one folder per level:

```
public/audio/hsk1/hsk1-0001.mp3       the word hsk1-0001 (爱)
public/audio/hsk1/hsk1-0001-ex1.mp3   its first example sentence
public/audio/hsk1/hsk1-0001-ex2.mp3   its second example sentence
public/audio/hsk7-9/hsk7-9-0001.mp3
```

Then set the path (relative to `public/`) in the word data:

```json
"audio": { "word": "audio/hsk1/hsk1-0001.mp3" },
"examples": [{ "zh": "我爱妈妈。", "…": "…", "audio": "audio/hsk1/hsk1-0001-ex1.mp3" }]
```

`npm run validate` checks the naming. The 🔊 buttons play the file automatically
when the path is set and fall back to the browser's Chinese voice when it is `null`,
so no page changes are needed.
