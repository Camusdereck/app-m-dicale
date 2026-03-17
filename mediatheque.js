let tousLesArticles = [];

document.addEventListener('DOMContentLoaded', () => {
    chargerArticles();
});

async function chargerArticles() {
    const grid = document.getElementById('articles-grid');

    const { data: articles, error } = await window.supabaseClient
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erreur de chargement des articles:", error);
        grid.innerHTML = '<div class="col-12 text-center text-danger py-5"><i class="fas fa-exclamation-triangle fs-1 mb-3"></i><p>Impossible de charger la médiathèque pour le moment.</p></div>';
        return;
    }

    tousLesArticles = articles;
    afficherArticles(articles);
}

function afficherArticles(articles) {
    const grid = document.getElementById('articles-grid');
    grid.innerHTML = '';

    if (!articles || articles.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-5"><i class="fas fa-folder-open fs-1 mb-3 d-block"></i>Aucun article disponible dans cette catégorie.</div>';
        return;
    }

    articles.forEach(article => {
        const isVideo = article.video_url && article.video_url.trim() !== '';
        
        // Icône de lecture si c'est une vidéo
        const playOverlay = isVideo ? '<i class="fas fa-play-circle play-icon-overlay"></i>' : '';
        const badgeColor = isVideo ? 'bg-danger' : 'bg-primary';
        const buttonText = isVideo ? '<i class="fas fa-play me-2"></i>Voir la vidéo' : 'Lire la suite';
        
        // Image par défaut si aucune image n'est fournie
        const imageUrl = article.image_url || 'https://images.unsplash.com/photo-1576091160550-2173ff9e5ee5?w=800&q=80';

        const cardHTML = `
            <div class="col-md-6 col-lg-4">
                <div class="card article-card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div class="article-img-container">
                        <span class="badge ${badgeColor} category-badge shadow-sm fs-6">${article.categorie || 'Santé'}</span>
                        <img src="${imageUrl}" class="article-img" alt="${article.titre}">
                        ${playOverlay}
                    </div>
                    <div class="card-body p-4 d-flex flex-column">
                        <h5 class="fw-bold text-primary-dark mb-3">${article.titre}</h5>
                        <p class="text-muted small mb-4 flex-grow-1">${article.resume || ''}</p>
                        <button class="btn btn-outline-primary w-100 fw-bold rounded-pill" onclick="ouvrirArticle('${article.id}')">
                            ${buttonText}
                        </button>
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}

// Fonction de filtrage (reliée aux boutons en haut de la page)
window.filtrerArticles = function(categorie) {
    // Gérer l'état actif des boutons
    document.querySelectorAll('#categories-filter button').forEach(btn => {
        btn.classList.remove('btn-primary', 'active');
        btn.classList.add('btn-outline-primary');
        if(btn.textContent.includes(categorie)) {
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-primary', 'active');
        }
    });

    if (categorie === 'Tous') {
        afficherArticles(tousLesArticles);
    } else {
        const filtres = tousLesArticles.filter(art => art.categorie === categorie);
        afficherArticles(filtres);
    }
}

window.ouvrirArticle = function(id) {
    // On envoie le visiteur vers la page modèle avec l'ID dans l'URL (ex: article.html?id=123)
    window.location.href = `article.html?id=${id}`;
}