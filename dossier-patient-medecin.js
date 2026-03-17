// dossier-patient-medecin.js

document.addEventListener('DOMContentLoaded', () => {
    initDossier();
});

async function initDossier() {
    // 1. Récupérer l'ID du patient dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('id');

    if (!patientId || patientId === '#') {
        alert("Erreur : Aucun patient sélectionné.");
        window.location.href = './dashboard-medecin.html';
        return;
    }

    // 2. Charger les infos du patient et remplir le formulaire
    await loadPatientData(patientId);

    // 3. Charger l'historique des consultations
    await loadConsultationHistory(patientId);

    // 4. Gérer l'enregistrement des modifications (Poids, Taille, etc.)
    const form = document.getElementById('medicalRecordForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveRecordBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sauvegarde...';
        btn.disabled = true;

        const dataToUpdate = {
            poids: document.getElementById('poids-input').value || null,
            taille: document.getElementById('taille-input').value || null,
            tension: document.getElementById('tension-input').value || null,
            antecedents: document.getElementById('antecedents-input').value || null
        };

        const { error } = await window.supabaseClient
            .from('patients')
            .update(dataToUpdate)
            .eq('id', patientId);

        if (error) {
            alert("Erreur de sauvegarde : " + error.message);
        } else {
            alert("✅ Dossier mis à jour avec succès !");
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

async function loadPatientData(patientId) {
    const { data: patient, error } = await window.supabaseClient
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

    if (error || !patient) {
        document.getElementById('patient-name-title').textContent = "Erreur de chargement";
        return;
    }

    // Afficher le nom
    document.getElementById('patient-name-title').textContent = `${patient.first_name || ''} ${patient.last_name || ''}`;
    document.getElementById('patient-id-badge').textContent = `ID: ${patient.id.substring(0, 8)}`;

    // Pré-remplir les champs s'ils existent déjà
    if (patient.poids) document.getElementById('poids-input').value = patient.poids;
    if (patient.taille) document.getElementById('taille-input').value = patient.taille;
    if (patient.tension) document.getElementById('tension-input').value = patient.tension;
    if (patient.antecedents) document.getElementById('antecedents-input').value = patient.antecedents;
}

async function loadConsultationHistory(patientId) {
    const container = document.getElementById('consultations-history');

    const { data: consultations, error } = await window.supabaseClient
        .from('consultations')
        .select(`id, created_at, diagnostic, ordonnance, medecins(first_name, last_name)`)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = '<p class="text-danger">Erreur lors du chargement de l\'historique.</p>';
        return;
    }

    if (!consultations || consultations.length === 0) {
        container.innerHTML = '<p class="text-muted">Aucune consultation précédente pour ce patient.</p>';
        return;
    }

    container.innerHTML = '';
    consultations.forEach(cons => {
        const nomDoc = cons.medecins ? `Dr. ${cons.medecins.first_name || ''} ${cons.medecins.last_name || ''}` : 'Médecin inconnu';
        const dateObj = new Date(cons.created_at);
        const dateStr = dateObj.toLocaleDateString('fr-FR') + ' à ' + dateObj.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});

        const html = `
            <div class="card mb-3 border-0 bg-light">
                <div class="card-body">
                    <div class="d-flex justify-content-between mb-2">
                        <h6 class="fw-bold mb-0 text-primary-dark"><i class="fas fa-stethoscope me-2"></i>${nomDoc}</h6>
                        <small class="text-muted">${dateStr}</small>
                    </div>
                    <p class="mb-1"><strong>Diagnostic :</strong> ${cons.diagnostic || 'Non renseigné'}</p>
                    <p class="mb-0"><strong>Ordonnance :</strong> <br><span style="white-space: pre-line;">${cons.ordonnance || 'Aucune prescription'}</span></p>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}