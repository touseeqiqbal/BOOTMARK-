// ========================================
// URL CONFIGURATION
// ========================================

// Update all app links based on environment
document.addEventListener('DOMContentLoaded', () => {
    const appUrl = window.BOOTMARK_CONFIG?.appUrl || 'http://localhost:3000';

    // Update all links that point to the app
    const appLinks = document.querySelectorAll('a[href*="localhost:3000"]');
    appLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href.includes('localhost:3000/login')) {
            link.setAttribute('href', `${appUrl}/login`);
        } else if (href.includes('localhost:3000/register')) {
            link.setAttribute('href', `${appUrl}/register`);
        }
    });

    console.log('App links updated to:', appUrl);
});

// ========================================
// MOBILE MENU TOGGLE
// ========================================

const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const nav = document.getElementById('nav');

if (mobileMenuBtn && nav) {
    mobileMenuBtn.addEventListener('click', () => {
        nav.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    });

    // Close menu when clicking on a link
    const navLinks = nav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
            document.body.classList.remove('menu-open');
        });
    });
}

// ========================================
// STICKY HEADER ON SCROLL
// ========================================

const header = document.getElementById('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// ========================================
// FAQ ACCORDION
// ========================================

const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
        // Close all other items
        faqItems.forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove('active');
            }
        });

        // Toggle current item
        item.classList.toggle('active');
    });
});

// ========================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ========================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');

        // Don't prevent default for empty hash
        if (href === '#') return;

        e.preventDefault();

        const target = document.querySelector(href);
        if (target) {
            const headerHeight = header.offsetHeight;
            const targetPosition = target.offsetTop - headerHeight - 20;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ========================================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ========================================

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-up');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements for animation
const animateElements = document.querySelectorAll('.feature-card, .testimonial-card, .pricing-card, .step');
animateElements.forEach(el => observer.observe(el));

// ========================================
// FORM VALIDATION (if you add a contact form)
// ========================================

// Example form validation - uncomment and customize if needed
/*
const contactForm = document.getElementById('contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData);
        
        // Basic validation
        if (!data.email || !data.name || !data.message) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        // Here you would typically send the data to your backend
        console.log('Form data:', data);
        alert('Thank you for your message! We\'ll get back to you soon.');
        contactForm.reset();
    });
}
*/

// ========================================
// PRICING TOGGLE (Annual/Monthly) - Optional
// ========================================

// Uncomment if you want to add pricing toggle functionality
/*
const pricingToggle = document.getElementById('pricing-toggle');
const pricingCards = document.querySelectorAll('.pricing-card');

if (pricingToggle) {
    pricingToggle.addEventListener('change', (e) => {
        const isAnnual = e.target.checked;
        
        pricingCards.forEach(card => {
            const monthlyPrice = card.dataset.monthly;
            const annualPrice = card.dataset.annual;
            const priceElement = card.querySelector('.price');
            
            if (isAnnual) {
                priceElement.textContent = `$${annualPrice}`;
                card.querySelector('.period').textContent = '/year';
            } else {
                priceElement.textContent = `$${monthlyPrice}`;
                card.querySelector('.period').textContent = '/month';
            }
        });
    });
}
*/

// ========================================
// LAZY LOADING IMAGES
// ========================================

// Lazy load images when they come into viewport
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    const lazyImages = document.querySelectorAll('img.lazy');
    lazyImages.forEach(img => imageObserver.observe(img));
}

// ========================================
// ANALYTICS TRACKING (Optional)
// ========================================

// Track button clicks for analytics
const trackEvent = (category, action, label) => {
    // Google Analytics example (uncomment if you use GA)
    // if (typeof gtag !== 'undefined') {
    //     gtag('event', action, {
    //         'event_category': category,
    //         'event_label': label
    //     });
    // }

    console.log('Event tracked:', { category, action, label });
};

// Track CTA button clicks
document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', () => {
        trackEvent('CTA', 'click', btn.textContent.trim());
    });
});

// ========================================
// PERFORMANCE OPTIMIZATION
// ========================================

// Debounce function for scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Use debounced scroll for better performance
const debouncedScroll = debounce(() => {
    // Add any scroll-based functionality here
}, 100);

window.addEventListener('scroll', debouncedScroll);

// ========================================
// CONSOLE MESSAGE
// ========================================

console.log('%c🌿 BOOTMARK Marketing Site', 'color: #F18900; font-size: 20px; font-weight: bold;');
console.log('%cBuilt with vanilla HTML, CSS, and JavaScript', 'color: #4CAF50; font-size: 14px;');
console.log('%cReady to customize? Check out the code!', 'color: #666; font-size: 12px;');
