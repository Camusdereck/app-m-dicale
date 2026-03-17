// admin.js - Le Cerveau du Super Dashboard Admin (Nettoyé et Fusionné)

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Vérification de sécurité
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) return;

    // 2. Initialisation de l'interface et de la navigation
    setupNavigation();
    setupLogout();

    // 3. Initialisation des formulaires (Articles & Produits)
    setupBlogForm();
    setupProduitForm();

    // 4. Chargement des données des différents onglets
    loadDashboardStats();
    loadDoctors();
    loadArticles();
    loadProduits();
});

// ==========================================
// 1. SÉCURITÉ & UTILITAIRES
// ==========================================

async function checkAdminAccess() {
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    
    if (authError || !user) {
        window.location.href = './connexion.html';
        return false;
    }

    const { data: adminUser, error: dbError } = await window.supabaseClient
        .from('admins')
        .select('email')
        .eq('email', user.email)
        .maybeSingle();

    if (dbError || !adminUser) {
        alert("🔒 Accès refusé. Vous n'avez pas les droits d'administration.");
        window.location.href = './index.html'; 
        return false;
    }

    return true; 
}

// Fonction centrale pour uploader une image dans un bucket Supabase
async function uploadImageToStorage(fileInputId, folderName) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput.files || fileInput.files.length === 0) return null;

    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${folderName}/${fileName}`;

    // Upload dans le bucket public 'medias'
    const { data, error } = await window.supabaseClient.storage
        .from('medias')
        .upload(filePath, file);

    if (error) {
        console.error("Erreur d'upload :", error);
        throw error;
    }

    // Récupérer l'URL publique
    const { data: publicUrlData } = window.supabaseClient.storage
        .from('medias')
        .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
}

// ==========================================
// 2. NAVIGATION ET LOGOUT
// ==========================================

function setupNavigation() {
    const links = document.querySelectorAll('.admin-sidebar nav a[data-target]');
    const panels = document.querySelectorAll('.section-panel');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            links.forEach(l => l.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

function setupLogout() {
    document.getElementById('admin-logout').addEventListener('click', async (e) => {
        e.preventDefault();
        await window.supabaseClient.auth.signOut();
        window.location.href = './connexion.html';
    });
}

// ==========================================
// 3. ONGLET 1 : STATISTIQUES
// ==========================================

async function loadDashboardStats() {
    const { count: countMed } = await window.supabaseClient.from('medecins').select('*', { count: 'exact', head: true });
    const { count: countPat } = await window.supabaseClient.from('patients').select('*', { count: 'exact', head: true });
    const { count: countRdv } = await window.supabaseClient.from('rendez_vous').select('*', { count: 'exact', head: true });

    document.getElementById('stat-medecins').textContent = countMed || 0;
    document.getElementById('stat-patients').textContent = countPat || 0;
    document.getElementById('stat-rdv').textContent = countRdv || 0;
}

// ==========================================
// 4. ONGLET 2 : MÉDECINS & RANKING
// ==========================================

async function loadDoctors() {
    const tbody = document.getElementById('admin-medecins-list');
    
    const { data: medecins, error } = await window.supabaseClient
        .from('medecins')
        .select('*')
        .order('score_recherche', { ascending: false });

    if (error) { 
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erreur de chargement.</td></tr>'; 
        return; 
    }
    
    tbody.innerHTML = '';
    
    medecins.forEach(med => {
        const nomComplet = `Dr. ${med.first_name || ''} ${med.last_name || ''}`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center me-3" style="width: 40px; height: 40px;">
                        ${nomComplet.substring(4, 6).toUpperCase()}
                    </div>
                    <strong>${nomComplet}</strong>
                </div>
            </td>
            <td><span class="badge bg-light text-dark border">${med.specialite || 'Non définie'}</span></td>
            <td class="text-muted small">${med.email || 'N/A'}</td>
            <td style="width:150px;">
                <input type="number" class="form-control text-center fw-bold text-primary" id="score-${med.id}" value="${med.score_recherche || 0}">
            </td>
            <td>
                <button class="btn btn-sm btn-success fw-bold w-100" onclick="updateDoctorScore('${med.id}')">
                    <i class="fas fa-arrow-up me-1"></i> Booster
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateDoctorScore = async function(id) {
    const nouveauScore = document.getElementById(`score-${id}`).value;
    
    const { error } = await window.supabaseClient
        .from('medecins')
        .update({ score_recherche: parseInt(nouveauScore) })
        .eq('id', id);
        
    if (!error) {
        const btn = document.querySelector(`button[onclick="updateDoctorScore('${id}')"]`);
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Enregistré';
        btn.classList.replace('btn-success', 'btn-dark');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.replace('btn-dark', 'btn-success');
            loadDoctors(); 
        }, 1500);
    } else {
        alert("Erreur lors de la mise à jour du score.");
    }
}

// ==========================================
// 5. ONGLET 3 : MÉDIATHÈQUE (ARTICLES)
// ==========================================

function setupBlogForm() {
    const form = document.getElementById('admin-article-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('btn-save-article');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Upload en cours...';
        btn.disabled = true;

        try {
            const imageUrl = await uploadImageToStorage('art-image-file', 'blog_images');

            const nouvelArticle = {
                titre: document.getElementById('art-titre').value,
                categorie: document.getElementById('art-categorie').value,
                resume: document.getElementById('art-resume').value,
                image_url: imageUrl, 
                video_url: document.getElementById('art-video').value,
                contenu: document.getElementById('art-contenu').value
            };

            const { error } = await window.supabaseClient.from('articles').insert([nouvelArticle]);
            if (error) throw error;

            form.reset();
            bootstrap.Modal.getInstance(document.getElementById('addArticleModal')).hide();
            loadArticles();
            alert("Article publié avec succès !");
        } catch (error) {
            alert("Erreur : " + error.message);
        } finally {
            btn.innerHTML = 'Publier maintenant';
            btn.disabled = false;
        }
    });
}

async function loadArticles() {
    const container = document.getElementById('admin-articles-list');
    
    const { data: articles, error } = await window.supabaseClient
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error || !articles || articles.length === 0) { 
        container.innerHTML = '<div class="col-12 text-center py-5 text-muted"><i class="fas fa-newspaper fs-1 mb-3 d-block"></i>Aucun contenu publié pour le moment.</div>'; 
        return; 
    }

    container.innerHTML = '';
    
    articles.forEach(art => {
        const imageSrc = art.image_url || 'https://images.unsplash.com/photo-1576091160550-2173ff9e5ee5?w=500&q=80';
        const isVideo = art.video_url ? '<i class="fas fa-play-circle text-danger ms-2"></i>' : '';

        container.innerHTML += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card shadow-sm border-0 h-100 rounded-4 overflow-hidden">
                    <div style="height: 160px; overflow: hidden;">
                        <img src="${imageSrc}" class="w-100 h-100" style="object-fit: cover;">
                    </div>
                    <div class="card-body d-flex flex-column">
                        <span class="badge bg-primary mb-2 align-self-start">${art.categorie}</span>
                        <h6 class="fw-bold text-dark">${art.titre} ${isVideo}</h6>
                        <p class="small text-muted mb-0 flex-grow-1">${art.resume ? art.resume.substring(0, 80) + '...' : ''}</p>
                    </div>
                    <div class="card-footer bg-light border-0 text-end">
                        <button class="btn btn-sm btn-outline-danger w-100 fw-bold" onclick="deleteArticle('${art.id}')">
                            <i class="fas fa-trash-alt me-2"></i>Supprimer
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

window.deleteArticle = async function(id) {
    if (confirm("Voulez-vous vraiment supprimer ce contenu ?")) {
        const { error } = await window.supabaseClient.from('articles').delete().eq('id', id);
        if (!error) loadArticles();
    }
}

// ==========================================
// 6. ONGLET 4 : BOUTIQUE (PRODUITS)
// ==========================================

function setupProduitForm() {
    const form = document.getElementById('admin-produit-form');
    if(!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('btn-save-produit');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Création...';
        btn.disabled = true;

        try {
            const imageUrl = await uploadImageToStorage('prod-image-file', 'produits_images');

            // On s'assure que les colonnes correspondent à ta table existante
            const nouveauProduit = {
                nom: document.getElementById('prod-nom').value,
                prix: parseInt(document.getElementById('prod-prix').value),
                description: document.getElementById('prod-desc').value,
                image_url: imageUrl
            };

            const { error } = await window.supabaseClient.from('produits').insert([nouveauProduit]);
            if (error) throw error;

            form.reset();
            bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
            loadProduits();
        } catch (error) {
            alert("Erreur lors de l'ajout du produit : " + error.message);
        } finally {
            btn.innerHTML = 'Mettre en vente';
            btn.disabled = false;
        }
    });
}

async function loadProduits() {
    const container = document.getElementById('admin-produits-list');
    if(!container) return;
    
    const { data: produits, error } = await window.supabaseClient
        .from('produits')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error || !produits || produits.length === 0) { 
        container.innerHTML = '<div class="col-12 text-center py-5 text-muted"><i class="fas fa-box-open fs-1 mb-3 d-block"></i>La boutique est vide.</div>'; 
        return; 
    }

    container.innerHTML = '';
    
    produits.forEach(prod => {
        // Sécurité si un produit n'a pas de prix défini
        const prixFormat = prod.prix ? prod.prix.toLocaleString('fr-FR') + ' FCFA' : 'Prix non défini';
        const imageSrc = prod.image_url || 'https://via.placeholder.com/300x200?text=Pas+d%27image';
        
        container.innerHTML += `
            <div class="col-md-6 col-lg-3 mb-4">
                <div class="card shadow-sm border-0 h-100 rounded-4 overflow-hidden">
                    <div style="height: 180px; overflow: hidden; background: #f8f9fa;">
                        <img src="${imageSrc}" class="w-100 h-100" style="object-fit: contain; padding: 10px;">
                    </div>
                    <div class="card-body d-flex flex-column text-center">
                        <h6 class="fw-bold text-dark mb-1">${prod.nom}</h6>
                        <h5 class="text-success fw-bold mb-3">${prixFormat}</h5>
                        <button class="btn btn-sm btn-outline-danger w-100 mt-auto fw-bold" onclick="deleteProduit('${prod.id}')">
                            <i class="fas fa-trash-alt me-2"></i>Retirer
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

window.deleteProduit = async function(id) {
    if (confirm("Voulez-vous vraiment retirer ce produit de la vente ?")) {
        const { error } = await window.supabaseClient.from('produits').delete().eq('id', id);
        if (!error) loadProduits();
    }
}


// A AJOUTER A LA FIN DE admin.js
const toggleBtn = document.getElementById('btn-toggle-admin');
const sidebar = document.querySelector('.admin-sidebar');
const overlay = document.getElementById('sidebar-overlay');

if(toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        overlay.classList.toggle('show');
    });
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    });
    // Fermer le menu si on clique sur un lien (sur mobile)
    document.querySelectorAll('.admin-sidebar nav a').forEach(link => {
        link.addEventListener('click', () => {
            if(window.innerWidth <= 991) {
                sidebar.classList.remove('show');
                overlay.classList.remove('show');
            }
        });
    });
}