// ===== CONTACT PAGE JAVASCRIPT =====

document.addEventListener('DOMContentLoaded', function() {
    initContactForm();
    initWhatsAppIntegration();
    initFormValidation();
    initAccordion();
});

// ===== CONTACT FORM HANDLING =====
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmission);
        
        // Real-time validation
        const inputs = contactForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => validateContactField(input));
            input.addEventListener('input', () => {
                if (input.classList.contains('is-invalid')) {
                    validateContactField(input);
                }
            });
        });
        
        // Phone formatting
        const phoneInput = contactForm.querySelector('input[type="tel"]');
        if (phoneInput) {
            phoneInput.addEventListener('input', function() {
                MediConnectUtils.formatPhoneNumber(this);
            });
        }
    }
}

// ===== HANDLE CONTACT FORM SUBMISSION =====
async function handleContactSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = extractContactFormData(form);
    
    // Validate form
    if (!validateContactForm(formData)) {
        return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Envoi en cours...';
    
    try {
        // Simulate API call
        await simulateContactSubmission(formData);
        
        // Show success message
        MediConnectUtils.showFormSuccess('contactForm', 
            'Votre message a été envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.'
        );
        
        // Clear form
        form.reset();
        clearContactFormValidation();
        
    } catch (error) {
        console.error('Erreur d\'envoi:', error);
        MediConnectUtils.showFormError('contactForm', 
            'Une erreur est survenue lors de l\'envoi. Veuillez réessayer ou nous contacter directement.'
        );
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

// ===== EXTRACT CONTACT FORM DATA =====
function extractContactFormData(form) {
    return {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value.trim(),
        privacy: document.getElementById('privacy').checked,
        timestamp: new Date().toISOString()
    };
}

// ===== CONTACT FORM VALIDATION =====
function validateContactForm(data) {
    let isValid = true;
    
    // Clear previous errors
    clearContactFormValidation();
    
    // First name validation
    if (!data.firstName || data.firstName.length < 2) {
        showContactFieldError('firstName', 'Le prénom doit contenir au moins 2 caractères.');
        isValid = false;
    }
    
    // Last name validation
    if (!data.lastName || data.lastName.length < 2) {
        showContactFieldError('lastName', 'Le nom doit contenir au moins 2 caractères.');
        isValid = false;
    }
    
    // Email validation
    if (!data.email || !MediConnectUtils.validateEmail(data.email)) {
        showContactFieldError('email', 'Veuillez saisir un email valide.');
        isValid = false;
    }
    
    // Phone validation (optional but if provided, must be valid)
    if (data.phone && !MediConnectUtils.validatePhone(data.phone)) {
        showContactFieldError('phone', 'Format de téléphone invalide.');
        isValid = false;
    }
    
    // Subject validation
    if (!data.subject) {
        showContactFieldError('subject', 'Veuillez choisir un sujet.');
        isValid = false;
    }
    
    // Message validation
    if (!data.message || data.message.length < 10) {
        showContactFieldError('message', 'Le message doit contenir au moins 10 caractères.');
        isValid = false;
    }
    
    // Privacy policy validation
    if (!data.privacy) {
        showContactFieldError('privacy', 'Vous devez accepter la politique de confidentialité.');
        isValid = false;
    }
    
    return isValid;
}

// ===== INDIVIDUAL FIELD VALIDATION =====
function validateContactField(input) {
    const value = input.value.trim();
    const id = input.id;
    const type = input.type;
    
    // Clear previous validation state
    clearContactFieldError(input);
    
    // Skip validation if field is empty and not required
    if (!value && !input.hasAttribute('required')) {
        return true;
    }
    
    // Required field validation
    if (input.hasAttribute('required') && !value) {
        showContactFieldError(id, 'Ce champ est requis.');
        return false;
    }
    
    // Specific field validations
    switch (id) {
        case 'firstName':
        case 'lastName':
            if (value && value.length < 2) {
                showContactFieldError(id, 'Minimum 2 caractères requis.');
                return false;
            }
            break;
            
        case 'email':
            if (value && !MediConnectUtils.validateEmail(value)) {
                showContactFieldError(id, 'Format d\'email invalide.');
                return false;
            }
            break;
            
        case 'phone':
            if (value && !MediConnectUtils.validatePhone(value)) {
                showContactFieldError(id, 'Format de téléphone invalide.');
                return false;
            }
            break;
            
        case 'message':
            if (value && value.length < 10) {
                showContactFieldError(id, 'Le message doit contenir au moins 10 caractères.');
                return false;
            }
            break;
    }
    
    // Mark field as valid if all checks pass
    input.classList.add('is-valid');
    return true;
}

// ===== ERROR HANDLING HELPERS =====
function showContactFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.remove('is-valid');
        field.classList.add('is-invalid');
        
        const feedback = field.parentNode.querySelector('.invalid-feedback') || 
                        field.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = message;
            feedback.style.display = 'block';
        }
    }
}

function clearContactFieldError(input) {
    input.classList.remove('is-invalid');
    const feedback = input.parentNode.querySelector('.invalid-feedback') || 
                    input.nextElementSibling;
    if (feedback && feedback.classList.contains('invalid-feedback')) {
        feedback.style.display = 'none';
    }
}

function clearContactFormValidation() {
    const form = document.getElementById('contactForm');
    if (form) {
        const invalidFields = form.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => {
            field.classList.remove('is-invalid');
        });
        
        const validFields = form.querySelectorAll('.is-valid');
        validFields.forEach(field => {
            field.classList.remove('is-valid');
        });
        
        const feedbacks = form.querySelectorAll('.invalid-feedback');
        feedbacks.forEach(feedback => {
            feedback.style.display = 'none';
        });
    }
}

// ===== WHATSAPP INTEGRATION =====
function initWhatsAppIntegration() {
    const whatsappButton = document.querySelector('.btn-success[href*="wa.me"]');
    
    if (whatsappButton) {
        whatsappButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get user's message from contact form if filled
            const messageInput = document.getElementById('message');
            const subjectSelect = document.getElementById('subject');
            
            let message = 'Bonjour, j\'aimerais avoir des informations sur MediConnect CI.';
            
            if (messageInput && messageInput.value.trim()) {
                const subject = subjectSelect ? subjectSelect.options[subjectSelect.selectedIndex].text : '';
                message = `Sujet: ${subject}\n\n${messageInput.value.trim()}`;
            }
            
            // Open WhatsApp with message
            MediConnectUtils.openWhatsApp('225XXXXXXXXX', message);
            
            // Track WhatsApp click (for analytics)
            console.log('WhatsApp contact initiated');
        });
    }
}

// ===== ACCORDION ENHANCEMENT =====
function initAccordion() {
    const accordionButtons = document.querySelectorAll('.accordion-button');
    
    accordionButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Analytics tracking for FAQ interactions
            const questionText = this.textContent.trim();
            console.log(`FAQ opened: ${questionText}`);
        });
    });
}

// ===== FORM SUBMISSION VALIDATION =====
function initFormValidation() {
    const form = document.getElementById('contactForm');
    
    // Prevent submission if form is invalid
    form.addEventListener('submit', function(e) {
        if (!form.checkValidity()) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        form.classList.add('was-validated');
    });
}

// ===== SIMULATE API CALL =====
function simulateContactSubmission(contactData) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate random failure (5% chance)
            if (Math.random() < 0.05) {
                reject(new Error('Network error'));
                return;
            }
            
            // Log contact data (replace with actual API call)
            console.log('Contact form submitted:', contactData);
            
            // Simulate successful submission
            resolve({
                success: true,
                ticketId: Math.random().toString(36).substr(2, 9),
                message: 'Message sent successfully'
            });
        }, 1500);
    });
}

// ===== AUTO-SAVE FORM DATA =====
function autoSaveFormData() {
    const form = document.getElementById('contactForm');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            const formData = extractContactFormData(form);
            MediConnectUtils.saveToLocalStorage('contactFormDraft', formData);
        });
    });
}

// ===== RESTORE FORM DATA =====
function restoreFormData() {
    const savedData = MediConnectUtils.getFromLocalStorage('contactFormDraft');
    
    if (savedData) {
        document.getElementById('firstName').value = savedData.firstName || '';
        document.getElementById('lastName').value = savedData.lastName || '';
        document.getElementById('email').value = savedData.email || '';
        document.getElementById('phone').value = savedData.phone || '';
        document.getElementById('subject').value = savedData.subject || '';
        document.getElementById('message').value = savedData.message || '';
    }
}

// ===== CLEAR SAVED DATA AFTER SUCCESSFUL SUBMISSION =====
function clearSavedFormData() {
    localStorage.removeItem('contactFormDraft');
}

// Initialize auto-save and restore on page load
document.addEventListener('DOMContentLoaded', function() {
    restoreFormData();
    autoSaveFormData();
    
    // Clear saved data after successful form submission
    const originalHandleContactSubmission = handleContactSubmission;
    window.handleContactSubmission = async function(e) {
        try {
            await originalHandleContactSubmission(e);
            clearSavedFormData();
        } catch (error) {
            throw error;
        }
    };
});

// ===== SUBJECT-SPECIFIC HELP TEXT =====
document.addEventListener('DOMContentLoaded', function() {
    const subjectSelect = document.getElementById('subject');
    const messageTextarea = document.getElementById('message');
    
    const helpTexts = {
        'support': 'Décrivez le problème technique que vous rencontrez avec des détails précis.',
        'billing': 'Mentionnez votre numéro de facture ou la transaction concernée.',
        'appointment': 'Précisez le type de consultation souhaité et vos disponibilités.',
        'partnership': 'Présentez votre organisation et le type de partenariat envisagé.',
        'other': 'Décrivez votre demande en détail.'
    };
    
    if (subjectSelect && messageTextarea) {
        subjectSelect.addEventListener('change', function() {
            const selectedValue = this.value;
            if (helpTexts[selectedValue]) {
                messageTextarea.placeholder = helpTexts[selectedValue];
            }
        });
    }
});