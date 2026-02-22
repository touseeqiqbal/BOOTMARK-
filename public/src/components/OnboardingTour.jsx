import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../utils/AuthContext';
import '../styles/OnboardingTour.css';

/**
 * Interactive Onboarding Tour Component
 * Guides new users through key features
 */

const TOUR_STEPS = [
    {
        id: 'dashboard',
        target: '[data-tour="dashboard"]',
        title: 'Welcome to BOOTMARK!',
        content: 'This is your dashboard where you can see an overview of your business operations, recent work orders, and key metrics.',
        position: 'bottom',
        route: '/dashboard'
    },
    {
        id: 'work-orders',
        target: '[data-tour="work-orders"]',
        title: 'Work Orders',
        content: 'Create and manage work orders here. Track jobs from draft to completion, assign crews, and generate invoices.',
        position: 'right',
        route: '/work-orders'
    },
    {
        id: 'clients',
        target: '[data-tour="clients"]',
        title: 'Client Management',
        content: 'Manage all your clients, their properties, and service history. Send invoices and track payments.',
        position: 'right',
        route: '/clients'
    },
    {
        id: 'scheduling',
        target: '[data-tour="scheduling"]',
        title: 'Scheduling',
        content: 'Schedule jobs, assign crews, and manage your calendar. Set up recurring jobs for regular clients.',
        position: 'right',
        route: '/scheduling'
    },
    {
        id: 'sidebar',
        target: '.modern-sidebar',
        title: 'Navigation',
        content: 'Use the sidebar to navigate between sections. You can search, favorite items, and collapse sections to reduce clutter.',
        position: 'right',
        route: '/dashboard'
    }
];

export default function OnboardingTour() {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState(new Set());
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Check if user has completed onboarding
        const hasCompletedTour = localStorage.getItem('onboardingTourCompleted');
        const isNewUser = user && !hasCompletedTour;
        
        // Show tour for new users or if they haven't seen it
        if (isNewUser && location.pathname === '/dashboard') {
            // Small delay to ensure page is loaded
            const timer = setTimeout(() => {
                setIsActive(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user, location.pathname]);

    useEffect(() => {
        if (!isActive) return;

        const step = TOUR_STEPS[currentStep];
        if (!step) return;

        // Navigate to the step's route if needed
        if (location.pathname !== step.route) {
            navigate(step.route);
        }

        // Wait for element to appear, then highlight
        const highlightElement = () => {
            const element = document.querySelector(step.target);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add highlight class
                element.classList.add('tour-highlight');
            } else {
                // Retry after a short delay
                setTimeout(highlightElement, 500);
            }
        };

        highlightElement();

        // Cleanup on unmount or step change
        return () => {
            const element = document.querySelector(step.target);
            if (element) {
                element.classList.remove('tour-highlight');
            }
        };
    }, [isActive, currentStep, location.pathname, navigate]);

    const handleNext = () => {
        const step = TOUR_STEPS[currentStep];
        setCompletedSteps(prev => new Set([...prev, step.id]));
        
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkip = () => {
        handleComplete();
    };

    const handleComplete = () => {
        setIsActive(false);
        localStorage.setItem('onboardingTourCompleted', 'true');
        
        // Remove all highlights
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
        });
    };

    if (!isActive) return null;

    const step = TOUR_STEPS[currentStep];
    if (!step) return null;

    const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

    return (
        <>
            {/* Overlay */}
            <div className="tour-overlay" onClick={handleSkip} />
            
            {/* Tooltip */}
            <div className="tour-tooltip" data-position={step.position}>
                <div className="tour-tooltip-header">
                    <div className="tour-progress">
                        <div className="tour-progress-bar" style={{ width: `${progress}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
                        <h3 className="tour-tooltip-title">{step.title}</h3>
                        <button
                            className="tour-close-btn"
                            onClick={handleSkip}
                            aria-label="Skip tour"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
                <p className="tour-tooltip-content">{step.content}</p>
                <div className="tour-tooltip-footer">
                    <button className="tour-btn tour-btn-skip" onClick={handleSkip}>
                        Skip Tour
                    </button>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {currentStep > 0 && (
                            <button className="tour-btn tour-btn-secondary" onClick={handlePrevious}>
                                <ChevronLeft size={16} /> Previous
                            </button>
                        )}
                        <button className="tour-btn tour-btn-primary" onClick={handleNext}>
                            {currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
                            {currentStep < TOUR_STEPS.length - 1 && <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
                <div className="tour-step-indicator">
                    Step {currentStep + 1} of {TOUR_STEPS.length}
                </div>
            </div>
        </>
    );
}

// Hook to add tour data attributes to elements
export function useTourStep(stepId) {
    useEffect(() => {
        const element = document.querySelector(`[data-tour="${stepId}"]`);
        if (element) {
            // Element is ready
        }
    }, [stepId]);
}

