// creer-ordonnance.js - VERSION FINALE (Avec Constantes Vitales)

document.addEventListener('DOMContentLoaded', () => {
    initConsultation();
});

async function initConsultation() {
    // 1. Récupérer l'ID du rendez-vous depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const rdvId = urlParams.get('consultation_id');

    if (!rdvId) {
        alert("Erreur : Aucun rendez-vous sélectionné.");
        window.location.href = './dashboard-medecin.html';
        return;
    }

    // 2. Vérifier que le médecin est connecté
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) {
        window.location.href = './connexion.html';
        return;
    }

    // 3. Récupérer les infos du rendez-vous pour savoir qui est le patient
    const { data: rdvData, error: rdvError } = await window.supabaseClient
        .from('rendez_vous')
        .select('patient_id, patients(first_name, last_name)')
        .eq('id', rdvId)
        .single();

    if (rdvError || !rdvData) {
        alert("Impossible de charger les détails du rendez-vous.");
        return;
    }

    // Afficher le nom du patient
    const patientNom = rdvData.patients ? `${rdvData.patients.first_name || ''} ${rdvData.patients.last_name || ''}` : 'Patient inconnu';
    const patientInfoDiv = document.getElementById('patient-info');
    if (patientInfoDiv) {
        patientInfoDiv.textContent = `Patient : ${patientNom}`;
    }

    // 4. Gérer la soumission du formulaire
    const form = document.getElementById('prescriptionForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';
        submitBtn.disabled = true;

        try {
            // Récupération des textes
            const diagnostic = document.getElementById('diagnostic-content').value;
            const ordonnance = document.getElementById('prescription-content').value;
            const notes = document.getElementById('notes-content').value;

            // NOUVEAU : Récupération des constantes vitales
            const poids = document.getElementById('poids-input') ? document.getElementById('poids-input').value : null;
            const taille = document.getElementById('taille-input') ? document.getElementById('taille-input').value : null;
            const tension = document.getElementById('tension-input') ? document.getElementById('tension-input').value : null;

            // A. Insérer dans la table "consultations"
            const { error: insertError } = await window.supabaseClient
                .from('consultations')
                .insert([{
                    rendez_vous_id: rdvId,
                    patient_id: rdvData.patient_id,
                    medecin_id: user.id,
                    diagnostic: diagnostic,
                    ordonnance: ordonnance,
                    notes_privees: notes,
                    poids: poids || null,      // NOUVEAU
                    taille: taille || null,    // NOUVEAU
                    tension: tension || null   // NOUVEAU
                }]);

            if (insertError) throw insertError;

            // B. Mettre à jour le statut du rendez-vous à "termine"
            const { error: updateError } = await window.supabaseClient
                .from('rendez_vous')
                .update({ statut: 'termine' })
                .eq('id', rdvId);

            if (updateError) throw updateError;

            // Succès !
            alert("✅ La consultation a été enregistrée avec succès !");
            window.location.href = './dashboard-medecin.html';

        } catch (err) {
            console.error("Erreur :", err);
            alert("Une erreur est survenue lors de l'enregistrement : " + err.message);
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}