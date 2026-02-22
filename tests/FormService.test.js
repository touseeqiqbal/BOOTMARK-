import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormService } from '../utils/FormService'; // I need to export the class in FormService.js

describe('FormService with DI', () => {
    let formService;
    let dbMocks;

    beforeEach(() => {
        dbMocks = {
            getDoc: vi.fn(),
            setDoc: vi.fn(),
            deleteDoc: vi.fn(),
            getCollectionRef: vi.fn(),
            db: {}
        };
        // No longer using the singleton, creating a new instance for each test
        // Assuming I will update FormService.js to export the class as well
        const { FormService: FormServiceClass } = require('../utils/FormService');
        formService = new FormServiceClass(dbMocks);
    });

    describe('getFormById', () => {
        it('should return a form when it exists', async () => {
            const mockForm = { id: 'form123', title: 'Test Form' };
            dbMocks.getDoc.mockResolvedValue(mockForm);

            const result = await formService.getFormById('form123');

            expect(dbMocks.getDoc).toHaveBeenCalledWith('forms', 'form123');
            expect(result).toEqual(mockForm);
        });

        it('should return null when form does not exist', async () => {
            dbMocks.getDoc.mockResolvedValue(null);

            const result = await formService.getFormById('nonexistent');

            expect(dbMocks.getDoc).toHaveBeenCalled();
            expect(result).toBeNull();
        });
    });

    describe('createForm', () => {
        it('should create a new form with default settings', async () => {
            const formData = { title: 'New Form' };
            const creatorId = 'user123';
            const ownerId = 'user123';

            dbMocks.setDoc.mockImplementation((coll, id, data) => Promise.resolve(data));

            const result = await formService.createForm(formData, creatorId, ownerId);

            expect(dbMocks.setDoc).toHaveBeenCalled();
            expect(result.title).toBe('New Form');
            expect(result.userId).toBe(ownerId);
            expect(result.shareKey).toBeDefined();
        });
    });
});
