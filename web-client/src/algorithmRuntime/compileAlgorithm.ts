import * as ts from 'typescript';
import { BaseAlgorithm } from './baseAlgorithm';
import { Pixel } from './pixel';
import { Pulse } from './pulse';
import { getMillis, bezierBlend, hsvToRgb } from './helpers';

// Strip import lines — they would become require() calls we can't resolve.
// We leave export keywords alone and let TypeScript convert them to CommonJS
// assignments (exports.Algorithm = Algorithm), which we then read back out.
function stripImports(source: string): string {
    return source.replace(/^\s*import\s.*$/gm, '');
}

// Compile a config.ts file and extract the exported `config.options` schema.
// Returns null on any parse/compile error — callers should treat null as "no schema".
export function parseConfigSource(tsSource: string): Record<string, unknown> | null {
    try {
        const result = ts.transpileModule(stripImports(tsSource), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ESNext, strict: false },
        });
        const exports: Record<string, unknown> = {};
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        new Function('exports', 'const module = { exports };\n' + result.outputText)(exports);
        const cfg = exports.config as { options?: Record<string, unknown> } | undefined;
        return cfg?.options ?? null;
    } catch {
        return null;
    }
}

// User code must define: export class Algorithm extends BaseAlgorithm { ... }
// BaseAlgorithm, Pixel, and Pulse are injected into the execution scope.
export function compileAndInstantiate(tsSource: string, numPixels: number, settings: Record): BaseAlgorithm {
    const stripped = stripImports(tsSource);
    const result = ts.transpileModule(stripped, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ESNext,
            strict: false,
        },
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
        const messages = result.diagnostics.map(d =>
            typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText,
        );
        throw new Error(messages.join('\n'));
    }

    // Inject a CommonJS-compatible exports/module object so the compiled code
    // can assign exports.Algorithm without throwing "exports is not defined".
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const factory = new Function(
        'BaseAlgorithm',
        'Pixel',
        'Pulse',
        'getMillis',
        'bezierBlend',
        'hsvToRgb',
        'const exports = {}; const module = { exports };\n' + result.outputText + '\nreturn exports.Algorithm;',
    );
    const AlgorithmClass = factory(BaseAlgorithm, Pixel, Pulse, getMillis, bezierBlend, hsvToRgb) as new (
        numPixels: number,
        settings: Record,
    ) => BaseAlgorithm;

    if (!AlgorithmClass) {
        throw new Error(
            'No exported Algorithm class found — make sure your class is declared as: export class Algorithm extends BaseAlgorithm',
        );
    }

    return new AlgorithmClass(numPixels, settings);
}
