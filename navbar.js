document.addEventListener('DOMContentLoaded', async () => {
    if (window.supabaseClient) {
        await renderNavbar();
    }
});

async function renderNavbar() {
    const navMenu = document.getElementById('dynamic-nav-menu');
    const navButtons = document.getElementById('dynamic-nav-buttons');

    if (!navMenu || !navButtons) return;

    const { data: { user } } = await window.supabaseClient.auth.getUser();

    // 1. On récupère le nom de la page sur laquelle on est (ex: "boutique.html")
    let currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    // 2. Petite fonction pour ajouter la couleur bleue si le lien correspond à la page
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
            <a href="connexion.html" class="nav-link me-2 btn-ins-2 fw-bold">Connexion</a>
            <a href="registre.html" class="btn btn-primary btn-ins-1">Inscription</a>
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
                <li class="nav-item ms-lg-3">
                    <a class="nav-link ${isActivePro}" href="dashboard-medecin.html"><i class="fas fa-stethoscope me-1"></i>Espace Pro</a>
                </li>
            `;
        } else {
            const isActivePatient = currentPath === 'dashboard.html' ? 'text-primary fw-bold border-bottom border-primary border-2' : 'text-muted';
            menuHTML += `
                <li class="nav-item ms-lg-3">
                    <a class="nav-link ${isActivePatient}" href="dashboard.html"><i class="fas fa-user-injured me-1"></i>Mon Dossier Santé</a>
                </li>
            `;
        }

        buttonsHTML = `
            <button id="nav-logout-btn" class="btn btn-outline-danger btn-sm rounded-pill px-3">
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