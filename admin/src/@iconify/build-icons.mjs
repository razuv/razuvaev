import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const iconSetPath = require.resolve('@iconify-json/mdi/icons.json')
const iconSet = JSON.parse(await readFile(iconSetPath, 'utf8'))
const target = new URL('./icons-bundle.js', import.meta.url)

await writeFile(
  target,
  `import { addCollection } from '@iconify/vue'\n\naddCollection(${JSON.stringify(iconSet)})\n`,
)

console.log(`Bundled icons from ${iconSetPath}`)
