import { SurParser } from '../parser';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Memory usage tracking helper
function getMemoryUsage() {
    const used = process.memoryUsage();
    return {
        heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(used.external / 1024 / 1024 * 100) / 100,
        rss: Math.round(used.rss / 1024 / 1024 * 100) / 100
    };
}

// Load test files
function loadTestFile(name: string): string {
    const testFilePath = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', `${name}.sur`);
    return readFileSync(testFilePath, 'utf-8');
}

// Extract specific pattern types for focused testing
function extractPatterns(content: string, pattern: string): string[] {
    const lines = content.split('\n');
    const patterns: string[] = [];
    let inSection = false;
    
    for (const line of lines) {
        if (line.includes(`// ${pattern}`)) {
            inSection = true;
            continue;
        } else if (line.startsWith('//')) {
            inSection = false;
        }
        
        if (inSection && line.trim().startsWith('b:')) {
            patterns.push(line.trim().substring(2).trim());
        }
    }
    
    return patterns;
}

// Benchmark function
async function runBenchmark(name: string, fn: () => void, iterations: number = 1000) {
    console.log(`\nRunning benchmark: ${name}`);
    console.log('Initial memory usage:', getMemoryUsage());
    
    const startTime = process.hrtime.bigint();
    
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    
    console.log('Final memory usage:', getMemoryUsage());
    console.log(`Total time: ${duration.toFixed(2)}ms`);
    console.log(`Average time per operation: ${(duration / iterations).toFixed(2)}ms`);
    console.log(`Operations per second: ${(1000 / (duration / iterations)).toFixed(2)}`);
    
    return duration;
}

async function benchmarkPatterns() {
    const parser = new SurParser();
    const patternTests = loadTestFile('pattern-tests');
    
    const patternTypes = [
        'Simple notes',
        'Octave variations',
        'Compound notes',
        'Sustain patterns',
        'Mixed patterns with lyrics',
        'Complex mixed patterns'
    ];
    
    console.log('Starting pattern-specific benchmarks...\n');
    
    for (const patternType of patternTypes) {
        const patterns = extractPatterns(patternTests, patternType);
        await runBenchmark(`Parse ${patternType}`, () => {
            for (const pattern of patterns) {
                parser.parse(`%%CONFIG\ntitle: Test\n\n@SCALE\nS -> Sa\n\n@COMPOSITION\nb: ${pattern}`);
            }
        }, 100); // Fewer iterations since we're parsing multiple patterns per iteration
    }
}

async function main() {
    const parser = new SurParser();
    
    // Run general file size benchmarks
    console.log('Starting file size benchmarks...\n');
    
    await runBenchmark('Parse small file', () => {
        parser.parse(loadTestFile('small'));
    });
    
    await runBenchmark('Parse medium file', () => {
        parser.parse(loadTestFile('medium'));
    });
    
    await runBenchmark('Parse large file', () => {
        parser.parse(loadTestFile('large'));
    });
    
    // Run pattern-specific benchmarks
    await benchmarkPatterns();
}

main().catch(console.error);
