// admin.js - EMSTE Admin Dashboard (VERSION COMPLÈTE ET OPTIMISÉE)

document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) return;

    setupNavigation();
    setupLogout();
    setupBlogForm();
    setupProduitForm();

    loadDashboardStats();
    loadDoctors();
    loadPatients(); 
    loadFinances();
    loadArticles();
    loadProduits();
});

// ==========================================
// 1. SÉCURITÉ & UTILITAIRES
// ==========================================
// À remplacer tout en haut de admin.js
async function checkAdminAccess() {
    // On vérifie si quelqu'un est connecté
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) {
        window.location.href = './connexion.html';
        return false;
    }

    // On vérifie si son email est bien dans la table 'admins'
    const { data: adminUser, error: dbError } = await window.supabaseClient
        .from('admins')
        .select('email')
        .eq('email', user.email)
        .maybeSingle();

    if (dbError || !adminUser) {
        alert("🔒 Accès refusé. Espace réservé à la direction EMSTE.");
        window.location.href = './index.html'; 
        return false;
    }
    
    return true; 
}

// ==========================================
// FONCTION D'UPLOAD D'IMAGES (DÉFINITIVE)
// ==========================================
async function uploadImageToStorage(fileInputId, folderName) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput.files || fileInput.files.length === 0) {
        throw new Error("Aucun fichier sélectionné.");
    }

    const file = fileInput.files[0];
    // Nettoyage du nom pour éviter les bugs avec les espaces ou accents
    const fileExt = file.name.split('.').pop();
    const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    const fileName = `${Date.now()}_${cleanName}.${fileExt}`;
    const filePath = `${folderName}/${fileName}`;

    // Upload vers le bucket
    const { error } = await window.supabaseClient.storage
        .from('medias')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) {
        console.error("Erreur détaillée de l'upload:", error);
        throw new Error("L'envoi de l'image a échoué. Vérifiez que le bucket 'medias' existe et est public.");
    }

    // Récupération de l'URL publique
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
// 3. STATISTIQUES (Vue d'ensemble)
// ==========================================
async function loadDashboardStats() {
    const { count: countMed } = await window.supabaseClient.from('medecins').select('*', { count: 'exact', head: true });
    const { count: countPat } = await window.supabaseClient.from('patients').select('*', { count: 'exact', head: true });
    const { count: countRdv } = await window.supabaseClient.from('rendez_vous').select('*', { count: 'exact', head: true });

    document.getElementById('stat-medecins').textContent = countMed || 0;
    document.getElementById('stat-patients').textContent = countPat || 0;
    document.getElementById('stat-rdv').textContent = countRdv || 0;

    const { data: rdvs } = await window.supabaseClient.from('rendez_vous').select('marge_plateforme').eq('statut', 'termine');
    let totalMarge = 0;
    if (rdvs) {
        rdvs.forEach(r => totalMarge += (r.marge_plateforme || 0));
    }
    document.getElementById('stat-revenus').textContent = totalMarge.toLocaleString('fr-FR') + ' FCFA';
}

// ==========================================
// 4. MÉDECINS & PATIENTS
// ==========================================
async function loadDoctors() {
    const tbody = document.getElementById('admin-medecins-list');
    const { data: medecins, error } = await window.supabaseClient.from('medecins').select('*').order('score_recherche', { ascending: false });

    if (error) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erreur.</td></tr>'; return; }
    tbody.innerHTML = '';
    
    medecins.forEach(med => {
        const nomComplet = `Dr. ${med.first_name || ''} ${med.last_name || ''}`;
        const statusBadge = med.est_actif !== false ? '<span class="badge bg-success">Actif</span>' : '<span class="badge bg-danger">Suspendu</span>';
        const btnAction = med.est_actif !== false
            ? `<button class="btn btn-sm btn-outline-danger w-100 mt-1 fw-bold" onclick="toggleUserStatus('medecins', '${med.id}', false)"><i class="fas fa-ban me-1"></i> Suspendre</button>`
            : `<button class="btn btn-sm btn-outline-success w-100 mt-1 fw-bold" onclick="toggleUserStatus('medecins', '${med.id}', true)"><i class="fas fa-check-circle me-1"></i> Réactiver</button>`;

        const tr = document.createElement('tr');
        if (med.est_actif === false) tr.style.opacity = '0.5';

        tr.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center me-3" style="width: 40px; height: 40px;">
                        ${nomComplet.substring(4, 6).toUpperCase()}
                    </div>
                    <div><strong>${nomComplet}</strong><div class="mt-1">${statusBadge}</div></div>
                </div>
            </td>
            <td><span class="badge bg-light text-dark border">${med.specialite || 'Non définie'}</span></td>
            <td class="text-muted small">${med.email || 'N/A'}</td>
            <td style="width:120px;">
                <input type="number" class="form-control form-control-sm text-center fw-bold text-primary mb-1" id="score-${med.id}" value="${med.score_recherche || 0}">
                <button class="btn btn-sm btn-light w-100" onclick="updateDoctorScore('${med.id}')">Booster</button>
            </td>
            <td style="width:140px;">${btnAction}</td>
        `;
        tbody.appendChild(tr);
    });
}

// FONCTION POUR LE BOUTON BOOSTER
window.updateDoctorScore = async function(medecinId) {
    const inputScore = document.getElementById(`score-${medecinId}`);
    const nouveauScore = parseInt(inputScore.value) || 0;

    const { error } = await window.supabaseClient
        .from('medecins')
        .update({ score_recherche: nouveauScore })
        .eq('id', medecinId);

    if (!error) {
        alert("Le score du médecin a été mis à jour avec succès ! Il remontera dans les recherches.");
        loadDoctors();
    } else {
        alert("Erreur lors de la mise à jour du score : " + error.message);
    }
};

async function loadPatients() {
    const tbody = document.getElementById('admin-patients-list');
    const { data: patients, error } = await window.supabaseClient.from('patients').select('*').order('created_at', { ascending: false });

    if (error) { tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erreur.</td></tr>'; return; }
    tbody.innerHTML = '';

    patients.forEach(pat => {
        const nomComplet = `${pat.first_name || ''} ${pat.last_name || ''}`;
        const dateIns = new Date(pat.created_at).toLocaleDateString('fr-FR');
        const statusBadge = pat.est_actif !== false ? '<span class="badge bg-success">Actif</span>' : '<span class="badge bg-danger">Bloqué</span>';
        const btnAction = pat.est_actif !== false
            ? `<button class="btn btn-sm btn-outline-danger fw-bold" onclick="toggleUserStatus('patients', '${pat.id}', false)">Bloquer</button>`
            : `<button class="btn btn-sm btn-outline-success fw-bold" onclick="toggleUserStatus('patients', '${pat.id}', true)">Débloquer</button>`;

        const tr = document.createElement('tr');
        if (pat.est_actif === false) tr.style.opacity = '0.5';

        tr.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="bg-secondary text-white rounded-circle d-flex justify-content-center align-items-center me-3" style="width: 40px; height: 40px;">
                        ${nomComplet.substring(0, 2).toUpperCase() || 'PA'}
                    </div>
                    <div><strong>${nomComplet || 'Sans Nom'}</strong><div class="mt-1">${statusBadge}</div></div>
                </div>
            </td>
            <td><div class="small">${pat.email || 'N/A'}</div><div class="small text-muted"><i class="fas fa-phone me-1"></i>${pat.telephone || 'Non renseigné'}</div></td>
            <td class="text-muted">${dateIns}</td>
            <td>${btnAction}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.toggleUserStatus = async function(table, id, rendreActif) {
    const actionText = rendreActif ? "réactiver" : "suspendre";
    if (confirm(`Voulez-vous vraiment ${actionText} ce compte ?`)) {
        const { error } = await window.supabaseClient.from(table).update({ est_actif: rendreActif }).eq('id', id);
        if (!error) {
            if (table === 'medecins') loadDoctors();
            if (table === 'patients') loadPatients();
        } else {
            alert("Erreur lors de la modification du statut.");
        }
    }
}

// ==========================================
// 5. FINANCES & DEMANDES DE RETRAIT
// ==========================================
async function loadFinances() {
    const tbody = document.getElementById('admin-finances-list');
    
    const { data: rdvs } = await window.supabaseClient.from('rendez_vous').select('marge_plateforme').eq('statut', 'termine');
    let totalMarge = 0;
    if (rdvs) rdvs.forEach(r => totalMarge += (r.marge_plateforme || 0));
    document.getElementById('total-marge-plateforme').textContent = totalMarge.toLocaleString('fr-FR') + ' FCFA';

    const { data: demandes, error } = await window.supabaseClient
        .from('demandes_retrait')
        .select(`id, montant, methode_paiement, numero_compte, statut, created_at, medecins (first_name, last_name, email)`)
        .order('created_at', { ascending: false });

    let totaleDette = 0;
    if (demandes) {
        demandes.filter(d => d.statut === 'en_attente').forEach(d => totaleDette += (d.montant || 0));
    }
    document.getElementById('total-dette-medecins').textContent = totaleDette.toLocaleString('fr-FR') + ' FCFA';

    if (error) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erreur serveur.</td></tr>'; return; }
    tbody.innerHTML = '';
    
    if (demandes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Aucune demande de retrait pour le moment.</td></tr>';
        return;
    }

    demandes.forEach(demande => {
        const nomComplet = demande.medecins ? `Dr. ${demande.medecins.first_name || ''} ${demande.medecins.last_name || ''}` : 'Médecin inconnu';
        const email = demande.medecins ? demande.medecins.email : '';
        const montant = demande.montant.toLocaleString('fr-FR') + ' FCFA';
        const dateDemande = new Date(demande.created_at).toLocaleDateString('fr-FR');
        
        let iconePaiement = 'fa-money-check-alt';
        if (demande.methode_paiement.toLowerCase().includes('wave')) iconePaiement = 'fa-water';
        if (demande.methode_paiement.toLowerCase().includes('orange')) iconePaiement = 'fa-mobile-alt';

        const infoPaiementHTML = `
            <div class="bg-light p-2 rounded border mt-2">
                <div class="small text-dark fw-bold text-uppercase"><i class="fas ${iconePaiement} text-primary me-1"></i> ${demande.methode_paiement}</div>
                <div class="small text-danger fw-bold" style="letter-spacing: 1px;">${demande.numero_compte}</div>
            </div>
        `;
        
        let btnAction = '';
        if(demande.statut === 'en_attente') {
            btnAction = `<button class="btn btn-success fw-bold w-100 shadow-sm" onclick="validerPaiement('${demande.id}')">
                            <i class="fas fa-check-double me-1"></i> Marquer Payé
                         </button>`;
        } else {
            btnAction = `<span class="badge bg-secondary"><i class="fas fa-check-circle me-1"></i> Déjà Payé</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${nomComplet}</strong><br>
                <small class="text-muted">${email}</small>
            </td>
            <td class="fw-bold text-danger fs-5">${montant}</td>
            <td>${infoPaiementHTML}</td>
            <td class="text-muted small">${dateDemande}</td>
            <td>${btnAction}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.validerPaiement = async function(id) {
    if(confirm("Confirmez-vous avoir effectué le transfert d'argent ? (Cette action est définitive)")) {
        const { error } = await window.supabaseClient.from('demandes_retrait').update({ statut: 'paye' }).eq('id', id);
        if(!error) {
            alert("Paiement validé avec succès !");
            loadFinances();
        } else {
            alert("Erreur lors de la validation.");
        }
    }
}

// ==========================================
// 6. MÉDIATHÈQUE & BOUTIQUE
// ==========================================
function setupBlogForm() {
    const form = document.getElementById('admin-article-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-article');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Upload...';
        btn.disabled = true;

        try {
            const imageUrl = await uploadImageToStorage('art-image-file', 'blog_images');
            const { error } = await window.supabaseClient.from('articles').insert([{
                titre: document.getElementById('art-titre').value,
                categorie: document.getElementById('art-categorie').value,
                resume: document.getElementById('art-resume').value,
                image_url: imageUrl, 
                video_url: document.getElementById('art-video').value,
                contenu: document.getElementById('art-contenu').value
            }]);
            if (error) throw error;
            form.reset();
            bootstrap.Modal.getInstance(document.getElementById('addArticleModal')).hide();
            loadArticles();
        } catch (error) { alert("Erreur : " + error.message); } 
        finally { btn.innerHTML = 'Publier maintenant'; btn.disabled = false; }
    });
}

async function loadArticles() {
    const container = document.getElementById('admin-articles-list');
    const { data: articles, error } = await window.supabaseClient.from('articles').select('*').order('created_at', { ascending: false });
    if (error || !articles || articles.length === 0) { container.innerHTML = '<div class="col-12 text-center py-5 text-muted">Aucun contenu publié.</div>'; return; }
    container.innerHTML = '';
    articles.forEach(art => {
        const imageSrc = art.image_url || 'https://via.placeholder.com/500';
        container.innerHTML += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card shadow-sm border-0 h-100 rounded-4 overflow-hidden">
                    <div style="height: 160px; overflow: hidden;"><img src="${imageSrc}" class="w-100 h-100" style="object-fit: cover;"></div>
                    <div class="card-body d-flex flex-column">
                        <span class="badge bg-primary mb-2 align-self-start">${art.categorie}</span>
                        <h6 class="fw-bold text-dark">${art.titre}</h6>
                    </div>
                    <div class="card-footer bg-light border-0 text-end">
                        <button class="btn btn-sm btn-outline-danger w-100 fw-bold" onclick="deleteArticle('${art.id}')"><i class="fas fa-trash-alt me-2"></i>Supprimer</button>
                    </div>
                </div>
            </div>`;
    });
}

window.deleteArticle = async function(id) {
    if (confirm("Supprimer ce contenu ?")) {
        await window.supabaseClient.from('articles').delete().eq('id', id);
        loadArticles();
    }
}

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
            const { error } = await window.supabaseClient.from('produits').insert([{
                nom: document.getElementById('prod-nom').value,
                prix: parseInt(document.getElementById('prod-prix').value),
                description: document.getElementById('prod-desc').value,
                image_url: imageUrl
            }]);
            if (error) throw error;
            form.reset();
            bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
            loadProduits();
        } catch (error) { alert("Erreur : " + error.message); } 
        finally { btn.innerHTML = 'Mettre en vente'; btn.disabled = false; }
    });
}

async function loadProduits() {
    const container = document.getElementById('admin-produits-list');
    const { data: produits, error } = await window.supabaseClient.from('produits').select('*').order('created_at', { ascending: false });
    if (error || !produits || produits.length === 0) { container.innerHTML = '<div class="col-12 text-center py-5 text-muted">Boutique vide.</div>'; return; }
    container.innerHTML = '';
    produits.forEach(prod => {
        container.innerHTML += `
            <div class="col-md-6 col-lg-3 mb-4">
                <div class="card shadow-sm border-0 h-100 rounded-4 overflow-hidden">
                    <div style="height: 180px; background: #f8f9fa;"><img src="${prod.image_url}" class="w-100 h-100" style="object-fit: contain; padding: 10px;"></div>
                    <div class="card-body d-flex flex-column text-center">
                        <h6 class="fw-bold mb-1">${prod.nom}</h6>
                        <h5 class="text-success fw-bold mb-3">${prod.prix.toLocaleString('fr-FR')} FCFA</h5>
                        <button class="btn btn-sm btn-outline-danger w-100 mt-auto fw-bold" onclick="deleteProduit('${prod.id}')">Retirer</button>
                    </div>
                </div>
            </div>`;
    });
}

window.deleteProduit = async function(id) {
    if (confirm("Retirer ce produit ?")) {
        await window.supabaseClient.from('produits').delete().eq('id', id);
        loadProduits();
    }
}

// ==========================================
// 7. MENU MOBILE (Gardé intact)
// ==========================================
const toggleBtn = document.getElementById('btn-toggle-admin');
const sidebar = document.querySelector('.admin-sidebar');
const overlay = document.getElementById('sidebar-overlay');

if(toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => { sidebar.classList.toggle('show'); overlay.classList.toggle('show'); });
    overlay.addEventListener('click', () => { sidebar.classList.remove('show'); overlay.classList.remove('show'); });
    document.querySelectorAll('.admin-sidebar nav a').forEach(link => {
        link.addEventListener('click', () => { if(window.innerWidth <= 991) { sidebar.classList.remove('show'); overlay.classList.remove('show'); } });
    });
}