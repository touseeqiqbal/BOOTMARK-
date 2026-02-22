import { it, expect, vi, describe } from 'vitest';

vi.mock('../utils/db', () => ({ hello: 'mocked' }));

describe('Diagnostic Relative', () => {
    it('checks mock resolution with require', () => {
        // Vitest transformer for require should pick this up
        const db = require('../utils/db');
        expect(db.hello).toBe('mocked');
    });
});
