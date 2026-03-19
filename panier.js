let cartTotal = 0;
let cartDetailsText = '';
let currentUserData = null;

document.addEventListener('DOMContentLoaded', () => {
    renderCart();
});

async function renderCart() {
    const cartContainer = document.getElementById('cart-items-container');
    const sousTotalEl = document.getElementById('sous-total');
    const totalEl = document.getElementById('total-price');
    const payOnlineBtn = document.getElementById('pay-online-btn');
    const payWhatsappBtn = document.getElementById('pay-whatsapp-btn');
    
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = './connexion.html';
        return;
    }
    currentUserData = user;

    const { data: cartItems, error } = await window.supabaseClient
        .from('panier')
        .select(`
            id,
            quantite,
            produits ( id, nom, prix, image_url )
        `)
        .eq('patient_id', user.id);

    if (error || !cartItems || cartItems.length === 0) {
        cartContainer.innerHTML = `
            <div class="card border-0 shadow-sm rounded-4 p-5 text-center">
                <i class="fas fa-shopping-basket fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">Votre panier est vide</h4>
                <a href="boutique.html" class="btn btn-outline-primary mt-3">Retourner à la boutique</a>
            </div>
        `;
        sousTotalEl.textContent = '0 FCFA';
        totalEl.textContent = '0 FCFA';
        if(payOnlineBtn) payOnlineBtn.disabled = true;
        if(payWhatsappBtn) payWhatsappBtn.disabled = true;
        return;
    }

    let cartHTML = '';
    cartTotal = 0;
    cartDetailsText = ''; 

    cartItems.forEach((item) => {
        const produit = item.produits;
        cartTotal += (produit.prix * item.quantite);
        
        const imgUrl = produit.image_url || 'https://via.placeholder.com/150?text=Image';
        const prixFormatte = new Intl.NumberFormat('fr-FR').format(produit.prix * item.quantite) + ' FCFA';

        cartHTML += `
            <div class="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden">
                <div class="row g-0 align-items-center">
                    <div class="col-4 col-md-3 bg-white text-center p-2">
                        <img src="${imgUrl}" class="img-fluid rounded" alt="${produit.nom}" style="max-height: 100px; object-fit: contain;">
                    </div>
                    <div class="col-8 col-md-9">
                        <div class="card-body d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="card-title fw-bold mb-1">${produit.nom}</h6>
                                <p class="card-text text-muted small mb-0">Quantité : ${item.quantite}</p>
                                <span class="fw-bold text-primary-dark">${prixFormatte}</span>
                            </div>
                            <button class="btn btn-light text-danger rounded-circle p-2" onclick="removeFromCart('${item.id}')" title="Retirer">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        cartDetailsText += `- ${item.quantite}x ${produit.nom} (${prixFormatte})\n`;
    });

    cartContainer.innerHTML = cartHTML;
    
    const grandTotalFormat = new Intl.NumberFormat('fr-FR').format(cartTotal) + ' FCFA';
    sousTotalEl.textContent = grandTotalFormat;
    totalEl.textContent = grandTotalFormat;
    
    if(payOnlineBtn) {
        payOnlineBtn.disabled = false;
        payOnlineBtn.onclick = () => processOnlinePayment();
    }
    if(payWhatsappBtn) {
        payWhatsappBtn.disabled = false;
        payWhatsappBtn.onclick = () => processWhatsappOrder(grandTotalFormat);
    }
}

async function removeFromCart(panierId) {
    await window.supabaseClient.from('panier').delete().eq('id', panierId);
    renderCart();
}

// LA FONCTION MAGIQUE QUI VIDE LE PANIER AUTOMATIQUEMENT
async function clearEntireCart() {
    if(!currentUserData) return;
    await window.supabaseClient.from('panier').delete().eq('patient_id', currentUserData.id);
}

// --- OPTION 1 : COMMANDER SUR WHATSAPP ---
async function processWhatsappOrder(grandTotalStr) {
    const numeroWhatsApp = "2250000000000"; // Ton vrai numéro ici
    
    let message = `Bonjour MediConnect CI ! 👋\nJe souhaite finaliser ma commande (Paiement à la livraison) :\n\n`;
    message += cartDetailsText;
    message += `\n*Total à payer : ${grandTotalStr}*\n\n`;
    message += `Merci de m'indiquer les modalités de livraison.`;

    // 1. Ouvre WhatsApp
    window.open(`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(message)}`, '_blank');
    
    // 2. Vide le panier en base de données
    await clearEntireCart();
    
    // 3. Met à jour l'affichage du panier (qui sera maintenant vide)
    renderCart();
}

// --- OPTION 2 : PAYER EN LIGNE (WAVE, MTN, ORANGE MONEY) ---
async function processOnlinePayment() {
    if (!currentUserData || !currentUserData.email) {
        alert("Erreur : Email introuvable pour le paiement.");
        return;
    }

    let handler = PaystackPop.setup({
        key: 'pk_live_54950319772acc4e08a83f4e5946f6b1760ed17e', // Clé de test
        email: currentUserData.email,
        amount: cartTotal * 100, 
        currency: 'XOF',
        ref: 'CMD_' + Math.floor((Math.random() * 1000000000) + 1),
        callback: function(response) {
            (async () => {
                // 1. Enregistre la commande dans Supabase
                const { error } = await window.supabaseClient
                    .from('commandes')
                    .insert([{
                        patient_id: currentUserData.id,
                        montant_total: cartTotal,
                        statut_paiement: 'paye_en_ligne',
                        details: cartDetailsText
                    }]);

                if (error) {
                    alert("Erreur lors de la création de la commande. Contactez le support.");
                    console.error(error);
                } else {
                    alert("✅ Paiement réussi ! Votre commande a été enregistrée. Référence : " + response.reference);
                    // 2. Vide le panier
                    await clearEntireCart();
                    // 3. Recharge l'affichage
                    renderCart();
                }
            })();
        },
        onClose: function() {
            alert("Paiement annulé. Vos articles sont toujours dans le panier.");
        }
    });

    handler.openIframe();
}