import { it, expect, vi, describe } from 'vitest';
import path from 'path';

const dbPath = path.resolve(__dirname, '../utils/db');
console.log('DEBUG: dbPath is:', dbPath);

vi.mock(dbPath, () => ({ hello: 'mocked' }));

describe('Diagnostic Absolute', () => {
    it('checks mock resolution with absolute path', () => {
        const db = require(dbPath);
        expect(db.hello).toBe('mocked');
    });
});
