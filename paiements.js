// paiements.js - VERSION FINALE (CinetPay Intégré)

document.addEventListener('DOMContentLoaded', () => {
    chargerFactures();
});

async function chargerFactures() {
    // 1. On vérifie qui est connecté
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) {
        window.location.href = './connexion.html';
        return;
    }

    // 2. On récupère TOUTES les factures de ce patient (avec le nom du médecin !)
    const { data: factures, error } = await window.supabaseClient
        .from('factures')
        .select(`id, montant, description, statut, created_at, medecins(first_name, last_name)`)
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

    const pendingContainer = document.getElementById('pending-invoices');
    const paidContainer = document.getElementById('paid-invoices');

    if (error) {
        pendingContainer.innerHTML = '<p class="text-danger">Erreur de chargement.</p>';
        paidContainer.innerHTML = '<p class="text-danger">Erreur de chargement.</p>';
        return;
    }

    pendingContainer.innerHTML = '';
    paidContainer.innerHTML = '';

    let pendingCount = 0;
    let paidCount = 0;

    // 3. On trie les factures et on crée l'affichage
    factures.forEach(facture => {
        const montantFormate = facture.montant.toLocaleString('fr-FR') + ' FCFA';
        const dateFormatee = new Date(facture.created_at).toLocaleDateString('fr-FR');
        
        // On récupère joliment le nom du médecin s'il existe
        const nomDoc = facture.medecins ? `Dr. ${facture.medecins.first_name} ${facture.medecins.last_name}` : 'Consultation médicale';
        const prestation = facture.description || 'Prestation';

        if (facture.statut === 'en_attente') {
            pendingCount++;
            pendingContainer.innerHTML += `
                <div class="d-flex justify-content-between align-items-center p-3 mb-3 bg-white border rounded shadow-sm">
                    <div>
                        <h6 class="fw-bold text-dark mb-1">${nomDoc}</h6>
                        <p class="mb-1 text-primary fw-bold small">${prestation}</p>
                        <small class="text-muted">Émise le : ${dateFormatee}</small>
                    </div>
                    <div class="text-end">
                        <h5 class="text-danger fw-bold mb-2">${montantFormate}</h5>
                        <button class="btn btn-warning fw-bold text-dark btn-sm px-3" onclick="lancerPaiementCinetPay('${facture.id}', ${facture.montant}, '${prestation}')">
                            <i class="fas fa-credit-card me-2"></i>Payer
                        </button>
                    </div>
                </div>
            `;
        } else if (facture.statut === 'paye' || facture.statut === 'payee') {
            paidCount++;
            paidContainer.innerHTML += `
                <div class="d-flex justify-content-between align-items-center p-3 mb-3 bg-light border rounded">
                    <div>
                        <h6 class="text-dark mb-1">${nomDoc}</h6>
                        <p class="mb-1 text-muted small">${prestation}</p>
                        <small class="text-muted">Payée le : ${dateFormatee}</small>
                    </div>
                    <div class="text-end">
                        <h6 class="text-success fw-bold mb-1">${montantFormate}</h6>
                        <span class="badge bg-success"><i class="fas fa-check me-1"></i>Réglé</span>
                    </div>
                </div>
            `;
        }
    });

    if (pendingCount === 0) pendingContainer.innerHTML = '<p class="text-center text-muted">Aucune facture en attente. Tout est à jour !</p>';
    if (paidCount === 0) paidContainer.innerHTML = '<p class="text-center text-muted">Aucun historique de paiement.</p>';
}

// 4. LA FONCTION QUI OUVRE LE GUICHET CINETPAY
function lancerPaiementCinetPay(factureId, montant, motif) {
    // On génère une référence unique pour CinetPay
    const transactionId = "MED_" + Date.now();

    // Configuration du guichet (À REMPLACER PAR TES VRAIES CLÉS PLUS TARD)
    CinetPay.setConfig({
        apikey: 'TON_API_KEY_ICI', // Remplace par ta clé API
        site_id: 'TON_SITE_ID_ICI', // Remplace par ton Site ID
        mode: 'PRODUCTION' 
    });

    // Ouverture de la fenêtre de paiement
    CinetPay.getCheckout({
        transaction_id: transactionId,
        amount: montant,
        currency: 'XOF',
        channels: 'ALL',
        description: motif
    });

    // On écoute la réponse de CinetPay
    CinetPay.waitResponse(async function(data) {
        if (data.status === "ACCEPTED") {
            // SI LE PAIEMENT MARCHE : On met à jour la facture dans Supabase
            const { error } = await window.supabaseClient
                .from('factures')
                .update({ 
                    statut: 'paye',
                    reference_paiement: transactionId 
                })
                .eq('id', factureId);

            if (!error) {
                alert("Merci ! Votre paiement a été validé avec succès.");
                window.location.reload(); // On recharge pour passer la facture dans l'historique
            } else {
                alert("Le paiement est passé, mais une erreur est survenue lors de l'enregistrement. Contactez le support.");
            }
        } else {
            alert("Paiement refusé ou annulé.");
        }
    });

    CinetPay.onError(function(data) {
        console.error("Erreur CinetPay :", data);
        alert("Erreur lors de l'ouverture du guichet de paiement.");
    });
}