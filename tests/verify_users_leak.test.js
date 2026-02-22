
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import * as dbUtils from '../utils/db';

// Mock the db module
vi.mock('../utils/db', () => ({
    getCollectionRef: vi.fn(),
    getDoc: vi.fn(),
}));

describe('GET /api/users Security', () => {
    let app;
    let usersRoute;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Import the router (assuming it exports the router as module.exports)
        // We use require because the source is CJS and might not play well with dynamic import if mocked weirdly
        // But vitest supports ESM imports of CJS.
        const usersRouteModule = await import('../routes/users.js');
        usersRoute = usersRouteModule.default || usersRouteModule;

        app = express();
        app.use(express.json());

        // Test Middleware to inject user
        app.use((req, res, next) => {
            if (req.headers['x-test-user']) {
                req.user = JSON.parse(req.headers['x-test-user']);
            }
            next();
        });

        app.use('/api/users', usersRoute);
    });

    it('reproduces mass data exposure: fetches all businesses when businessId is missing', async () => {
        // Setup mock to return "all businesses"
        const mockGet = vi.fn().mockResolvedValue({
            docs: [
                { id: 'biz1', data: () => ({ ownerEmail: 'leaked@biz1.com', ownerName: 'Leaked 1', businessName: 'Biz 1' }) },
                { id: 'biz2', data: () => ({ ownerEmail: 'leaked@biz2.com', ownerName: 'Leaked 2', businessName: 'Biz 2' }) }
            ]
        });

        dbUtils.getCollectionRef.mockReturnValue({
            where: vi.fn().mockReturnThis(),
            get: mockGet,
            doc: vi.fn().mockReturnThis()
        });

        // Request with Authenticated User (uid exists) but NO businessId
        const res = await request(app)
            .get('/api/users')
            .set('x-test-user', JSON.stringify({ uid: 'attacker', businessId: null }));

        // Vulnerability Check:
        // If status is 200 and we get the leaked businesses, the vulnerability is present.
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body.find(u => u.email === 'leaked@biz1.com')).toBeTruthy();

        // Verify we called getCollectionRef('businesses').get()
        expect(dbUtils.getCollectionRef).toHaveBeenCalledWith('businesses');
        expect(mockGet).toHaveBeenCalled();
    });
});
