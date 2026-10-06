import { copyFile, mkdir } from 'node:fs/promises';

await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await copyFile(new URL('../index.html', import.meta.url), new URL('../dist/index.html', import.meta.url));
await copyFile(new URL('../signals.js', import.meta.url), new URL('../dist/signals.js', import.meta.url));
await copyFile(new URL('../dashboard.css', import.meta.url), new URL('../dist/dashboard.css', import.meta.url));
for (const file of ['inventory.html','inventory.js','inventory.css','inventory-data.mjs','market.css','suppliers.html','suppliers.js','supplier-data.mjs']) {
  await copyFile(new URL('../' + file, import.meta.url), new URL('../dist/' + file, import.meta.url));
}
