document.addEventListener('DOMContentLoaded', () => {
    const patientForm = document.getElementById('patientForm');
    const doctorForm = document.getElementById('doctorForm');

    // INSCRIPTION PATIENT
    if (patientForm) {
        patientForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                first_name: document.getElementById('patientFirstName').value,
                last_name: document.getElementById('patientLastName').value,
                email: document.getElementById('patientEmail').value,
                phone: document.getElementById('patientPhone').value,
                password: document.getElementById('patientPassword').value
            };
            handleSignUp(data, 'patients', e.submitter);
        });
    }

    // INSCRIPTION MÉDECIN
    if (doctorForm) {
        doctorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                first_name: document.getElementById('doctorFirstName').value,
                last_name: document.getElementById('doctorLastName').value,
                email: document.getElementById('doctorEmail').value,
                phone: document.getElementById('doctorPhone').value,
                commune: document.getElementById('doctorCommune').value, 
                specialite: document.getElementById('specialite').value, 
                order_number: document.getElementById('orderNumber').value, 
                password: document.getElementById('doctorPassword').value
            };
            handleSignUp(data, 'medecins', e.submitter);
        });
    }
});

// --- LE TRADUCTEUR D'ERREURS EN FRANÇAIS ---
function translateError(msgEnAnglais) {
    const errorMap = {
        "Invalid login credentials": "L'email ou le mot de passe est incorrect.",
        "User already registered": "Cet email est déjà utilisé par un autre compte.",
        "Email rate limit exceeded": "Sécurité anti-spam : Trop d'essais. Veuillez réessayer dans une heure.",
        "Password should be at least 6 characters": "Le mot de passe doit contenir au moins 6 caractères.",
        "To security purposes, you can only request this after": "Veuillez patienter avant de faire une nouvelle demande."
    };
    return errorMap[msgEnAnglais] || msgEnAnglais; 
}

// --- FONCTION PRINCIPALE D'INSCRIPTION ---
async function handleSignUp(userData, table, submitBtn) {
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Création...';
    submitBtn.disabled = true;

    try {
        const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
            email: userData.email,
            password: userData.password,
        });

        // 1. Si Supabase renvoie une erreur franche
        if (authError) throw authError;

        // 2. PROTECTION ULTIME : Si l'utilisateur est vide, c'est que l'email existe
        // Les `?.` empêchent JavaScript de planter s'il cherche l'ID dans le vide.
        if (!authData?.user?.id) {
            throw new Error("User already registered");
        }

        const profileData = { ...userData, id: authData.user.id };
        delete profileData.password; 

        const { error: dbError } = await window.supabaseClient
            .from(table)
            .insert([profileData]);

        if (dbError) throw dbError;

        // 3. Succès !
        alert("✅ Inscription réussie ! Vous pouvez maintenant vous connecter à votre compte.");
        window.location.href = "connexion.html";

    } catch (err) {
        alert("Attention : " + translateError(err.message));
        console.error("Détails :", err);
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Afficher/Masquer le mot de passe
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i'); 

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = "password";
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};