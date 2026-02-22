const express = require('express');
const router = express.Router();
const { db } = require('../utils/db');
const { authRequired } = require('../middleware/auth');

/**
 * Complete business onboarding
 * Creates business entity and associates with user
 */
router.post('/complete', authRequired, async (req, res) => {
    try {
        const userId = req.user.id || req.user.uid;
        const { businessName, industry, address, phone, email, website } = req.body;

        // Validate required fields
        if (!businessName || !industry) {
            return res.status(400).json({
                error: 'Business name and industry are required'
            });
        }

        // Check if user already has a business
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (userData?.businessId && !userData?.requiresOnboarding) {
            return res.status(400).json({
                error: 'User already has a business associated'
            });
        }

        // Create business document
        const businessId = userId; // Use userId as businessId for single-owner businesses
        const businessData = {
            id: businessId,
            businessName,
            industry,
            address: address || {},
            phone: phone || '',
            email: email || userData?.email || '',
            website: website || '',
            ownerId: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active',
            plan: 'free', // Default plan
            settings: {
                timezone: 'America/New_York',
                currency: 'USD',
                dateFormat: 'MM/DD/YYYY'
            }
        };

        // Create business in Firestore
        await db.collection('businesses').doc(businessId).set(businessData);

        // Update user with businessId
        await db.collection('users').doc(userId).update({
            businessId: businessId,
            isBusinessOwner: true,
            onboardingCompleted: true,
            requiresOnboarding: false,
            updatedAt: new Date().toISOString()
        });

        console.log(`[Onboarding] User ${userId} completed onboarding for business ${businessId}`);

        res.json({
            success: true,
            businessId,
            business: businessData,
            message: 'Onboarding completed successfully'
        });
    } catch (error) {
        console.error('[Onboarding] Error:', error);
        res.status(500).json({
            error: 'Failed to complete onboarding',
            message: error.message
        });
    }
});

/**
 * Get onboarding status
 */
router.get('/status', authRequired, async (req, res) => {
    try {
        const userId = req.user.id || req.user.uid;

        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        const status = {
            requiresOnboarding: userData.requiresOnboarding || false,
            onboardingCompleted: userData.onboardingCompleted || false,
            hasBusinessId: !!userData.businessId,
            businessId: userData.businessId || null
        };

        res.json(status);
    } catch (error) {
        console.error('[Onboarding] Error fetching status:', error);
        res.status(500).json({ error: 'Failed to fetch onboarding status' });
    }
});

/**
 * Skip onboarding (for testing/development only)
 * Should be disabled in production
 */
if (process.env.NODE_ENV !== 'production') {
    router.post('/skip', authRequired, async (req, res) => {
        try {
            const userId = req.user.id || req.user.uid;

            await db.collection('users').doc(userId).update({
                requiresOnboarding: false,
                onboardingCompleted: true,
                updatedAt: new Date().toISOString()
            });

            res.json({
                success: true,
                message: 'Onboarding skipped (development mode only)'
            });
        } catch (error) {
            console.error('[Onboarding] Error skipping:', error);
            res.status(500).json({ error: 'Failed to skip onboarding' });
        }
    });
}

module.exports = router;
