document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartUI();
});

async function loadProducts() {
    const grid = document.getElementById('products-grid');

    const { data: produits, error } = await window.supabaseClient
        .from('produits')
        .select('*')
        .order('nom', { ascending: true });

    if (error) {
        grid.innerHTML = `<div class="alert alert-danger w-100 text-center">Erreur lors du chargement des produits.</div>`;
        return;
    }

    if (!produits || produits.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center text-muted py-5"><i class="fas fa-box-open fs-1 mb-3"></i><p>Aucun produit disponible pour le moment.</p></div>`;
        return;
    }

    grid.innerHTML = ''; 

    produits.forEach(produit => {
        const imageUrl = produit.image_url || 'https://via.placeholder.com/300x200?text=Image+non+disponible';
        const prixFormatte = new Intl.NumberFormat('fr-FR').format(produit.prix) + ' FCFA';

        const card = document.createElement('div');
        card.className = 'col-sm-6 col-md-4 col-lg-3';
        
        card.innerHTML = `
            <div class="card product-card bg-white">
                <img src="${imageUrl}" class="card-img-top product-img" alt="${produit.nom}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title fw-bold text-dark fs-6">${produit.nom}</h5>
                    <p class="card-text text-muted small flex-grow-1">${produit.description || ''}</p>
                    <div class="mt-3 d-flex justify-content-between align-items-center">
                        <span class="price-badge">${prixFormatte}</span>
                        <button class="btn btn-primary btn-sm rounded-circle shadow-sm" style="width: 35px; height: 35px;" onclick="addToCart('${produit.id}', '${produit.nom.replace(/'/g, "\\'")}')">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

async function updateCartUI() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    const { data: cartItems, error } = await window.supabaseClient
        .from('panier')
        .select('quantite')
        .eq('patient_id', user.id);

    if (!error && cartItems) {
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantite, 0);
        const cartSummary = document.getElementById('cart-summary');
        if(cartSummary) {
            cartSummary.innerHTML = `<i class="fas fa-shopping-cart me-2"></i> Panier (${totalItems})`;
        }
    }
}

async function addToCart(produitId, nomProduit) {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    
    if (!user) {
        alert("Veuillez vous connecter pour ajouter des articles au panier.");
        window.location.href = "connexion.html";
        return;
    }

    const { data: existingItem } = await window.supabaseClient
        .from('panier')
        .select('id, quantite')
        .eq('patient_id', user.id)
        .eq('produit_id', produitId)
        .maybeSingle();

    if (existingItem) {
        await window.supabaseClient
            .from('panier')
            .update({ quantite: existingItem.quantite + 1 })
            .eq('id', existingItem.id);
    } else {
        await window.supabaseClient
            .from('panier')
            .insert([{ 
                patient_id: user.id, 
                produit_id: produitId, 
                quantite: 1 
            }]);
    }
    
    updateCartUI();
    
    const notif = document.createElement('div');
    notif.className = 'position-fixed bottom-0 end-0 p-3';
    notif.style.zIndex = '1050';
    notif.innerHTML = `
        <div class="toast show bg-success text-white border-0 shadow-lg" role="alert">
            <div class="toast-body fw-bold">
                <i class="fas fa-check-circle me-2"></i> ${nomProduit} ajouté au panier !
            </div>
        </div>
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}