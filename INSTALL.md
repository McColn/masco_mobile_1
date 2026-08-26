# MASCO Finance Mobile — Installation

## Requirements
- Node.js 18+ (run `node --version` to check)
- npm 9+ or yarn

## Install dependencies

**Option 1 — npm (recommended)**
```bash
npm install --legacy-peer-deps
```

**Option 2 — If Option 1 still fails**
```bash
npm install --legacy-peer-deps --force
```

**Option 3 — yarn**
```bash
yarn install
```

## Run the app
```bash
npx expo start
```
Then press `a` for Android or `i` for iOS.

## Environment
Create `.env` in the project root:
```
EXPO_PUBLIC_API_URL=https://365microfinance.mccoln.com/api
```

## Common npm errors and fixes

### ERESOLVE / peer dependency conflicts
→ Use `npm install --legacy-peer-deps`

### Cannot find module 'expo'
→ Delete `node_modules` and reinstall:
```bash
rm -rf node_modules
npm install --legacy-peer-deps
```

### Metro bundler cache issues
```bash
npx expo start --clear
```
