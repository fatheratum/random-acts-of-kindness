# Random Acts of Kindness 💛

3D-animated kindness tracker — React + Vite + Three.js.
Floating 3D hearts, heart-burst on every logged act, points, streaks, badges, and a kindness feed. Data saves in localStorage on your device.

## Run in Termux (Android)

Important: extract in your Termux HOME, not /sdcard — npm can't create symlinks on shared storage.

```bash
# 1. one-time: give Termux access to your Downloads
termux-setup-storage

# 2. copy the archive home and extract it
cp ~/storage/downloads/random-acts-of-kindness.tar.gz ~/
cd ~ && tar -xzf random-acts-of-kindness.tar.gz
cd random-acts-of-kindness

# 3. install Node + dependencies
pkg update -y && pkg install nodejs -y
npm install

# 4. start the dev server
npm run dev
```

Then open **http://localhost:5173** in your phone's browser. Edit `src/App.jsx` and the page hot-reloads.

## Project layout

- `index.html` — entry point (loads Tailwind via CDN, no build config needed)
- `src/App.jsx` — the entire app: 3D scene, logging form, streaks, badges, feed
- `src/main.jsx` — React mount
- `vite.config.js` / `package.json` — tooling

## Build for production

```bash
npm run build     # static site in dist/
npm run preview   # test the build locally
```

## Next steps (from the blueprint)

Accounts, the global kindness map, leaderboards, and community challenges need a backend — Supabase is a good fit and works fine from Termux via its JS client.
