import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import type { BunPlugin } from 'bun';

const isDev = process.argv.includes('--dev');
const isWatch = process.argv.includes('--watch');
const dev = isDev || isWatch;

// The TypeScript compiler calls require("module") for PnP support.
// In the browser this built-in doesn't exist, so we stub it out.
const stubNodeBuiltins: BunPlugin = {
    name: 'stub-node-builtins',
    setup(build) {
        build.onResolve({ filter: /^(module|fs|path|os|crypto)$/ }, args => ({
            path: args.path,
            namespace: 'node-stub',
        }));
        build.onLoad({ filter: /.*/, namespace: 'node-stub' }, () => ({
            contents: 'module.exports = {}',
            loader: 'js',
        }));
    },
};

function linkSourceMap(): void {
    const js = readFileSync('./dist/index.js', 'utf-8');
    if (!js.includes('//# sourceMappingURL=index.js.map')) {
        writeFileSync('./dist/index.js', js + '\n//# sourceMappingURL=index.js.map');
    }
}

function generateHtml(): void {
    if (!existsSync('./dist')) mkdirSync('./dist', { recursive: true });
    writeFileSync(
        './dist/index.html',
        `<!DOCTYPE html>
<html lang="en" dir="ltr">
    <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
        <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="/index.css">
        <title>Light Control</title>
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="/index.js"></script>
    </body>
</html>`,
    );
}

generateHtml();

if (dev) {
    const { watch } = await import('node:fs');
    let building = false;
    let queued = false;

    async function rebuild() {
        if (building) {
            queued = true;
            return;
        }
        building = true;
        const start = Date.now();
        const result = await Bun.build({
            entrypoints: ['./src/index.tsx'],
            outdir: './dist',
            target: 'browser',
            format: 'esm',
            sourcemap: 'linked',
            naming: '[dir]/[name].[ext]',
            plugins: [stubNodeBuiltins],
        });
        building = false;
        if (result.success) {
            linkSourceMap();
            console.log(`Built in ${Date.now() - start}ms`);
        } else {
            for (const msg of result.logs) console.error(msg);
        }
        if (queued) {
            queued = false;
            rebuild();
        }
    }

    await rebuild();
    watch('./src', { recursive: true }, (_event, filename) => {
        if (filename) rebuild();
    });
    console.log('Watching src/ for changes...');
    await new Promise(() => {
        /* keep alive */
    });
} else {
    const result = await Bun.build({
        entrypoints: ['./src/index.tsx'],
        outdir: './dist',
        target: 'browser',
        format: 'esm',
        minify: true,
        sourcemap: 'external',
        naming: '[dir]/[name].[ext]',
        plugins: [stubNodeBuiltins],
    });

    if (!result.success) {
        for (const msg of result.logs) console.error(msg);
        process.exit(1);
    }

    linkSourceMap();
    const sizes = result.outputs.map(o => `  ${o.path.split('/dist/')[1]} (${(o.size / 1024).toFixed(1)} kB)`);
    console.log('Build complete:\n' + sizes.join('\n'));
}
