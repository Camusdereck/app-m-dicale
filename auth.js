// ===== AUTHENTICATION JAVASCRIPT =====

document.addEventListener('DOMContentLoaded', function() {
    initLoginForm();
    initPasswordToggle();
    initSocialLogin();
});

// ===== LOGIN FORM HANDLING =====
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        
        // Remember me functionality
        const rememberCheckbox = document.getElementById('rememberMe');
        const emailInput = document.getElementById('email');
        
        // Load remembered email
        const rememberedEmail = MediConnectUtils.getFromLocalStorage('rememberedEmail');
        if (rememberedEmail) {
            emailInput.value = rememberedEmail;
            rememberCheckbox.checked = true;
        }
        
        // Real-time validation
        const inputs = loginForm.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => clearFieldError(input));
        });
    }
}

// ===== HANDLE LOGIN SUBMISSION =====
async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const loginData = {
        email: formData.get('email') || document.getElementById('email').value,
        password: formData.get('password') || document.getElementById('password').value,
        rememberMe: document.getElementById('rememberMe').checked
    };
    
    // Validate form
    if (!validateLoginForm(loginData)) {
        return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    MediConnectUtils.setButtonLoading(submitButton.id || 'loginButton', true);
    
    try {
        // Simulate API call (replace with actual API endpoint)
        await simulateLogin(loginData);
        
        // Handle remember me
        if (loginData.rememberMe) {
            MediConnectUtils.saveToLocalStorage('rememberedEmail', loginData.email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }
        
        // Show success message
        MediConnectUtils.showFormSuccess('loginForm', 'Connexion réussie ! Redirection en cours...');
        
        // Redirect after successful login
        setTimeout(() => {
            window.location.href = 'dashboard.html'; // Replace with actual dashboard URL
        }, 2000);
        
    } catch (error) {
        console.error('Erreur de connexion:', error);
        MediConnectUtils.showFormError('loginForm', 'Email ou mot de passe incorrect. Veuillez réessayer.');
    } finally {
        MediConnectUtils.setButtonLoading(submitButton.id || 'loginButton', false);
    }
}

// ===== LOGIN FORM VALIDATION =====
function validateLoginForm(data) {
    let isValid = true;
    
    // Email validation
    if (!data.email || !MediConnectUtils.validateEmail(data.email)) {
        showFieldError('email', 'Veuillez saisir un email valide.');
        isValid = false;
    }
    
    // Password validation
    if (!data.password || data.password.length < 1) {
        showFieldError('password', 'Le mot de passe est requis.');
        isValid = false;
    }
    
    return isValid;
}

// ===== PASSWORD TOGGLE FUNCTIONALITY =====
function initPasswordToggle() {
    const toggleButton = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (toggleButton && passwordInput) {
        toggleButton.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = toggleButton.querySelector('i');
            if (type === 'password') {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        });
    }
}

// ===== SOCIAL LOGIN =====
function initSocialLogin() {
    // Google login
    const googleButton = document.querySelector('.btn-outline-danger');
    if (googleButton) {
        googleButton.addEventListener('click', function(e) {
            e.preventDefault();
            handleSocialLogin('google');
        });
    }
    
    // Facebook login
    const facebookButton = document.querySelector('.btn-outline-primary');
    if (facebookButton) {
        facebookButton.addEventListener('click', function(e) {
            e.preventDefault();
            handleSocialLogin('facebook');
        });
    }
}

async function handleSocialLogin(provider) {
    try {
        MediConnectUtils.showFormSuccess('loginForm', `Connexion ${provider} en cours...`);
        
        // Simulate social login (replace with actual implementation)
        await simulateSocialLogin(provider);
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error(`Erreur connexion ${provider}:`, error);
        MediConnectUtils.showFormError('loginForm', `Erreur lors de la connexion avec ${provider}. Veuillez réessayer.`);
    }
}

// ===== FIELD VALIDATION HELPERS =====
function validateField(input) {
    const value = input.value.trim();
    const type = input.type;
    
    clearFieldError(input);
    
    if (input.hasAttribute('required') && !value) {
        showFieldError(input.id, 'Ce champ est requis.');
        return false;
    }
    
    if (type === 'email' && value && !MediConnectUtils.validateEmail(value)) {
        showFieldError(input.id, 'Veuillez saisir un email valide.');
        return false;
    }
    
    return true;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('is-invalid');
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = message;
        }
    }
}

function clearFieldError(input) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
}

// ===== SIMULATE API CALLS (REPLACE WITH ACTUAL API) =====
function simulateLogin(loginData) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate API response
            if (loginData.email === 'test@example.com' && loginData.password === 'password') {
                resolve({ success: true, token: 'fake-jwt-token' });
            } else {
                reject(new Error('Invalid credentials'));
            }
        }, 1500);
    });
}

function simulateSocialLogin(provider) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate social login success
            resolve({ success: true, provider, token: 'fake-social-token' });
        }, 2000);
    });
}

// ===== FORGOT PASSWORD =====
function handleForgotPassword() {
    const email = document.getElementById('email').value;
    
    if (!email || !MediConnectUtils.validateEmail(email)) {
        MediConnectUtils.showFormError('loginForm', 'Veuillez saisir votre email d\'abord.');
        return;
    }
    
    // Simulate forgot password request
    MediConnectUtils.showFormSuccess('loginForm', 'Un lien de réinitialisation a été envoyé à votre email.');
}

// Add event listener for forgot password link
document.addEventListener('DOMContentLoaded', function() {
    const forgotPasswordLink = document.querySelector('a[href="#"]');
    if (forgotPasswordLink && forgotPasswordLink.textContent.includes('Mot de passe oublié')) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            handleForgotPassword();
        });
    }
});