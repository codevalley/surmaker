import { describe, it, expect } from 'vitest';
import { SurParser } from '../parser';
import { NotePitch } from '../types';

describe('SurParser', () => {
    let parser: SurParser;

    beforeEach(() => {
        parser = new SurParser();
    });

    describe('Simple Note Parsing', () => {
        it('should parse single notes correctly', () => {
            const input = `%% CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: SRGMPDN`;
            const result = parser.parse(input);
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0].beats).toBeDefined();
            expect(result.composition.sections[0].beats).toHaveLength(1);
            expect(result.composition.sections[0].beats[0].elements).toHaveLength(7);
            expect(result.composition.sections[0].beats[0].elements[0].note?.pitch).toBe(NotePitch.S);
            expect(result.composition.sections[0].beats[0].elements[6].note?.pitch).toBe(NotePitch.N);
        });

        it('should handle multiple beats of single notes', () => {
            const input = `%% CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: SRG
b: MPD
b: NS`;
            const result = parser.parse(input);
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0].beats).toBeDefined();
            expect(result.composition.sections[0].beats).toHaveLength(3);
            expect(result.composition.sections[0].beats[0].elements).toHaveLength(3);
            expect(result.composition.sections[0].beats[1].elements).toHaveLength(3);
            expect(result.composition.sections[0].beats[2].elements).toHaveLength(2);
        });

        it('should handle empty beats', () => {
            const input = `%% CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: -`;
            const result = parser.parse(input);
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0].beats).toBeDefined();
            expect(result.composition.sections[0].beats).toHaveLength(1);
            expect(result.composition.sections[0].beats[0].elements).toHaveLength(1);
            expect(result.composition.sections[0].beats[0].elements[0].note?.pitch).toBe(NotePitch.SILENCE);
        });
    });

    describe('Octave Variation Parsing', () => {
        it('should parse upper octave notes correctly', () => {
            const input = `%% CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: S'R'G'M'P'D'N'`;
            const result = parser.parse(input);
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0].beats).toBeDefined();
            expect(result.composition.sections[0].beats).toHaveLength(1);
            expect(result.composition.sections[0].beats[0].elements).toHaveLength(7);
            result.composition.sections[0].beats[0].elements.forEach(element => {
                expect(element.note?.octave).toBe(1); // Upper octave is 1
            });
        });

        it('should parse lower octave notes correctly', () => {
            const input = `%% CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: S.R.G.M.P.D.N.`;
            const result = parser.parse(input);
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0].beats).toBeDefined();
            expect(result.composition.sections[0].beats).toHaveLength(1);
            expect(result.composition.sections[0].beats[0].elements).toHaveLength(7);
            result.composition.sections[0].beats[0].elements.forEach(element => {
                expect(element.note?.octave).toBe(-1); // Lower octave is -1
            });
        });

        it('should handle mixed octaves in the same beat', () => {
            const input = `%% CONFIG

title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: S.RG'M`;
            const result = parser.parse(input);
            console.log('Parser output:', JSON.stringify(result, null, 2));
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0].beats).toBeDefined();
            expect(result.composition.sections[0].beats).toHaveLength(1);
            expect(result.composition.sections[0].beats[0].elements).toHaveLength(4);
            const elements = result.composition.sections[0].beats[0].elements;
            expect(elements[0].note?.octave).toBe(-1); // Lower octave
            expect(elements[1].note?.octave).toBe(0);  // Middle octave (default)
            expect(elements[2].note?.octave).toBe(1);  // Upper octave
            expect(elements[3].note?.octave).toBe(0);  // Middle octave (default)
        });
    });

    describe('Compound Note Parsing', () => {
        it('should parse bracketed compound notes', () => {
            const input = `%% CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: [S R] [G M] [P D N]`;
            const result = parser.parse(input);
            console.log('Parser compound  output:', JSON.stringify(result, null, 2));
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0].beats).toBeDefined();
            expect(result.composition.sections[0].beats).toHaveLength(3);
            expect(result.composition.sections[0].beats[0].elements).toHaveLength(2);
            
        });

        it('should parse unbracketed compound notes', () => {
            const input = `%%CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Mai
b: SR GM PDN`;
            const result = parser.parse(input);
            console.log('Parser output:', JSON.stringify(result, null, 2));
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0].beats).toBeDefined();
            expect(result.composition.sections[0].beats).toHaveLength(3);
            expect(result.composition.sections[0].beats[0].elements).toHaveLength(2);
            expect(result.composition.sections[0].beats[1].elements).toHaveLength(2);
            expect(result.composition.sections[0].beats[2].elements).toHaveLength(3);
        });

        it('should handle mixed bracketed and unbracketed compounds', () => {
            const input = `%%CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: SR [G M] PDN`;
            const result = parser.parse(input);
            console.log('Parser output:', JSON.stringify(result, null, 2));
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0].beats).toBeDefined();
            expect(result.composition.sections[0].beats).toHaveLength(3);
            expect(result.composition.sections[0].beats[0]?.elements).toHaveLength(2);
            expect(result.composition.sections[0].beats[1]?.elements).toHaveLength(2);
            expect(result.composition.sections[0].beats[2]?.elements).toHaveLength(3);
        });
    });

    describe('Sustain Pattern Parsing', () => {
        it('should parse basic sustain patterns', () => {
            const input = `%%CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: S * * *`;
            const result = parser.parse(input);
            console.log('Parser output:', JSON.stringify(result, null, 2));
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0]?.beats).toBeDefined();
            expect(result.composition.sections[0]?.beats).toHaveLength(4);
            expect(result.composition.sections[0]?.beats[0]?.elements).toHaveLength(1);
            expect(result.composition.sections[0]?.beats[0]?.elements[0]?.note?.pitch).toBe(NotePitch.S);
            expect(result.composition.sections[0]?.beats[1]?.elements[0]?.note?.pitch).toBe(NotePitch.SUSTAIN);
            expect(result.composition.sections[0]?.beats[2]?.elements[0]?.note?.pitch).toBe(NotePitch.SUSTAIN);
            expect(result.composition.sections[0]?.beats[3]?.elements[0]?.note?.pitch).toBe(NotePitch.SUSTAIN);
        });

        it('should parse compound note sustains', () => {
            const input = `%%CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: [S R G] * *`;
            const result = parser.parse(input);
            console.log('Parser output:', JSON.stringify(result, null, 2));
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0]?.beats).toBeDefined();
            expect(result.composition.sections[0]?.beats).toHaveLength(3);
            expect(result.composition.sections[0]?.beats[0]?.elements).toHaveLength(3);
            expect(result.composition.sections[0]?.beats[1]?.elements[0]?.note?.pitch).toBe(NotePitch.SUSTAIN);
            expect(result.composition.sections[0]?.beats[2]?.elements[0]?.note?.pitch).toBe(NotePitch.SUSTAIN);
        });

        it('should handle mixed sustains and notes', () => {
            const input = `%%CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: S * M * P *`;
            const result = parser.parse(input);
            console.log('Parser output:', JSON.stringify(result, null, 2));
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0]?.beats).toBeDefined();
            expect(result.composition.sections[0]?.beats).toHaveLength(6);
            expect(result.composition.sections[0]?.beats[0]?.elements).toHaveLength(1);
            expect(result.composition.sections[0]?.beats[0]?.elements[0]?.note?.pitch).toBe(NotePitch.S);
            expect(result.composition.sections[0]?.beats[1]?.elements[0]?.note?.pitch).toBe(NotePitch.SUSTAIN);
            expect(result.composition.sections[0]?.beats[2]?.elements).toHaveLength(1);
            expect(result.composition.sections[0]?.beats[2]?.elements[0]?.note?.pitch).toBe(NotePitch.M);
            expect(result.composition.sections[0]?.beats[3]?.elements[0]?.note?.pitch).toBe(NotePitch.SUSTAIN);
            
        });
    });

    describe('Complex Pattern Parsing', () => {
        it('should handle complex mixed patterns', () => {
            const input = `%%CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: S' [R G] * M. [P D'] * N`;
            const result = parser.parse(input);
            console.log('Parser output:', JSON.stringify(result, null, 2));
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0]?.beats).toBeDefined();
            expect(result.composition.sections[0]?.beats).toHaveLength(7);
            expect(result.composition.sections[0]?.beats[0]?.elements).toHaveLength(1);
            expect(result.composition.sections[0]?.beats[0]?.elements[0]?.note?.octave).toBe(1); // Upper octave
            expect(result.composition.sections[0]?.beats[1]?.elements).toHaveLength(2);
            expect(result.composition.sections[0]?.beats[2]?.elements[0]?.note?.pitch).toBe(NotePitch.SUSTAIN);
            expect(result.composition.sections[0]?.beats[3]?.elements).toHaveLength(1);
            expect(result.composition.sections[0]?.beats[3]?.elements[0]?.note?.octave).toBe(-1); // Lower octave
            expect(result.composition.sections[0]?.beats[4]?.elements).toHaveLength(2);
            expect(result.composition.sections[0]?.beats[4]?.elements[1]?.note?.octave).toBe(1); // Upper octave
            expect(result.composition.sections[0]?.beats[5]?.elements[0]?.note?.pitch).toBe(NotePitch.SUSTAIN);
            expect(result.composition.sections[0]?.beats[6]?.elements).toHaveLength(1);
            expect(result.composition.sections[0]?.beats[6]?.elements[0]?.note?.octave).toBe(0); // Middle octave
        });

        it('should handle consecutive sustains with octave changes', () => {
            const input = `%%CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: -S' * * *S. -* *`;
            const result = parser.parse(input);
            console.log('Parser output:', JSON.stringify(result, null, 2));
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0]?.beats).toBeDefined();
            expect(result.composition.sections[0]?.beats).toHaveLength(6);
            expect(result.composition.sections[0]?.beats[0]?.elements).toHaveLength(2);
            expect(result.composition.sections[0]?.beats[0]?.elements[0]?.note?.pitch).toBe(NotePitch.SILENCE);
            expect(result.composition.sections[0]?.beats[0]?.elements[1]?.note?.octave).toBe(1); // Upper octave
            
            expect(result.composition.sections[0]?.beats[1]?.elements[0]?.note?.pitch).toBe(NotePitch.SUSTAIN);
            
            expect(result.composition.sections[0]?.beats[3]?.elements[0]?.note?.pitch).toBe(NotePitch.SUSTAIN);
            expect(result.composition.sections[0]?.beats[3]?.elements[1]?.note?.octave).toBe(-1); // Lower octave
            expect(result.composition.sections[0]?.beats[4]?.elements).toHaveLength(2);
            expect(result.composition.sections[0]?.beats[4]?.elements[0]?.note?.pitch).toBe(NotePitch.SILENCE);
            expect(result.composition.sections[0]?.beats[4]?.elements[1]?.note?.pitch).toBe(NotePitch.SUSTAIN); // Lower octave
            expect(result.composition.sections[0]?.beats[5]?.elements[0]?.note?.pitch).toBe(NotePitch.SUSTAIN);
        });
            
        it('should handle compound notes with mixed octaves', () => {
            const input = `%%CONFIG
title: Test
%% SCALE
S -> Sa
%% COMPOSITION
#Main
b: [S' R. G] [M P' D.] [al *N'S be] al:DSS`;
            const result = parser.parse(input);
            console.log('Parser output:', JSON.stringify(result, null, 2));
            expect(result.composition.sections).toBeDefined();
            expect(result.composition.sections).toHaveLength(1);
            expect(result.composition.sections[0]?.beats).toBeDefined();
            expect(result.composition.sections[0]?.beats).toHaveLength(4);
            expect(result.composition.sections[0]?.beats[0]?.elements).toHaveLength(3);
            expect(result.composition.sections[0]?.beats[0]?.elements[1]?.note?.octave).toBe(-1); // Upper octave
            expect(result.composition.sections[0]?.beats[1]?.elements[1]?.note?.octave).toBe(1); // Upper octave
            expect(result.composition.sections[0]?.beats[1]?.elements[2]?.note?.octave).toBe(-1); // Upper octave
            expect(result.composition.sections[0]?.beats[2]?.elements).toHaveLength(5);
            expect(result.composition.sections[0]?.beats[2]?.elements[0]?.lyrics).toBe('al');
            expect(result.composition.sections[0]?.beats[3]?.elements).toHaveLength(3);
            expect(result.composition.sections[0]?.beats[3]?.elements[0]?.lyrics).toBe('al');
            expect(result.composition.sections[0]?.beats[3]?.elements[0]?.note?.pitch).toBe(NotePitch.D);
            expect(result.composition.sections[0]?.beats[3]?.elements[1]?.note?.pitch).toBe(NotePitch.S);
        });
    });
});
