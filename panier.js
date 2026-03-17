document.addEventListener('DOMContentLoaded', () => {
    renderCart();
});

async function renderCart() {
    const cartContainer = document.getElementById('cart-items-container');
    const sousTotalEl = document.getElementById('sous-total');
    const totalEl = document.getElementById('total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

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
        checkoutBtn.disabled = true;
        return;
    }

    let cartHTML = '';
    let totalPrix = 0;
    let detailsCommande = ''; // Texte qui sera envoyé sur WhatsApp

    cartItems.forEach((item) => {
        const produit = item.produits;
        totalPrix += (produit.prix * item.quantite);
        
        const imgUrl = produit.image_url || 'https://via.placeholder.com/150?text=Image';
        const prixFormatte = new Intl.NumberFormat('fr-FR').format(produit.prix * item.quantite) + ' FCFA';

        // Construction du résumé HTML
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

        // Construction du texte pour WhatsApp (Saut de ligne = %0A)
        detailsCommande += `- ${item.quantite}x ${produit.nom} (${prixFormatte})%0A`;
    });

    cartContainer.innerHTML = cartHTML;
    
    const grandTotal = new Intl.NumberFormat('fr-FR').format(totalPrix) + ' FCFA';
    sousTotalEl.textContent = grandTotal;
    totalEl.textContent = grandTotal;
    checkoutBtn.disabled = false;

    // Gestion du clic vers WhatsApp
    checkoutBtn.onclick = () => {
        // Le numéro de l'entreprise (à modifier avec ton vrai numéro, avec l'indicatif 225)
        const numeroWhatsApp = "2250000000000"; 
        
        // Le message prérempli
        let message = `Bonjour MediConnect CI ! 👋%0AJe souhaite finaliser ma commande :%0A%0A`;
        message += detailsCommande;
        message += `%0A*Total à payer : ${grandTotal}*%0A%0A`;
        message += `Merci de m'indiquer les modalités de livraison.`;

        // Redirection vers l'application WhatsApp
        const whatsappUrl = `https://wa.me/${numeroWhatsApp}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };
}

async function removeFromCart(panierId) {
    await window.supabaseClient
        .from('panier')
        .delete()
        .eq('id', panierId);
        
    renderCart();
}