/**
 * Form Validation Utilities
 * Provides inline validation with real-time feedback
 */

import React from 'react';

export const validateEmail = (email) => {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return null;
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }
  return null;
};

export const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: '', color: '' };
  
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
  
  if (strength <= 2) return { strength, label: 'Weak', color: '#ef4444' };
  if (strength <= 4) return { strength, label: 'Medium', color: '#f59e0b' };
  if (strength <= 5) return { strength, label: 'Strong', color: '#10b981' };
  return { strength, label: 'Very Strong', color: '#059669' };
};

export const validateRequired = (value, fieldName = 'This field') => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validatePhone = (phone) => {
  if (!phone) return null; // Optional field
  const phoneRegex = /^[\d\s\-\(\)]+$/;
  if (!phoneRegex.test(phone)) return 'Please enter a valid phone number';
  return null;
};

export const validateUrl = (url) => {
  if (!url) return null; // Optional field
  try {
    new URL(url);
    return null;
  } catch {
    return 'Please enter a valid URL';
  }
};

/**
 * Hook for form field validation
 */
export function useFieldValidation(initialValue = '', validators = []) {
  const [value, setValue] = React.useState(initialValue);
  const [error, setError] = React.useState(null);
  const [touched, setTouched] = React.useState(false);

  const validate = React.useCallback(() => {
    for (const validator of validators) {
      const errorMessage = validator(value);
      if (errorMessage) {
        setError(errorMessage);
        return false;
      }
    }
    setError(null);
    return true;
  }, [value, validators]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (touched) {
      validate();
    }
  };

  const handleBlur = () => {
    setTouched(true);
    validate();
  };

  return {
    value,
    error,
    touched,
    isValid: !error && touched,
    setValue,
    setError,
    handleChange,
    handleBlur,
    validate,
  };
}

