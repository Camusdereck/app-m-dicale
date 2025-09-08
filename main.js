// ===== MAIN JAVASCRIPT FILE =====

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functions
    initSmoothScrolling();
    initNavbarScroll();
    initAnimations();
    initLazyLoading();
});

// ===== SMOOTH SCROLLING =====
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                e.preventDefault();
                
                const headerOffset = 80;
                const elementPosition = targetSection.getBoundingClientPosition().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ===== NAVBAR SCROLL EFFECT =====
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
                navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
                navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
            } else {
                navbar.classList.remove('scrolled');
                navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                navbar.style.boxShadow = 'none';
            }
        });
    }
}

// ===== ANIMATIONS ON SCROLL =====
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll(
        '.service-card, .testimonial-card, .payment-card, .contact-item'
    );
    
    animatedElements.forEach(el => {
        observer.observe(el);
    });
}

// ===== LAZY LOADING FOR IMAGES =====
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// ===== FORM UTILITIES =====
function showFormSuccess(formId, message) {
    const form = document.getElementById(formId);
    if (form) {
        const alert = createAlert('success', message);
        form.parentNode.insertBefore(alert, form);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

function showFormError(formId, message) {
    const form = document.getElementById(formId);
    if (form) {
        const alert = createAlert('danger', message);
        form.parentNode.insertBefore(alert, form);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

function createAlert(type, message) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    return alert;
}

// ===== BOOTSTRAP TOOLTIP INITIALIZATION =====
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// ===== PHONE NUMBER FORMATTING =====
function formatPhoneNumber(input) {
    // Remove all non-numeric characters
    let value = input.value.replace(/\D/g, '');
    
    // Add country code if not present
    if (value.length > 0 && !value.startsWith('225')) {
        value = '225' + value;
    }
    
    // Format: +225 XX XX XX XX XX
    if (value.length >= 3) {
        value = '+' + value.substring(0, 3) + ' ' + 
                value.substring(3, 5) + ' ' + 
                value.substring(5, 7) + ' ' + 
                value.substring(7, 9) + ' ' + 
                value.substring(9, 11) + ' ' + 
                value.substring(11, 13);
    }
    
    input.value = value;
}

// ===== WHATSAPP INTEGRATION =====
function openWhatsApp(phone, message = '') {
    const encodedMessage = encodeURIComponent(message || 'Bonjour, j\'aimerais avoir des informations sur MediConnect CI.');
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
}

// ===== LOADING BUTTON STATE =====
function setButtonLoading(buttonId, loading = true) {
    const button = document.getElementById(buttonId);
    if (button) {
        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            button.dataset.originalText = button.textContent;
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Chargement...';
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            button.innerHTML = button.dataset.originalText || button.textContent;
        }
    }
}

// ===== LOCAL STORAGE UTILITIES =====
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        return false;
    }
}

function getFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Erreur lors de la récupération:', error);
        return null;
    }
}

// ===== FORM VALIDATION UTILITIES =====
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    // Ivorian phone number validation
    const phoneRegex = /^(\+225|225)?[0-9]{8,10}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

function validatePassword(password) {
    // At least 8 characters
    return password.length >= 8;
}

// ===== ERROR HANDLING =====
window.addEventListener('error', function(e) {
    console.error('Erreur JavaScript:', e.error);
    // In production, send error to logging service
});

// ===== EXPORT FUNCTIONS FOR OTHER SCRIPTS =====
window.MediConnectUtils = {
    showFormSuccess,
    showFormError,
    formatPhoneNumber,
    openWhatsApp,
    setButtonLoading,
    saveToLocalStorage,
    getFromLocalStorage,
    validateEmail,
    validatePhone,
    validatePassword
};