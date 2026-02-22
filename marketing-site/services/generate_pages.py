# Service page generator for BOOTMARK marketing site
# Generates all 20 service landing pages with pricing tiers and proper headers

services = [
    {
        "filename": "shoveling.html",
        "icon": "⛏️",
        "title": "Neighborhood Shoveling",
        "subtitle": "Professional Snow Shoveling Service",
        "description": "Get your sidewalks, walkways, and driveways hand-shoveled by local professionals. Perfect for areas where plowing isn't practical. Book on-demand or purchase credit packages for the season.",
        "service_param": "shoveling",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Perfect for small properties"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Best for regular shoveling needs"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Maximum coverage all winter"}
        ]
    },
    {
        "filename": "snow-blowing.html",
        "icon": "💨",
        "title": "Snow Blowing",
        "subtitle": "Efficient Snow Blowing Service",
        "description": "Professional snow blowing for medium to large properties. Faster than shoveling, more precise than plowing. Perfect for driveways, walkways, and parking areas.",
        "service_param": "snow-blowing",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Great for occasional use"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Best value for regular service"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "All-season coverage"}
        ]
    },
    {
        "filename": "salting.html",
        "icon": "🧂",
        "title": "Salting Service",
        "subtitle": "Professional Ice Control & De-icing",
        "description": "Keep your property safe with professional salting and de-icing services. Prevent slips and falls with timely ice treatment. Available as standalone service or add-on to snow removal.",
        "service_param": "salting",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Essential ice control"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Regular ice prevention"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Complete ice management"}
        ]
    },
    {
        "filename": "lawn-mowing.html",
        "icon": "🌿",
        "title": "Lawn Mowing Near Me",
        "subtitle": "Professional Lawn Mowing Service",
        "description": "Keep your lawn looking pristine with regular professional mowing service. Weekly, bi-weekly, or on-demand scheduling available. Purchase credit packages for seasonal savings.",
        "service_param": "lawn-mowing",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Perfect for small lawns"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Best for regular mowing"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Full season coverage"}
        ]
    },
    {
        "filename": "leaf-removal.html",
        "icon": "🍂",
        "title": "Leaf Removal and Yard Clean Up",
        "subtitle": "Complete Fall Cleanup Service",
        "description": "Professional leaf removal and yard cleanup for fall season. We'll clear leaves, debris, and prepare your yard for winter. One-time or recurring service available.",
        "service_param": "leaf-removal",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Single cleanup service"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Multiple cleanups"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "All-season yard care"}
        ]
    },
    {
        "filename": "mulch-delivery.html",
        "icon": "🚚",
        "title": "Mulch Delivery Near Me",
        "subtitle": "Professional Mulch Delivery & Installation",
        "description": "Get premium mulch delivered and installed by professionals. Choose from various mulch types and colors. We'll deliver, spread, and clean up - you just enjoy the results.",
        "service_param": "mulch-delivery",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Small garden beds"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Medium properties"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Large properties"}
        ]
    },
    {
        "filename": "gutter-cleanup.html",
        "icon": "🏠",
        "title": "Gutter Clean Up Near Me",
        "subtitle": "Professional Gutter Cleaning Service",
        "description": "Protect your home with professional gutter cleaning. We'll remove debris, check for damage, and ensure proper water flow. Spring and fall cleaning packages available.",
        "service_param": "gutter-cleanup",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Single-story homes"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Two-story homes"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Large or complex homes"}
        ]
    },
    {
        "filename": "pet-waste.html",
        "icon": "🐾",
        "title": "Pet Waste Removal",
        "subtitle": "Professional Pet Waste Cleanup",
        "description": "Keep your yard clean and healthy with regular pet waste removal service. Weekly, bi-weekly, or monthly service available. We'll scoop, bag, and dispose of all pet waste.",
        "service_param": "pet-waste",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Monthly service"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Bi-weekly service"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Weekly service"}
        ]
    },
    {
        "filename": "aeration.html",
        "icon": "🌱",
        "title": "Aeration",
        "subtitle": "Professional Lawn Aeration Service",
        "description": "Improve your lawn's health with professional aeration. We'll perforate the soil to allow air, water, and nutrients to reach grass roots. Spring and fall aeration available.",
        "service_param": "aeration",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Small lawns"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Medium lawns"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Large lawns"}
        ]
    },
    {
        "filename": "trimming-pruning.html",
        "icon": "✂️",
        "title": "Trimming & Pruning Near Me",
        "subtitle": "Professional Tree & Shrub Care",
        "description": "Keep your trees and shrubs healthy and beautiful with professional trimming and pruning. We'll shape, thin, and remove dead branches to promote healthy growth.",
        "service_param": "trimming-pruning",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Small shrubs"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Trees & shrubs"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Large properties"}
        ]
    },
    {
        "filename": "haul-away.html",
        "icon": "🚛",
        "title": "Haul Away Near Me",
        "subtitle": "Professional Junk Removal Service",
        "description": "Get rid of unwanted items, debris, and junk with our professional haul away service. We'll load, haul, and dispose of everything responsibly. Same-day service available.",
        "service_param": "haul-away",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Small loads"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Medium loads"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Large loads"}
        ]
    },
    {
        "filename": "custom-quotes.html",
        "icon": "📋",
        "title": "Custom Project Quotes",
        "subtitle": "Get a Quote for Your Project",
        "description": "Need something specific? Get a custom quote for your unique project. From landscaping to property maintenance, we'll create a tailored solution for your needs.",
        "service_param": "custom-quotes",
        "packages": [
            {"name": "Consultation", "price": "Contact", "discount": "N/A", "desc": "Free project consultation"},
            {"name": "Small Project", "price": "Contact", "discount": "N/A", "desc": "Custom pricing"},
            {"name": "Large Project", "price": "Contact", "discount": "N/A", "desc": "Volume discounts available"}
        ]
    },
    {
        "filename": "gardening.html",
        "icon": "🌻",
        "title": "Gardening Near Me",
        "subtitle": "Professional Gardening Service",
        "description": "Transform your outdoor space with professional gardening services. From planting to maintenance, we'll help you create and maintain a beautiful garden.",
        "service_param": "gardening",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Small gardens"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Medium gardens"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Large gardens"}
        ]
    },
    {
        "filename": "fertilization.html",
        "icon": "🌾",
        "title": "Grass Fertilization Near Me",
        "subtitle": "Professional Lawn Fertilization",
        "description": "Get a lush, green lawn with professional fertilization service. We use premium products and apply at optimal times for maximum results. Seasonal programs available.",
        "service_param": "fertilization",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "2 applications/year"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "4 applications/year"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "6 applications/year"}
        ]
    },
    {
        "filename": "power-washing.html",
        "icon": "💦",
        "title": "Power Washing Near Me",
        "subtitle": "Professional Pressure Washing",
        "description": "Restore your property's appearance with professional power washing. We'll clean driveways, sidewalks, decks, siding, and more. Residential and commercial service available.",
        "service_param": "power-washing",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Small areas"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Medium properties"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Large properties"}
        ]
    },
    {
        "filename": "sprinkler-blowout.html",
        "icon": "💧",
        "title": "Sprinkler Blowout Near Me",
        "subtitle": "Professional Sprinkler Winterization",
        "description": "Protect your irrigation system from winter damage with professional sprinkler blowout service. We'll clear all water from lines to prevent freezing and cracking.",
        "service_param": "sprinkler-blowout",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Small systems"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Medium systems"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Large systems"}
        ]
    },
    {
        "filename": "aerial-photography.html",
        "icon": "📸",
        "title": "Aerial Photography",
        "subtitle": "Professional Drone Photography",
        "description": "Capture stunning aerial views of your property with professional drone photography. Perfect for real estate, events, or property documentation. High-resolution photos and videos.",
        "service_param": "aerial-photography",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "Photos only"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "Photos + video"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Full production"}
        ]
    },
    {
        "filename": "firewood-delivery.html",
        "icon": "🔥",
        "title": "Firewood Delivery Near Me",
        "subtitle": "Premium Firewood Delivery",
        "description": "Get seasoned, ready-to-burn firewood delivered to your door. We offer various wood types and quantities. Stacking service available. Stay warm all winter long.",
        "service_param": "firewood-delivery",
        "packages": [
            {"name": "Basic", "price": "$300", "discount": "10%", "desc": "1/4 cord"},
            {"name": "Standard", "price": "$600", "discount": "15%", "desc": "1/2 cord"},
            {"name": "Premium", "price": "$1,200", "discount": "20%", "desc": "Full cord"}
        ]
    }
]

# Full header HTML with dropdown
header_html = '''    <!-- Header (matching main site) -->
    <header class="header" id="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <a href="../index.html" style="display: flex; align-items: center; gap: 12px; text-decoration: none;">
                        <img src="../assets/logo.jpg" alt="BOOTMARK Logo" width="40" height="40" style="border-radius: 4px;">
                        <span class="logo-text">BOOTMARK</span>
                    </a>
                </div>

                <nav class="nav" id="nav">
                    <!-- Book Outdoor Services Dropdown -->
                    <div class="nav-dropdown">
                        <button class="nav-link dropdown-toggle" id="servicesDropdown">
                            Book Outdoor Services
                            <svg class="dropdown-icon" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div class="dropdown-menu" id="servicesMenu">
                            <div class="dropdown-grid">
                                <a href="snow-plow.html" class="dropdown-item">
                                    <span class="service-icon">❄️</span>
                                    <span>Seasonal Snow Plow Packages</span>
                                </a>
                                <a href="snow-removal.html" class="dropdown-item">
                                    <span class="service-icon">🌨️</span>
                                    <span>Snow Removal Near Me</span>
                                </a>
                                <a href="shoveling.html" class="dropdown-item">
                                    <span class="service-icon">⛏️</span>
                                    <span>Neighborhood Shoveling</span>
                                </a>
                                <a href="snow-blowing.html" class="dropdown-item">
                                    <span class="service-icon">💨</span>
                                    <span>Snow Blowing</span>
                                </a>
                                <a href="salting.html" class="dropdown-item">
                                    <span class="service-icon">🧂</span>
                                    <span>Salting Service</span>
                                </a>
                                <a href="lawn-mowing.html" class="dropdown-item">
                                    <span class="service-icon">🌿</span>
                                    <span>Lawn Mowing Near Me</span>
                                </a>
                                <a href="leaf-removal.html" class="dropdown-item">
                                    <span class="service-icon">🍂</span>
                                    <span>Leaf Removal and Yard Clean Up</span>
                                </a>
                                <a href="mulch-delivery.html" class="dropdown-item">
                                    <span class="service-icon">🚚</span>
                                    <span>Mulch Delivery Near Me</span>
                                </a>
                                <a href="gutter-cleanup.html" class="dropdown-item">
                                    <span class="service-icon">🏠</span>
                                    <span>Gutter Clean Up Near Me</span>
                                </a>
                                <a href="pet-waste.html" class="dropdown-item">
                                    <span class="service-icon">🐾</span>
                                    <span>Pet Waste Removal</span>
                                </a>
                                <a href="aeration.html" class="dropdown-item">
                                    <span class="service-icon">🌱</span>
                                    <span>Aeration</span>
                                </a>
                                <a href="trimming-pruning.html" class="dropdown-item">
                                    <span class="service-icon">✂️</span>
                                    <span>Trimming & Pruning Near Me</span>
                                </a>
                                <a href="haul-away.html" class="dropdown-item">
                                    <span class="service-icon">🚛</span>
                                    <span>Haul Away Near Me</span>
                                </a>
                                <a href="custom-quotes.html" class="dropdown-item">
                                    <span class="service-icon">📋</span>
                                    <span>Custom Project Quotes</span>
                                </a>
                                <a href="gardening.html" class="dropdown-item">
                                    <span class="service-icon">🌻</span>
                                    <span>Gardening Near Me</span>
                                </a>
                                <a href="fertilization.html" class="dropdown-item">
                                    <span class="service-icon">🌾</span>
                                    <span>Grass Fertilization Near Me</span>
                                </a>
                                <a href="power-washing.html" class="dropdown-item">
                                    <span class="service-icon">💦</span>
                                    <span>Power Washing Near Me</span>
                                </a>
                                <a href="sprinkler-blowout.html" class="dropdown-item">
                                    <span class="service-icon">💧</span>
                                    <span>Sprinkler Blowout Near Me</span>
                                </a>
                                <a href="aerial-photography.html" class="dropdown-item">
                                    <span class="service-icon">📸</span>
                                    <span>Aerial Photography</span>
                                </a>
                                <a href="firewood-delivery.html" class="dropdown-item">
                                    <span class="service-icon">🔥</span>
                                    <span>Firewood Delivery Near Me</span>
                                </a>
                            </div>
                        </div>
                    </div>
                    <a href="../index.html#features" class="nav-link" data-i18n="header.features">Features</a>
                    <a href="../index.html#industries" class="nav-link" data-i18n="header.industries">Industries</a>
                    <a href="../index.html#how-it-works" class="nav-link" data-i18n="header.howItWorks">How It Works</a>
                    <a href="../index.html#pricing" class="nav-link" data-i18n="header.pricing">Pricing</a>
                    <a href="../index.html#faq" class="nav-link" data-i18n="header.faq">FAQ</a>
                </nav>

                <div class="header-actions">
                    <select id="language-select" class="language-select" aria-label="Select Language">
                        <option value="en">🇺🇸 EN</option>
                        <option value="es">🇪🇸 ES</option>
                        <option value="fr">🇫🇷 FR</option>
                    </select>
                    <a href="/login" class="btn btn-secondary">Sign In</a>
                    <a href="/register" class="btn btn-primary">Start Free Trial</a>
                </div>

                <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Toggle Menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </div>
    </header>'''

# JavaScript for dropdown functionality
footer_js = '''
    <script>
        // Dropdown menu functionality
        const servicesDropdown = document.getElementById('servicesDropdown');
        const servicesMenu = document.getElementById('servicesMenu');
        const navDropdown = document.querySelector('.nav-dropdown');

        if (servicesDropdown && servicesMenu) {
            // Toggle dropdown on click
            servicesDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                servicesMenu.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!navDropdown.contains(e.target)) {
                    servicesMenu.classList.remove('show');
                }
            });

            // Hover functionality for desktop
            navDropdown.addEventListener('mouseenter', () => {
                if (window.innerWidth > 768) {
                    servicesMenu.classList.add('show');
                }
            });

            navDropdown.addEventListener('mouseleave', () => {
                if (window.innerWidth > 768) {
                    servicesMenu.classList.remove('show');
                }
            });
        }

        // Language selector
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                console.log('Language changed to:', e.target.value);
                // Language switching functionality would go here
            });
        }

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const nav = document.getElementById('nav');
        if (mobileMenuBtn && nav) {
            mobileMenuBtn.addEventListener('click', () => {
                nav.classList.toggle('active');
                mobileMenuBtn.classList.toggle('active');
            });
        }
    </script>'''

# HTML template with full header
template = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{{description}}">
    <title>{{title}} | BOOTMARK</title>
    <link rel="stylesheet" href="../styles.css">
    <link rel="stylesheet" href="services.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="service-page">
{header_html}

    <section class="service-hero">
        <div class="container">
            <h1>{{icon}} {{title}}</h1>
            <p class="subtitle">{{subtitle}}</p>
            <p class="description">{{description}}</p>
            <a href="/register?service={{service_param}}" class="cta-button">Book Now →</a>
        </div>
    </section>

    <section class="pricing-section">
        <div class="container">
            <h2>Choose Your Package</h2>
            <p class="section-subtitle">Flexible credit packages with built-in savings</p>
            
            <div class="pricing-grid">
                <div class="pricing-card">
                    <div class="package-header">
                        <h3 class="package-name">{{pkg1_name}} Package</h3>
                        <div class="package-price">{{pkg1_price}}</div>
                        <p class="package-description">{{pkg1_desc}}</p>
                    </div>
                    <ul class="package-features">
                        <li>BOOTMARK service credits included</li>
                        <li>Save {{pkg1_discount}} on all services</li>
                        <li>Book anytime via app or website</li>
                        <li>Real-time crew tracking</li>
                        <li>Before/after service photos</li>
                        <li>Credits valid for 24 months</li>
                    </ul>
                    <a href="/register?service={{service_param}}&package=basic" class="package-button">Select Package</a>
                </div>

                <div class="pricing-card featured">
                    <span class="popular-badge">Most Popular</span>
                    <div class="package-header">
                        <h3 class="package-name">{{pkg2_name}} Package</h3>
                        <div class="package-price">{{pkg2_price}}</div>
                        <p class="package-description">{{pkg2_desc}}</p>
                    </div>
                    <ul class="package-features">
                        <li>BOOTMARK service credits included</li>
                        <li>Save {{pkg2_discount}} on all services</li>
                        <li>Priority scheduling</li>
                        <li>Real-time crew tracking</li>
                        <li>Before/after service photos</li>
                        <li>Credits valid for 24 months</li>
                    </ul>
                    <a href="/register?service={{service_param}}&package=standard" class="package-button">Select Package</a>
                </div>

                <div class="pricing-card">
                    <div class="package-header">
                        <h3 class="package-name">{{pkg3_name}} Package</h3>
                        <div class="package-price">{{pkg3_price}}</div>
                        <p class="package-description">{{pkg3_desc}}</p>
                    </div>
                    <ul class="package-features">
                        <li>BOOTMARK service credits included</li>
                        <li>Save {{pkg3_discount}} on all services</li>
                        <li>Priority scheduling</li>
                        <li>Real-time crew tracking</li>
                        <li>Before/after service photos</li>
                        <li>Credits valid for 24 months</li>
                    </ul>
                    <a href="/register?service={{service_param}}&package=premium" class="package-button">Select Package</a>
                </div>
            </div>
        </div>
    </section>

    <section class="info-section">
        <div class="container">
            <div class="info-grid">
                <div class="info-card">
                    <h3>What's Included</h3>
                    <ul>
                        <li>Professional service by trained crews</li>
                        <li>All equipment and materials provided</li>
                        <li>Flexible scheduling options</li>
                        <li>Real-time GPS tracking</li>
                        <li>Service completion photos</li>
                        <li>Satisfaction guaranteed</li>
                        <li>Easy online booking</li>
                    </ul>
                </div>
                <div class="info-card">
                    <h3>How It Works</h3>
                    <ul>
                        <li>Purchase credits at discounted rate</li>
                        <li>Book service via app or website</li>
                        <li>Get matched with nearby crew</li>
                        <li>Track crew arrival in real-time</li>
                        <li>Receive completion notification</li>
                        <li>Review service and crew</li>
                        <li>Credits auto-applied to invoice</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>

    <section class="contact-cta">
        <div class="container">
            <h2>Need a Custom Quote?</h2>
            <p>Contact us for commercial properties or special requirements</p>
            <div class="cta-buttons">
                <a href="mailto:helpdesk@bootmarkapp.com" class="btn btn-outline-white btn-lg">Contact for Quote</a>
                <a href="/register?service={{service_param}}" class="btn btn-outline-white btn-lg">Get Started</a>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <div class="footer-content" style="text-align: center; padding: var(--space-8) 0;">
                <p>&copy; 2024 BOOTMARK. All rights reserved.</p>
                <p style="margin-top: var(--space-4);"><a href="../index.html" style="color: var(--gray-400); text-decoration: none;">Back to Home</a></p>
            </div>
        </div>
    </footer>
{footer_js}
</body>
</html>'''

# Generate all service pages
import os

output_dir = "c:/Users/Touseeq/Downloads/09-12-25/BOOTMARK--main/marketing-site/services"
os.makedirs(output_dir, exist_ok=True)

for service in services:
    html = template.format(
        title=service["title"],
        icon=service["icon"],
        subtitle=service["subtitle"],
        description=service["description"],
        service_param=service["service_param"],
        pkg1_name=service["packages"][0]["name"],
        pkg1_price=service["packages"][0]["price"],
        pkg1_discount=service["packages"][0]["discount"],
        pkg1_desc=service["packages"][0]["desc"],
        pkg2_name=service["packages"][1]["name"],
        pkg2_price=service["packages"][1]["price"],
        pkg2_discount=service["packages"][1]["discount"],
        pkg2_desc=service["packages"][1]["desc"],
        pkg3_name=service["packages"][2]["name"],
        pkg3_price=service["packages"][2]["price"],
        pkg3_discount=service["packages"][2]["discount"],
        pkg3_desc=service["packages"][2]["desc"]
    )
    
    filepath = os.path.join(output_dir, service["filename"])
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Created: {service['filename']}")

print(f"\nSuccessfully generated {len(services)} service pages with full headers!")
