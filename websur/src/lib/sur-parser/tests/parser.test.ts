import { describe, it, expect } from 'vitest';
import { SurParser } from '../parser';

describe('SurParser', () => {
    let parser: SurParser;

    beforeEach(() => {
        parser = new SurParser();
    });

    describe('Simple Note Parsing', () => {
        it('should parse single notes correctly', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: S R G M P D N`;
            const result = parser.parse(input);
            expect(result.composition.beats[0].notes).toHaveLength(7);
            expect(result.composition.beats[0].notes[0].note).toBe('S');
            expect(result.composition.beats[0].notes[6].note).toBe('N');
        });

        it('should handle multiple beats of single notes', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: S R G
b: M P D
b: N S`;
            const result = parser.parse(input);
            expect(result.composition.beats).toHaveLength(3);
            expect(result.composition.beats[0].notes).toHaveLength(3);
            expect(result.composition.beats[1].notes).toHaveLength(3);
            expect(result.composition.beats[2].notes).toHaveLength(2);
        });

        it('should handle empty beats', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: -`;
            const result = parser.parse(input);
            expect(result.composition.beats).toHaveLength(1);
            expect(result.composition.beats[0].notes).toHaveLength(1);
            expect(result.composition.beats[0].notes[0].isRest).toBe(true);
        });
    });

    describe('Octave Variation Parsing', () => {
        it('should parse upper octave notes correctly', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: S' R' G' M' P' D' N'`;
            const result = parser.parse(input);
            expect(result.composition.beats[0].notes).toHaveLength(7);
            result.composition.beats[0].notes.forEach(note => {
                expect(note.octave).toBe('upper');
            });
        });

        it('should parse lower octave notes correctly', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: S. R. G. M. P. D. N.`;
            const result = parser.parse(input);
            expect(result.composition.beats[0].notes).toHaveLength(7);
            result.composition.beats[0].notes.forEach(note => {
                expect(note.octave).toBe('lower');
            });
        });

        it('should handle mixed octaves in the same beat', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: S. R G' M`;
            const result = parser.parse(input);
            expect(result.composition.beats[0].notes).toHaveLength(4);
            expect(result.composition.beats[0].notes[0].octave).toBe('lower');
            expect(result.composition.beats[0].notes[1].octave).toBe('middle');
            expect(result.composition.beats[0].notes[2].octave).toBe('upper');
            expect(result.composition.beats[0].notes[3].octave).toBe('middle');
        });
    });

    describe('Compound Note Parsing', () => {
        it('should parse bracketed compound notes', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: [S R] [G M] [P D N]`;
            const result = parser.parse(input);
            expect(result.composition.beats[0].compounds).toHaveLength(3);
            expect(result.composition.beats[0].compounds[0].notes).toHaveLength(2);
            expect(result.composition.beats[0].compounds[1].notes).toHaveLength(2);
            expect(result.composition.beats[0].compounds[2].notes).toHaveLength(3);
        });

        it('should parse unbracketed compound notes', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: SR GM PDN`;
            const result = parser.parse(input);
            expect(result.composition.beats[0].compounds).toHaveLength(3);
            expect(result.composition.beats[0].compounds[0].notes).toHaveLength(2);
            expect(result.composition.beats[0].compounds[1].notes).toHaveLength(2);
            expect(result.composition.beats[0].compounds[2].notes).toHaveLength(3);
        });

        it('should handle mixed bracketed and unbracketed compounds', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: SR [G M] PDN`;
            const result = parser.parse(input);
            expect(result.composition.beats[0].compounds).toHaveLength(3);
            expect(result.composition.beats[0].compounds[0].notes).toHaveLength(2);
            expect(result.composition.beats[0].compounds[1].notes).toHaveLength(2);
            expect(result.composition.beats[0].compounds[2].notes).toHaveLength(3);
        });
    });

    describe('Sustain Pattern Parsing', () => {
        it('should parse basic sustain patterns', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: S * * *`;
            const result = parser.parse(input);
            expect(result.composition.beats).toHaveLength(4);
            expect(result.composition.beats[0].notes[0].note).toBe('S');
            expect(result.composition.beats[1].isSustain).toBe(true);
            expect(result.composition.beats[2].isSustain).toBe(true);
            expect(result.composition.beats[3].isSustain).toBe(true);
        });

        it('should parse compound note sustains', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: [S R G] * *`;
            const result = parser.parse(input);
            expect(result.composition.beats).toHaveLength(3);
            expect(result.composition.beats[0].compounds[0].notes).toHaveLength(3);
            expect(result.composition.beats[1].isSustain).toBe(true);
            expect(result.composition.beats[2].isSustain).toBe(true);
        });

        it('should handle mixed sustains and notes', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: S * M * P *`;
            const result = parser.parse(input);
            expect(result.composition.beats).toHaveLength(6);
            expect(result.composition.beats[0].notes[0].note).toBe('S');
            expect(result.composition.beats[1].isSustain).toBe(true);
            expect(result.composition.beats[2].notes[0].note).toBe('M');
            expect(result.composition.beats[3].isSustain).toBe(true);
            expect(result.composition.beats[4].notes[0].note).toBe('P');
            expect(result.composition.beats[5].isSustain).toBe(true);
        });
    });

    describe('Complex Pattern Parsing', () => {
        it('should handle complex mixed patterns', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: S' [R G] * M. [P D'] * N`;
            const result = parser.parse(input);
            expect(result.composition.beats).toHaveLength(7);
            expect(result.composition.beats[0].notes[0].octave).toBe('upper');
            expect(result.composition.beats[1].compounds[0].notes).toHaveLength(2);
            expect(result.composition.beats[2].isSustain).toBe(true);
            expect(result.composition.beats[3].notes[0].octave).toBe('lower');
            expect(result.composition.beats[4].compounds[0].notes[1].octave).toBe('upper');
            expect(result.composition.beats[5].isSustain).toBe(true);
            expect(result.composition.beats[6].notes[0].octave).toBe('middle');
        });

        it('should handle consecutive sustains with octave changes', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: S' * * S. * *`;
            const result = parser.parse(input);
            expect(result.composition.beats).toHaveLength(6);
            expect(result.composition.beats[0].notes[0].octave).toBe('upper');
            expect(result.composition.beats[1].isSustain).toBe(true);
            expect(result.composition.beats[2].isSustain).toBe(true);
            expect(result.composition.beats[3].notes[0].octave).toBe('lower');
            expect(result.composition.beats[4].isSustain).toBe(true);
            expect(result.composition.beats[5].isSustain).toBe(true);
        });

        it('should handle compound notes with mixed octaves', () => {
            const input = `%%CONFIG
title: Test
@SCALE
S -> Sa
@COMPOSITION
b: [S' R. G] [M P' D.]`;
            const result = parser.parse(input);
            expect(result.composition.beats[0].compounds).toHaveLength(2);
            expect(result.composition.beats[0].compounds[0].notes[0].octave).toBe('upper');
            expect(result.composition.beats[0].compounds[0].notes[1].octave).toBe('lower');
            expect(result.composition.beats[0].compounds[0].notes[2].octave).toBe('middle');
            expect(result.composition.beats[0].compounds[1].notes[0].octave).toBe('middle');
            expect(result.composition.beats[0].compounds[1].notes[1].octave).toBe('upper');
            expect(result.composition.beats[0].compounds[1].notes[2].octave).toBe('lower');
        });
    });
});
