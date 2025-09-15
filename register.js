// register.js - VERSION FINALE SIMPLIFIÉE AVEC DÉCLENCHEUR

// On attend que toute la page soit chargée
document.addEventListener('DOMContentLoaded', () => {

    const patientForm = document.getElementById('patientForm');
    const doctorForm = document.getElementById('doctorForm');

    // --- GESTION DU FORMULAIRE PATIENT ---
    patientForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Empêche le rechargement de la page

        // Récupère les valeurs du formulaire patient
        const firstName = document.getElementById('patientFirstName').value;
        const lastName = document.getElementById('patientLastName').value;
        const email = document.getElementById('patientEmail').value;
        const password = document.getElementById('patientPassword').value;
        const fullName = `${firstName} ${lastName}`; // On combine le nom et le prénom

        // On appelle la fonction d'inscription
        handleSignUp(email, password, fullName, false); // false car ce n'est pas un médecin
    });

    // --- GESTION DU FORMULAIRE MÉDECIN ---
    doctorForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Empêche le rechargement de la page

        // Récupère les valeurs du formulaire médecin
        const firstName = document.getElementById('doctorFirstName').value;
        const lastName = document.getElementById('doctorLastName').value;
        const email = document.getElementById('doctorEmail').value;
        const password = document.getElementById('doctorPassword').value;
        const fullName = `${firstName} ${lastName}`;

        // On appelle la fonction d'inscription
        handleSignUp(email, password, fullName, true); // true car c'est un médecin
    });

});


/**
 * Fonction générale pour gérer l'inscription (version simplifiée)
 * @param {string} email 
 * @param {string} password 
 * @param {string} fullName 
 * @param {boolean} isDoctor 
 */
async function handleSignUp(email, password, fullName, isDoctor) {
    try {
        // Le déclencheur dans la base de données a besoin du nom complet (full_name).
        // On le passe donc dans la section 'data' des options de signUp.
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName
                    // NOTE: Pour gérer l'inscription des médecins, il faudra améliorer
                    // notre déclencheur SQL. Concentrons-nous sur les patients pour l'instant.
                }
            }
        });

        if (error) {
            throw error;
        }

        alert("Inscription réussie ! Un email de confirmation a été envoyé.");
        // Le profil est créé automatiquement dans la base de données.
        // Plus besoin de code .insert() ici !

    } catch (error) {
        console.error("Erreur détaillée :", error);
        alert("Une erreur est survenue : " + error.message);
    }
}