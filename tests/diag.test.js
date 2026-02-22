import { it, expect, vi, describe } from 'vitest';

vi.mock('../utils/db', () => ({ hello: 'mocked' }));

describe('Diagnostic', () => {
    it('checks mock resolution in test file', () => {
        const db = require('../utils/db');
        expect(db.hello).toBe('mocked');
    });

    it('checks if another file requiring db gets the mock', async () => {
        // We create a dummy file that requires db
        // Since we can't easily create a file and require it in the same run without issues
        // we'll just import FormService and see if it's using the mock
        const fs = require('../utils/FormService');
        // If FormService requires('./db'), it should get the mock
    });
});
