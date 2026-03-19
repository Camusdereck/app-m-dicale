// navbar.js - VERSION OPTIMISÉE POUR MOBILE (Menu Burger Corrigé)

document.addEventListener('DOMContentLoaded', async () => {
    if (window.supabaseClient) {
        await renderNavbar();
        setupMobileMenu(); // NOUVEAU : On active le menu burger une fois le HTML généré
    }
});

async function renderNavbar() {
    const navMenu = document.getElementById('dynamic-nav-menu');
    const navButtons = document.getElementById('dynamic-nav-buttons');

    if (!navMenu || !navButtons) return;

    const { data: { user } } = await window.supabaseClient.auth.getUser();

    // 1. On récupère le nom de la page
    let currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    // 2. Gestion de la couleur du lien actif
    const getActiveClass = (path) => {
        return currentPath === path ? 'text-primary fw-bold border-bottom border-primary border-2' : 'text-dark';
    };

    let menuHTML = `
        <li class="nav-item">
            <a class="nav-link ${getActiveClass('index.html')}" href="index.html">Accueil</a>
        </li>
        <li class="nav-item">
            <a class="nav-link ${getActiveClass('domicile.html')}" href="index.html#services">Services & Domicile</a>
        </li>
        <li class="nav-item">
            <a class="nav-link ${getActiveClass('boutique.html')}" href="boutique.html"><i class="fas fa-shopping-cart me-1"></i>Matériel Médical</a>
        </li>
        <li class="nav-item">
            <a class="nav-link ${getActiveClass('mediatheque.html')}" href="mediatheque.html"><i class="fas fa-video me-1"></i>Vidéos & Conseils</a>
        </li>
    `;
    let buttonsHTML = '';

    if (!user) {
        buttonsHTML = `
            <a href="connexion.html" class="nav-link me-2 btn-ins-2 fw-bold text-center mt-2 mt-lg-0">Connexion</a>
            <a href="registre.html" class="btn btn-primary btn-ins-1 text-center w-100 w-lg-auto mt-2 mt-lg-0">Inscription</a>
        `;
    } else {
        const { data: medecin } = await window.supabaseClient
            .from('medecins')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        if (medecin) {
            const isActivePro = currentPath === 'dashboard-medecin.html' ? 'text-primary fw-bold border-bottom border-primary border-2' : 'text-muted';
            menuHTML += `
                <li class="nav-item ms-lg-3 mt-2 mt-lg-0">
                    <a class="nav-link ${isActivePro}" href="dashboard-medecin.html"><i class="fas fa-stethoscope me-1"></i>Espace Pro</a>
                </li>
            `;
        } else {
            const isActivePatient = currentPath === 'dashboard.html' ? 'text-primary fw-bold border-bottom border-primary border-2' : 'text-muted';
            menuHTML += `
                <li class="nav-item ms-lg-3 mt-2 mt-lg-0">
                    <a class="nav-link ${isActivePatient}" href="dashboard.html"><i class="fas fa-user-injured me-1"></i>Mon Dossier</a>
                </li>
            `;
        }

        buttonsHTML = `
            <button id="nav-logout-btn" class="btn btn-outline-danger btn-sm rounded-pill px-3 w-100 w-lg-auto mt-3 mt-lg-0 shadow-sm">
                <i class="fas fa-sign-out-alt me-2"></i>Déconnexion
            </button>
        `;
    }

    navMenu.innerHTML = menuHTML;
    navButtons.innerHTML = buttonsHTML;

    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await window.supabaseClient.auth.signOut();
            window.location.href = "index.html";
        });
    }
}

// ==========================================
// LA MAGIE DU MENU MOBILE
// ==========================================
function setupMobileMenu() {
    const toggler = document.querySelector('.navbar-toggler');
    const collapseDiv = document.getElementById('navbarNav');

    if (!toggler || !collapseDiv) return;

    // 1. Ouvrir/Fermer au clic sur les 3 traits
    toggler.addEventListener('click', () => {
        collapseDiv.classList.toggle('show');
    });

    // 2. Fermer automatiquement si on clique sur un lien (UX fluide)
    const allLinks = collapseDiv.querySelectorAll('a, button');
    allLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Uniquement si on est sur écran mobile (Bootstrap lg break point est à 992px)
            if (window.innerWidth < 992) {
                collapseDiv.classList.remove('show');
            }
        });
    });

    // 3. Fermer si le client clique dans le vide à côté du menu
    document.addEventListener('click', (event) => {
        if (window.innerWidth < 992 && collapseDiv.classList.contains('show')) {
            const isClickInsideMenu = collapseDiv.contains(event.target) || toggler.contains(event.target);
            if (!isClickInsideMenu) {
                collapseDiv.classList.remove('show');
            }
        }
    });
}