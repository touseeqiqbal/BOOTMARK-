import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import '../../styles/Breadcrumb.css';

/**
 * Breadcrumb Navigation Component
 * Shows navigation path: Dashboard > Section > Item
 */

export default function Breadcrumb({ items, className = '' }) {
  const location = useLocation();

  // Auto-generate breadcrumbs from route if items not provided
  const breadcrumbItems = items || generateBreadcrumbsFromRoute(location.pathname);

  if (breadcrumbItems.length === 0) return null;

  return (
    <nav className={`breadcrumb ${className}`} aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isFirst = index === 0;

          return (
            <li key={item.path || index} className="breadcrumb-item">
              {isFirst && !item.icon && (
                <Home size={16} className="breadcrumb-home-icon" aria-hidden="true" />
              )}
              {item.icon && (
                <span className="breadcrumb-icon" aria-hidden="true">{item.icon}</span>
              )}
              {isLast ? (
                <span className="breadcrumb-current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link to={item.path} className="breadcrumb-link">
                  {item.label}
                </Link>
              )}
              {!isLast && (
                <ChevronRight 
                  size={16} 
                  className="breadcrumb-separator" 
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Helper function to generate breadcrumbs from route
function generateBreadcrumbsFromRoute(pathname) {
  const items = [];
  const pathParts = pathname.split('/').filter(Boolean);

  // Always start with Dashboard
  items.push({
    label: 'Dashboard',
    path: '/dashboard',
  });

  // Map common routes to labels
  const routeLabels = {
    'work-orders': 'Work Orders',
    'clients': 'Clients',
    'customers': 'Clients',
    'invoices': 'Invoices',
    'estimates': 'Estimates',
    'contracts': 'Contracts',
    'scheduling': 'Scheduling',
    'employees': 'Employees',
    'materials': 'Materials',
    'services': 'Services',
    'products': 'Products',
    'properties': 'Properties',
    'forms': 'Forms',
    'reports': 'Reports',
    'analytics': 'Analytics',
    'settings': 'Settings',
    'account-settings': 'Account Settings',
    'app-customization': 'App Customization',
    'user-management': 'User Management',
    'templates': 'Templates',
    'workflows': 'Workflows',
    'job-workflows': 'Job Workflows',
    'new': 'New',
    'edit': 'Edit',
  };

  // Build breadcrumb items from path
  let currentPath = '';
  pathParts.forEach((part, index) => {
    currentPath += `/${part}`;
    
    // Skip numeric IDs (they're usually item IDs)
    if (!isNaN(part) && index > 0) {
      // This is likely an ID, use previous part's label
      return;
    }

    const label = routeLabels[part] || formatLabel(part);
    items.push({
      label,
      path: currentPath,
    });
  });

  return items;
}

function formatLabel(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

