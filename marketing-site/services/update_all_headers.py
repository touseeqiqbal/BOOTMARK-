#!/usr/bin/env python3
"""
Update all service page headers to match the standardized compact design
"""

import os
import re

# Service pages directory
SERVICES_DIR = r"c:\Users\Touseeq\Downloads\09-12-25\BOOTMARK--main\marketing-site\services"

# Standard header HTML (compact version)
STANDARD_HEADER = '''    <!-- Header (matching main site) -->
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
                    <div class="language-icons">
                        <button class="lang-icon active" data-lang="en" title="English">🇺🇸</button>
                        <button class="lang-icon" data-lang="es" title="Español">🇪🇸</button>
                        <button class="lang-icon" data-lang="fr" title="Français">🇫🇷</button>
                    </div>
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

# Standard JavaScript
STANDARD_JS = '''
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

        // Language icon selector
        const langIcons = document.querySelectorAll('.lang-icon');
        langIcons.forEach(icon => {
            icon.addEventListener('click', () => {
                langIcons.forEach(i => i.classList.remove('active'));
                icon.classList.add('active');
                console.log('Language changed to:', icon.dataset.lang);
            });
        });

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

def update_service_page(filepath):
    """Update a single service page with the standard header"""
    print(f"Updating {os.path.basename(filepath)}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace header section (from <header to </header>)
    header_pattern = r'<header class="header"[^>]*>.*?</header>'
    content = re.sub(header_pattern, STANDARD_HEADER, content, flags=re.DOTALL)
    
    # Add or replace JavaScript before </body>
    # First remove any existing script section
    script_pattern = r'<script>.*?</script>\s*</body>'
    if re.search(script_pattern, content, flags=re.DOTALL):
        content = re.sub(script_pattern, STANDARD_JS + '\n</body>', content, flags=re.DOTALL)
    else:
        # Add script before </body>
        content = content.replace('</body>', STANDARD_JS + '\n</body>')
    
    # Write updated content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"[OK] Updated {os.path.basename(filepath)}")

def main():
    """Update all service pages"""
    html_files = [f for f in os.listdir(SERVICES_DIR) if f.endswith('.html')]
    
    print(f"Found {len(html_files)} service pages to update\n")
    
    for filename in html_files:
        filepath = os.path.join(SERVICES_DIR, filename)
        try:
            update_service_page(filepath)
        except Exception as e:
            print(f"[ERROR] Error updating {filename}: {e}")
    
    print(f"\n[SUCCESS] Updated {len(html_files)} service pages!")
    print("All pages now have consistent, compact headers matching the main site.")

if __name__ == "__main__":
    main()

if __name__ == "__main__":
    main()
