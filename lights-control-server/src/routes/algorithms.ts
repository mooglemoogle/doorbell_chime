import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { algorithms } from '../algorithms/index';

export interface AlgorithmSource {
    config: string;
    algorithm: string;
}

function toCamelCase(snakeName: string): string {
    return snakeName.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function findSourceFile(algorithmsDir: string, name: string): string | null {
    const camelName = toCamelCase(name);
    const candidates = [
        path.join(algorithmsDir, name, `${name}.ts`),
        path.join(algorithmsDir, camelName, `${camelName}.ts`),
        path.join(algorithmsDir, `${name}.ts`),
        path.join(algorithmsDir, `${camelName}.ts`),
    ];

    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }

    // Fallback: first non-config .ts file in the camelCase directory
    const dirPath = path.join(algorithmsDir, camelName);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        const files = fs.readdirSync(dirPath)
            .filter(f => f.endsWith('.ts') && f !== 'config.ts' && f !== 'index.ts');
        if (files.length > 0) return path.join(dirPath, files[0]);
    }

    return null;
}

// For single-file algorithms, split at the class declaration.
function splitSingleFile(source: string): AlgorithmSource {
    const match = source.match(/^export\s+class\s+Algorithm\b/m);
    if (!match || match.index === undefined) {
        return { config: '', algorithm: source };
    }
    return {
        config: source.slice(0, match.index).trim(),
        algorithm: source.slice(match.index),
    };
}

export default (router: Router) => {
    const algorithmsDir = path.join(__dirname, '..', 'algorithms');

    router.get('/api/algorithms', (_req, res) => {
        res.status(200).json({ accepted: true, response: Object.keys(algorithms) });
    });

    router.get('/api/algorithms/:name/config', (req, res) => {
        const { name } = req.params;
        if (!algorithms[name]) {
            res.status(404).json({ accepted: false, message: 'Algorithm not found' });
            return;
        }
        res.status(200).json({ accepted: true, response: algorithms[name].config });
    });

    router.get('/api/algorithms/:name/source', async (req, res) => {
        const name = req.params.name;
        if (!algorithms[name]) {
            res.status(404).json({ accepted: false, message: 'Algorithm not found' });
            return;
        }

        const filePath = findSourceFile(algorithmsDir, name);
        if (!filePath) {
            res.status(404).json({ accepted: false, message: 'Source file not found' });
            return;
        }

        const configPath = path.join(path.dirname(filePath), 'config.ts');
        const hasSeparateConfig =
            path.dirname(filePath) !== algorithmsDir && fs.existsSync(configPath);

        let source: AlgorithmSource;
        if (hasSeparateConfig) {
            const [config, algorithm] = await Promise.all([
                fs.promises.readFile(configPath, 'utf-8'),
                fs.promises.readFile(filePath, 'utf-8'),
            ]);
            source = { config, algorithm };
        } else {
            source = splitSingleFile(await fs.promises.readFile(filePath, 'utf-8'));
        }

        res.status(200).json({ accepted: true, response: source });
    });
};
