# Kaze no Shima — notes for Claude

A samurai open-world browser game in a single file, `kaze-no-shima.html` (~7,400 lines, Three.js r160, all textures and audio procedural). `sw.js` is the offline cache. Bump its version string (`kaze-no-shima-vNN`) on every change.

## The user
- Their laptop: Intel Core Ultra 7 255U, built-in Intel Graphics, 16 GB RAM. FPS matters, so keep new effects cheap.
- They worry about usage cost. Keep replies short and testing minimal, but always screenshot visual changes from the angle the player sees them, including from above.
- If a short request is ambiguous, ask one line before guessing.
- After each change: commit, push to the working branch, and send the HTML file with SendUserFile. No PRs.

## Testing
- Syntax: extract the `<script type=module>` and run `node --check`.
- Serve with `python3 -m http.server 8765` from the repo.
- Use Playwright from `/opt/node22/lib/node_modules/playwright` with swiftshader args: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
- Load `?fixed=1&q=low` or `q=med`. Full quality crashes headless Chrome.
- `window.__game` exposes `player`, `soldier`, `enemies`, `villagers`, `step(n)`, `dbg.camera`.
- `window.__freeCam = [camPos, lookAt]` sets the camera for screenshots.
- `window.__stamp(x, z, yaw, hoof)` adds a footprint; `window.__faceTalk(who, text)` makes a face talk.

## Key systems (search these names)
- **Terrain:** `terrainBase` and `LANDFORMS` (hills and cliffs); terrain chunks with LOD (`updateTerrainLOD`). The shader is the `terrainCompile` onBeforeCompile and handles rock triplanar, snow, sand, mud with puddles (`pudN`, `damp`), and footprints (`uPrint`).
- **Heightmap texture:** `hmTex` / `SH.uHeightMap`; channels r = height, g = path, b = shore, a = meadow.
- **Grass cards:** `makeCardMaterial`, with KIND 0 = grass, 1 = pampas, 2 = flowers.
  - The grass texture is `grassCardTex`.
  - Cards twist and splay outward so they never read as asterisks from above. Don't shrink the cards.
- **Footprints:** `stampPrint` and `rasterPrints`. A tessellated print patch (`printPatch`, `PATCH_HALF`) makes real 3D dents; the terrain discards fragments under it. `puddleAt` triggers `splash`.
- **Forests:** `forest(...)` fills `mapleSpots` (4× density, grid-hashed gap check). Occlusion: `registerOccluders` and `updateOcclusion`.
- **Characters:** `makeWarrior` and `dressVillager`.
  - The base body is a borrowed sci-fi soldier mesh, so `dressClothes` covers it with a robe, sleeves and hakama.
  - `buildArmour` holds the samurai lame panels; the lacing texture is `makeLameTex`.
  - Rim light: `addRim`.
- **Faces:**
  - `makeHead` uses `sculptHead` (a sculpted sphere with 6 morph targets: open, smile, browDown, browUp, blink, frown).
  - The face paint is `faceTexture`, with feature spacing `FEAT_X` / `FEAT_Y`.
  - `updateFaces` animates blinks and lip sync; `faceTalk` picks the speaker and an expression from the line's words.
  - Heads use the scale `HEAD_S`.
- **Voices:** `speak()` with `CAST` (speechSynthesis).
- **Cutscenes:** shot lists flowing into gameplay (`updateBlend`).
- **Story:** `updateStory`; the objective marker is `updateObjMarker`.
- **Post-processing:** an SSAO pass (`aoPass`, toggle `GFX.ao`), film grade `GRADE` in `finalPass`, and graphics presets via `applyPreset` / `applyGfx`.
- **Horse:** `updateHorse` (swim state is re-checked each frame; a NaN guard exists).

## Open ideas the user mentioned
Stylised art pass, free models (Quaternius/Kenney), an itch.io release zip, real 3D eyeballs, and skin pore detail.
