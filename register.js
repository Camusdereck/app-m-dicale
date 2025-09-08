// ===== REGISTRATION JAVASCRIPT =====

document.addEventListener('DOMContentLoaded', function() {
    initRegistrationForms();
    initPasswordToggle();
    initPhoneFormatting();
    initFormValidation();
});

// ===== INITIALIZE REGISTRATION FORMS =====
function initRegistrationForms() {
    const patientForm = document.getElementById('patientForm');
    const doctorForm = document.getElementById('doctorForm');
    
    if (patientForm) {
        patientForm.addEventListener('submit', (e) => handleRegistration(e, 'patient'));
    }
    
    if (doctorForm) {
        doctorForm.addEventListener('submit', (e) => handleRegistration(e, 'doctor'));
    }
    
    // Tab switching
    const tabs = document.querySelectorAll('#userTypeTabs button');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Clear any existing errors when switching tabs
            clearAllErrors();
        });
    });
}

// ===== HANDLE REGISTRATION SUBMISSION =====
async function handleRegistration(e, userType) {
    e.preventDefault();
    
    const form = e.target;
    const formData = extractFormData(form, userType);
    
    // Validate form
    if (!validateRegistrationForm(formData, userType)) {
        return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Création du compte...';
    
    try {
        // Simulate API call
        await simulateRegistration(formData, userType);
        
        // Show success message
        MediConnectUtils.showFormSuccess(form.id, 
            `Compte ${userType === 'patient' ? 'patient' : 'médecin'} créé avec succès ! Vérifiez votre email pour l'activation.`
        );
        
        // Clear form
        form.reset();
        
        // Redirect to login after success
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
        
    } catch (error) {
        console.error('Erreur d\'inscription:', error);
        MediConnectUtils.showFormError(form.id, 
            'Une erreur est survenue lors de la création du compte. Veuillez réessayer.'
        );
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

// ===== EXTRACT FORM DATA =====
function extractFormData(form, userType) {
    const isPatient = userType === 'patient';
    const prefix = isPatient ? 'patient' : 'doctor';
    
    const data = {
        userType,
        firstName: document.getElementById(`${prefix}FirstName`).value.trim(),
        lastName: document.getElementById(`${prefix}LastName`).value.trim(),
        email: document.getElementById(`${prefix}Email`).value.trim(),
        phone: document.getElementById(`${prefix}Phone`).value.trim(),
        password: document.getElementById(`${prefix}Password`).value,
        terms: document.getElementById(`${prefix}Terms`).checked
    };
    
    // Add doctor-specific fields
    if (!isPatient) {
        data.specialty = document.getElementById('specialty').value;
        data.orderNumber = document.getElementById('orderNumber').value.trim();
    }
    
    return data;
}

// ===== FORM VALIDATION =====
function validateRegistrationForm(data, userType) {
    let isValid = true;
    const prefix = userType === 'patient' ? 'patient' : 'doctor';
    
    // Clear previous errors
    clearFormErrors(userType);
    
    // First name validation
    if (!data.firstName || data.firstName.length < 2) {
        showFieldError(`${prefix}FirstName`, 'Le prénom doit contenir au moins 2 caractères.');
        isValid = false;
    }
    
    // Last name validation
    if (!data.lastName || data.lastName.length < 2) {
        showFieldError(`${prefix}LastName`, 'Le nom doit contenir au moins 2 caractères.');
        isValid = false;
    }
    
    // Email validation
    if (!data.email || !MediConnectUtils.validateEmail(data.email)) {
        showFieldError(`${prefix}Email`, 'Veuillez saisir un email valide.');
        isValid = false;
    }
    
    // Phone validation
    if (!data.phone || !MediConnectUtils.validatePhone(data.phone)) {
        showFieldError(`${prefix}Phone`, 'Veuillez saisir un numéro de téléphone valide.');
        isValid = false;
    }
    
    // Password validation
    if (!data.password || !MediConnectUtils.validatePassword(data.password)) {
        showFieldError(`${prefix}Password`, 'Le mot de passe doit contenir au moins 8 caractères.');
        isValid = false;
    }
    
    // Doctor-specific validation
    if (userType === 'doctor') {
        if (!data.specialty) {
            showFieldError('specialty', 'Veuillez choisir une spécialité.');
            isValid = false;
        }
        
        if (!data.orderNumber || data.orderNumber.length < 5) {
            showFieldError('orderNumber', 'Veuillez saisir un numéro d\'ordre valide.');
            isValid = false;
        }
    }
    
    // Terms validation
    if (!data.terms) {
        showFieldError(`${prefix}Terms`, 'Vous devez accepter les conditions d\'utilisation.');
        isValid = false;
    }
    
    return isValid;
}

// ===== PASSWORD TOGGLE FUNCTIONALITY =====
function initPasswordToggle() {
    // Patient password toggle
    const patientToggle = document.querySelector('#patient button[onclick*="patientPassword"]');
    if (patientToggle) {
        patientToggle.onclick = () => togglePassword('patientPassword');
    }
    
    // Doctor password toggle
    const doctorToggle = document.querySelector('#doctor button[onclick*="doctorPassword"]');
    if (doctorToggle) {
        doctorToggle.onclick = () => togglePassword('doctorPassword');
    }
}

function togglePassword(passwordFieldId) {
    const passwordInput = document.getElementById(passwordFieldId);
    const toggleButton = passwordInput.parentNode.querySelector('button');
    const icon = toggleButton.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// ===== PHONE NUMBER FORMATTING =====
function initPhoneFormatting() {
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    
    phoneInputs.forEach(input => {
        input.addEventListener('input', function() {
            MediConnectUtils.formatPhoneNumber(this);
        });
    });
}

// ===== REAL-TIME VALIDATION =====
function initFormValidation() {
    const allInputs = document.querySelectorAll('#patientForm input, #doctorForm input, #doctorForm select');
    
    allInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateSingleField(this);
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('is-invalid')) {
                validateSingleField(this);
            }
        });
    });
}

function validateSingleField(input) {
    const value = input.value.trim();
    const type = input.type;
    const id = input.id;
    
    // Clear previous validation state
    clearFieldError(input);
    
    // Skip validation if field is empty and not required
    if (!value && !input.hasAttribute('required')) {
        return true;
    }
    
    // Required field validation
    if (input.hasAttribute('required') && !value) {
        showFieldError(id, 'Ce champ est requis.');
        return false;
    }
    
    // Email validation
    if (type === 'email' && value && !MediConnectUtils.validateEmail(value)) {
        showFieldError(id, 'Format d\'email invalide.');
        return false;
    }
    
    // Phone validation
    if (type === 'tel' && value && !MediConnectUtils.validatePhone(value)) {
        showFieldError(id, 'Format de téléphone invalide.');
        return false;
    }
    
    // Password validation
    if (type === 'password' && value && value.length < 8) {
        showFieldError(id, 'Minimum 8 caractères requis.');
        return false;
    }
    
    // Name validation (minimum 2 characters)
    if ((id.includes('FirstName') || id.includes('LastName')) && value && value.length < 2) {
        showFieldError(id, 'Minimum 2 caractères requis.');
        return false;
    }
    
    // Order number validation for doctors
    if (id === 'orderNumber' && value && value.length < 5) {
        showFieldError(id, 'Numéro d\'ordre invalide.');
        return false;
    }
    
    // Mark field as valid if all checks pass
    input.classList.add('is-valid');
    return true;
}

// ===== ERROR HANDLING HELPERS =====
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.remove('is-valid');
        field.classList.add('is-invalid');
        
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = message;
            feedback.style.display = 'block';
        }
    }
}

function clearFieldError(input) {
    input.classList.remove('is-invalid');
    const feedback = input.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.style.display = 'none';
    }
}

function clearFormErrors(userType) {
    const form = document.getElementById(`${userType}Form`);
    if (form) {
        const invalidFields = form.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => {
            field.classList.remove('is-invalid');
        });
        
        const feedbacks = form.querySelectorAll('.invalid-feedback');
        feedbacks.forEach(feedback => {
            feedback.style.display = 'none';
        });
    }
}

function clearAllErrors() {
    clearFormErrors('patient');
    clearFormErrors('doctor');
}

// ===== SIMULATE API CALL =====
function simulateRegistration(userData, userType) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate email already exists error
            if (userData.email === 'existing@example.com') {
                reject(new Error('Email already exists'));
                return;
            }
            
            // Simulate successful registration
            resolve({
                success: true,
                userId: Math.random().toString(36).substr(2, 9),
                message: 'Registration successful'
            });
        }, 2000);
    });
}

// ===== SPECIALTY SELECTION ENHANCEMENT =====
document.addEventListener('DOMContentLoaded', function() {
    const specialtySelect = document.getElementById('specialty');
    if (specialtySelect) {
        specialtySelect.addEventListener('change', function() {
            if (this.value) {
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
            }
        });
    }
});

// Make togglePassword available globally
window.togglePassword = togglePassword;