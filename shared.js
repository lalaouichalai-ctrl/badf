// =======================================================
// shared.js (CORRIGÉ ET COMPLET - Admin + Ulrike Ratering)
// =======================================================

const STORAGE_KEY = 'bankAppUsers';

// --- Données initiales ---
const initialUsers = [
    // 👑 Utilisateur 0 : Admin Général
    {
        name: "Admin Général",
        clientCode: "0000000000",
        pin: "000000",
        solde: 999999.00,
        isAdmin: true,
        isLocked: false,
        lockReason: "",
        rib: "FR76 0000 0000 0000 0000 0000 000",
        bic: "ADMINXXX",
        phone: "0100000000",
        email: "admin@banque.com",
        address: "Siège Social, 75000 Paris",
        advisor: "Le Système",
        cardNumber: "9999000000009999",
        cardHolderName: "ADMIN GENERAL",
        expiryDate: "12/99",
        cardType: "MASTERCARD",
        history: [],
        beneficiaries: [],
        futureTransactions: [],
        lastConnection: "03/05/2020 à 13h51"
    },
    // 👤 Utilisateur 1 : ULRIKE RATERING (Standard)
    { 
        name: "ULRIKE RATERING", 
        clientCode: "8529637499", 
        pin: "728506", // <-- PIN STANDARD
        solde: 1699600.00, 
        isAdmin: false, 
        isLocked: false, 
        lockReason: "", 
        rib: "FR14 2004 4000 0112 3456 7890 181", 
        bic: "BDFEFRPPXXX",
        phone: "06********", 
        email: "ul***@mail.com", 
        address: "Wuppertal, Allemagne", 
        advisor: "Claude Hervé", 
        cardNumber: "4305011544024517", 
        cardHolderName: "ULRIKE RATERING",
        expiryDate: "02/27", 
        cardType: "VISA",
        history: [],
        beneficiaries: [],
        futureTransactions: [],
        lastConnection: "03/05/2020 à 13h51"
    }
];

// --- Fonctions de base ---
function getUsers() {
    let users = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // S'assurer que le tableau n'est pas vide ou contient l'Admin
    if (!users || users.length === 0 || !users.some(u => u.clientCode === "0000000000")) {
        users = initialUsers;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }
    return users;
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function updateUser(updatedUser) {
    let users = getUsers();
    const index = users.findIndex(u => u.clientCode === updatedUser.clientCode);
    if (index !== -1) {
        users[index] = updatedUser;
        saveUsers(users);
        return true;
    }
    return false;
}

function createUser(newUser) {
    let users = getUsers();
    if (users.some(u => u.clientCode === newUser.clientCode)) {
        return false;
    }
    const defaultCardName = newUser.name ? newUser.name.toUpperCase() : "NOUVEAU CLIENT";
    const finalUser = {
        ...newUser,
        history: newUser.history || [], // Utilisé en cas de données initiales fournies
        beneficiaries: newUser.beneficiaries || [],
        futureTransactions: newUser.futureTransactions || [],
        lastConnection: new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'}),
        cardHolderName: newUser.cardHolderName || defaultCardName,
        lockReason: newUser.isLocked ? newUser.lockReason || 'Nouveau compte à vérifier.' : ''
    };
    users.push(finalUser);
    saveUsers(users);
    return true;
}

function addPastHistory(clientCode, transaction) {
    let users = getUsers();
    const user = users.find(u => u.clientCode === clientCode);
    if (user) {
        user.history = user.history || [];
        user.history.push({ ...transaction });
        user.solde = user.solde + transaction.amount;
        user.history.sort((a, b) => new Date(b.date) - new Date(a.date));
        saveUsers(users);
        return true;
    }
    return false;
}

// --- Fonctions utilitaires ---
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function checkAuth(adminOnly = false) {
    const sessionClientCode = localStorage.getItem('currentClientCode');
    const users = getUsers();
    const currentUser = users.find(u => u.clientCode === sessionClientCode);

    if (!currentUser) {
        window.location.href = 'index.html';
        return null;
    }

    if (adminOnly && !currentUser.isAdmin) {
        window.location.href = 'dashboard.html';
        return null;
    }

    const userInfoElement = document.querySelector('.user-info span:first-child');
    if (userInfoElement) {
        // Afficher uniquement le prénom et le nom si possible
        const nameParts = currentUser.name.split(' ');
        const display = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[1]}` : currentUser.name;
        userInfoElement.textContent = `Bienvenue ${display}`;
    }

    const lastConnElement = document.querySelector('.last-conn');
    if (lastConnElement) {
        lastConnElement.textContent = `Dernière connexion le ${currentUser.lastConnection}`;
    }

    const logoutLink = document.querySelector('.status');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentClientCode');
            window.location.href = 'index.html';
        });
    }

    return currentUser;
}

// NOTE : La fonction de navigation (document.addEventListener('DOMContentLoaded', ...))
// qui était présente dans les versions précédentes n'est pas dans ce "vrai" shared.js.
// Si elle est nécessaire, elle devra être ajoutée manuellement ou dans un autre fichier JS.