[![cover][cover-src]][cover-href]
[![npm version][npm-version-src]][npm-version-href] 
[![npm downloads][npm-downloads-src]][npm-downloads-href] 
[![bundle][bundle-src]][bundle-href] 
[![License][license-src]][license-href]

# Buildkarium

> 🧱 An enchanting JavaScript build ecosystem!

### 📦 Optimized bundler

Robust [rollup](https://rollupjs.org) based bundler that supports typescript and generates commonjs and module formats + type declarations.

### 🪄 Automated config

Automagically infer build config and entries from `package.json`.

### 📁 Bundleless build

Integration with [mimikra](https://github.com/nyxblabs/mimikra) for generating bundleless dists with file-to-file transpilation.

### ✨ Passive watcher

Stub `dist` once using  [dynot](https://github.com/nyxblabs/dynot) and you can try and link your project without needing to watch and rebuild during development.

### ✍ Typiqus Generator

Integration with [typiqus](https://github.com/nyxblabs/typiqus).

### 🛡️ Secure builds

Automatically check for various build issues such as potential **missing** and **unused** [dependencies](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#dependencies) and fail CI.

CLI output also includes output size and exports for quick inspection.

⚙️ Usage

📄 Create `src/index.ts`:

```ts
export const log = (...args) => { console.log(...args) }
```

🔄 Update `package.json`:

```json
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "main": "./dist/index.cjs",
  "types": "./dist/index.d.ts",
  "files": [
    "dist"
  ]
}
```

🔨 Build with `buildkarium`:

```sh
npx buildkarium
```

✅ Configuration is automatically inferred from fields in `package.json` mapped to `src/` directory. For more control, continue with the next section.


⚙️ Configuration

📄 Create `karium.config.ts`:

```ts
export default {
  entries: [
    './src/index'
  ]
}
```

✅ You can either use the `buildkarium` key in `package.json` or create a `karium.config.{js,ts,json}` file to specify the configuration.

✅ See options [here](./src/types.ts). 📚

💡 Example:

```ts
import { defineBuildConfig } from 'buildkarium'

export default defineBuildConfig({
    // If entries is not provided, will be automatically inferred from package.json
    entries: [
        // default
        './src/index',
        // mkdist builder transpiles file-to-file keeping original sources structure
        {
            builder: 'mimikra',
            input: './src/package/components/',
            outDir: './build/components'
        },
    ],

    // Change outDir, default is 'dist'
    outDir: 'build',

    // Generates .d.ts declaration file
    declaration: true,
})
```

## 🌱 Development

- 🐙 Clone this repository
- 🔧 Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable` (use `npm i -g corepack` for Node.js < 16.10)
- 📦 Install dependencies using `nyxi`
- 🏃 Run interactive tests using `nyxr dev`

## 📜 License

[MIT](./LICENSE) - Made with 💞

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/buildkarium?style=flat&colorA=18181B&colorB=14F195
[npm-version-href]: https://npmjs.com/package/buildkarium
[npm-downloads-src]: https://img.shields.io/npm/dm/buildkarium?style=flat&colorA=18181B&colorB=14F195
[npm-downloads-href]: https://npmjs.com/package/buildkarium
[bundle-src]: https://img.shields.io/bundlephobia/minzip/buildkarium?style=flat&colorA=18181B&colorB=14F195
[bundle-href]: https://bundlephobia.com/result?p=buildkarium
[license-src]: https://img.shields.io/github/license/nyxblabs/buildkarium.svg?style=flat&colorA=18181B&colorB=14F195
[license-href]: https://github.com/nyxblabs/buildkarium/blob/main/LICENSE

<!-- Cover -->
[cover-src]: https://raw.githubusercontent.com/nyxblabs/buildkarium/main/.github/assets/cover-github-buildkarium.png
[cover-href]: https://💻nyxb.ws
