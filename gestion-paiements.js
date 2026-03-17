// gestion-paiements.js

document.addEventListener('DOMContentLoaded', () => {
    initBilling();
});

async function initBilling() {
    // 1. Vérification de la connexion
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) {
        window.location.href = "./connexion.html";
        return;
    }

    // 2. Charger les patients pour le menu déroulant
    loadPatientsList();

    // 3. Charger l'historique des factures envoyées par ce médecin
    loadDoctorInvoices(user.id);

    // 4. Gérer l'envoi du formulaire (Création de la facture)
    const form = document.getElementById('invoiceForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('sendInvoiceBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Envoi en cours...';
        btn.disabled = true;

        // Récupération des données du formulaire
        const patientId = document.getElementById('patient-select').value;
        const description = document.getElementById('description-input').value;
        const montant = document.getElementById('amount-input').value;

        // Insertion dans la table 'factures'
        const { error } = await window.supabaseClient
            .from('factures')
            .insert([{
                patient_id: patientId,
                medecin_id: user.id,
                description: description,
                montant: montant,
                statut: 'en_attente' // Par défaut, le patient ne l'a pas encore payée
            }]);

        if (error) {
            alert("Erreur lors de l'envoi de la facture : " + error.message);
        } else {
            alert("✅ Facture envoyée avec succès ! Le patient la verra sur son tableau de bord.");
            form.reset(); // On vide le formulaire
            loadDoctorInvoices(user.id); // On recharge l'historique pour l'afficher en bas
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

/**
 * Charge la liste des patients depuis Supabase pour remplir le <select>
 */
async function loadPatientsList() {
    const select = document.getElementById('patient-select');
    
    // On va chercher tous les patients enregistrés
    const { data: patients, error } = await window.supabaseClient
        .from('patients')
        .select('id, first_name, last_name')
        .order('first_name', { ascending: true });

    if (error || !patients) {
        select.innerHTML = '<option value="" disabled>Erreur de chargement</option>';
        return;
    }

    select.innerHTML = '<option value="" disabled selected>Sélectionnez un patient...</option>';
    
    // On ajoute chaque patient dans le menu déroulant
    patients.forEach(p => {
        let nomComplet = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        
        // S'il n'a pas de nom, on affiche au moins son ID pour le repérer !
        if (!nomComplet) {
            nomComplet = `Patient Anonyme (ID: ${p.id.substring(0, 6)}...)`;
        }
        
        select.innerHTML += `<option value="${p.id}">${nomComplet}</option>`;
    });
}

/**
 * Affiche toutes les factures que CE médecin a générées
 */
async function loadDoctorInvoices(doctorId) {
    const container = document.getElementById('doctor-invoices-list');
    
    const { data: factures, error } = await window.supabaseClient
        .from('factures')
        .select('id, montant, description, statut, created_at, patients(first_name, last_name)')
        .eq('medecin_id', doctorId)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = '<p class="text-danger">Erreur de chargement des factures.</p>';
        return;
    }

    if (!factures || factures.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">Vous n\'avez envoyé aucune facture pour le moment.</p>';
        return;
    }

    container.innerHTML = '';
    factures.forEach(fac => {
        const patientNom = fac.patients ? `${fac.patients.first_name || ''} ${fac.patients.last_name || ''}` : 'Patient inconnu';
        const dateStr = new Date(fac.created_at).toLocaleDateString('fr-FR');
        const montantStr = fac.montant.toLocaleString('fr-FR') + ' FCFA';

        // Badge de couleur selon le statut
        let statusBadge = fac.statut === 'payee' 
            ? '<span class="badge bg-success"><i class="fas fa-check me-1"></i>Payée</span>'
            : '<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>En attente</span>';

        container.innerHTML += `
            <div class="d-flex justify-content-between align-items-center p-3 mb-3 border rounded shadow-sm ${fac.statut === 'payee' ? 'bg-light' : 'bg-white'}">
                <div>
                    <h6 class="mb-1 fw-bold"><i class="fas fa-user me-2 text-primary"></i>${patientNom}</h6>
                    <small class="text-muted">Envoyée le ${dateStr}</small>
                </div>
                <div>
                    <h6 class="mb-1 fw-bold"><i class="fas fa-user me-2 text-primary"></i>${patientNom}</h6>
                    <p class="mb-1 text-dark small">${fac.description || 'Consultation médicale'}</p> <small class="text-muted">Envoyée le ${dateStr}</small>
                </div>
                <div class="text-end">
                    <h5 class="fw-bold text-dark mb-1">${montantStr}</h5>
                    ${statusBadge}
                </div>
            </div>
        `;
    });
}