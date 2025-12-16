// =========================================================================
// shared.js ADAPTÉ POUR FIRESTORE - Site B (nouvo-depart/Admin/Ulrike)
// =========================================================================

// --- 1. Configuration Firebase (À REMPLACER PAR VOS CLÉS ACTUELLES SI DIFFÉRENTES) ---
const firebaseConfig = {
    apiKey: "AIzaSyAYBpV95meCzCoLZWGBhbflqLFiqR0mToc",
  authDomain: "lastone-2ef2f.firebaseapp.com",
  projectId: "lastone-2ef2f",
  storageBucket: "lastone-2ef2f.firebasestorage.app",
  messagingSenderId: "983919060318",
  appId: "1:983919060318:web:2708d4b4a0ca3e2d7d5bcf"
};

// Initialisation de Firebase et Firestore
let db;
const USERS_COLLECTION = 'users'; // Nom de la collection dans Firestore

// Initialisation de Firebase
function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        console.warn("Firebase SDK non détecté. Fonctionnement en mode LocalStorage de secours.");
        return;
    }
    if (!db) {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            console.log("Connexion à Firebase réussie.");
        } catch (error) {
            console.error("Échec de l'initialisation de Firebase.", error);
        }
    }
}
initializeFirebase();

// Clé de stockage LocalStorage (utilisée uniquement comme fallback/cache)
const STORAGE_KEY = 'bankAppUsers'; 

// --- 2. Données initiales du Site B ---
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
        history: [],
        beneficiaries: [],
        futureTransactions: [],
        lastConnection: "03/05/2020 à 13h51",
        // Ajout de la structure 'carte' pour l'Admin
        carte: { 
            numero: "9999000000009999",
            titulaire: "ADMIN GENERAL",
            expiration: "12/99",
            cardType: "MASTERCARD",
            active: false // L'Admin n'a pas besoin d'une carte active par défaut
        }
    },
    // 👤 Utilisateur 1 : ULRIKE RATERING (Standard)
    { 
        name: "JEAN FRANCOIS LEVASSEUR", 
        clientCode: "8529637499", 
        pin: "728506", 
        solde: 2625000.00, 
        isAdmin: false, 
        isLocked: false, 
        lockReason: "", 
        rib: "FR76 1504 4000 0112 3456 7890 181", 
        bic: "GTBINGLAXXX",
        phone: "06********", 
        email: "ul***@mail.com", 
        address: "10 Rue Claude Goudet, 34340 Marseillan", 
        advisor: "Claude Hervé", 
        history: [],
        beneficiaries: [],
        futureTransactions: [],
        lastConnection: "03/05/2020 à 13h51",
        // 🚀 CORRECTION : Regroupement des données de la carte sous l'objet 'carte'
        carte: {
            numero: "5244070011044789",
            titulaire: "J.F LEVASSEUR",
            expiration: "02/27",
            cardType: "Mastercard",
            active: true // Définie comme active pour l'utilisateur standard
        }
    }
];

// NOTE: Les anciennes propriétés cardNumber, cardHolderName, expiryDate et cardType ont été supprimées
// de la racine de l'objet et déplacées dans la nouvelle structure 'carte'.


// =========================================================================
// FONCTIONS DE GESTION DES DONNÉES (ADAPTÉES POUR FIRESTORE)
// =========================================================================

/**
 * Fonction utilitaire pour sauvegarder la liste complète dans Firestore (Admin ou Initialisation)
 * @param {Array} users La liste complète des utilisateurs à sauvegarder.
 */
async function syncUsersToFirestore(users) {
    if (typeof db === 'undefined') return;
    try {
        const batch = db.batch();
        users.forEach(user => {
            const docRef = db.collection(USERS_COLLECTION).doc(user.clientCode);
            batch.set(docRef, user);
        });
        await batch.commit();
        console.log("Synchronisation des utilisateurs Firestore réussie.");
    } catch (error) {
        console.error("Erreur lors de la synchronisation de tous les utilisateurs vers Firestore:", error);
    }
}


/**
 * Récupère tous les utilisateurs depuis Firebase, initialise la BDD si vide, et met à jour le LocalStorage.
 * @returns {Promise<Array>} La liste des utilisateurs.
 */
async function getUsers() {
    initializeFirebase();

    // Fallback LocalStorage si Firebase n'est pas prêt
    if (typeof db === 'undefined') {
        const localUsers = localStorage.getItem(STORAGE_KEY);
        // Si LocalStorage est vide aussi, on retourne les données initiales (SANS les sauvegarder dans Firestore)
        return localUsers ? JSON.parse(localUsers) : initialUsers;
    }
    
    try {
        const snapshot = await db.collection(USERS_COLLECTION).get();
        let users = [];
        
        snapshot.forEach(doc => {
            users.push({ ...doc.data() });
        });
        
        // Initialisation de la BDD si elle est vide
        if (users.length === 0 || snapshot.empty) {
            console.log("Base de données Firebase vide. Initialisation avec les profils par défaut du Site B.");
            await syncUsersToFirestore(initialUsers); // Écrit les données initiales dans Firestore
            users = initialUsers;
        }
        
        // Succès: Mise à jour du localStorage en backup
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
        return users;

    } catch (error) {
        console.error("Erreur de connexion/lecture Firebase. Utilisation des données locales.", error);
        const localUsers = localStorage.getItem(STORAGE_KEY);
        // Fallback ultime : LocalStorage ou initialUsers
        return localUsers ? JSON.parse(localUsers) : initialUsers;
    }
}

/**
 * Sauvegarde (créé ou écrase) les données d'un utilisateur dans Firestore ET LocalStorage.
 * @param {Object} userData Les données complètes de l'utilisateur.
 */
async function saveUserToFirestoreAndLocal(userData) {
    // Étape 1: Sauvegarde locale (du Site B)
    let users = await getUsers(); // Obtient la liste pour la mise à jour locale
    const index = users.findIndex(u => u.clientCode === userData.clientCode);
    if (index !== -1) {
        users[index] = userData;
    } else {
        users.push(userData);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

    // Étape 2: Sauvegarde Firebase
    initializeFirebase();
    if (typeof db !== 'undefined') {
        try {
            await db.collection(USERS_COLLECTION).doc(userData.clientCode).set(userData);
            console.log(`Utilisateur ${userData.clientCode} sauvegardé/mis à jour dans Firebase.`);
        } catch (error) {
            console.error("FIREBASE ERREUR DE SAUVEGARDE:", error);
            throw new Error(`Erreur Firebase : Vérifiez vos règles de sécurité ou votre connexion.`); 
        }
    } else {
        console.warn("Mise à jour uniquement en LocalStorage car Firebase n'est pas disponible.");
    }
}


// --- 3. Adaptation des fonctions CRUD du Site B ---

// Mise à jour de la fonction updateUser pour écrire dans Firestore
async function updateUser(updatedUser) {
    try {
        await saveUserToFirestoreAndLocal(updatedUser);
        return true;
    } catch (e) {
        console.error("Échec de la mise à jour :", e);
        return false;
    }
}

// Mise à jour de la fonction createUser pour écrire dans Firestore
async function createUser(newUser) {
    let users = await getUsers();
    if (users.some(u => u.clientCode === newUser.clientCode)) {
        return false; // Utilisateur déjà existant
    }
    
    // Logique de création de l'utilisateur (conservée)
    const defaultCardName = newUser.name ? newUser.name.toUpperCase() : "NOUVEAU CLIENT";
    const finalUser = {
        ...newUser,
        history: newUser.history || [],
        beneficiaries: newUser.beneficiaries || [],
        futureTransactions: newUser.futureTransactions || [],
        lastConnection: new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'}),
        cardHolderName: newUser.cardHolderName || defaultCardName,
        lockReason: newUser.isLocked ? newUser.lockReason || 'Nouveau compte à vérifier.' : ''
    };
    
    try {
        await saveUserToFirestoreAndLocal(finalUser);
        return true;
    } catch (e) {
        console.error("Échec de la création d'utilisateur :", e);
        return false;
    }
}

// Mise à jour de la fonction addPastHistory pour écrire dans Firestore
async function addPastHistory(clientCode, transaction) {
    let users = await getUsers();
    const user = users.find(u => u.clientCode === clientCode);
    
    if (user) {
        user.history = user.history || [];
        user.history.push({ ...transaction });
        user.solde = user.solde + transaction.amount;
        user.history.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Mise à jour dans Firestore et LocalStorage
        return updateUser(user); 
    }
    return false;
}


// --- 4. Fonctions de Récupération (Client) (Conservées et Firestore-enabled) ---

// getCurrentUser: Lecture synchrone (LocalStorage seulement) - AUCUN CHANGEMENT NÉCESSAIRE
function getCurrentUser() {
    const code = localStorage.getItem('currentClientCode');
    if (!code) return null;
    
    const users = localStorage.getItem(STORAGE_KEY);
    if (!users) return null;
    
    return JSON.parse(users).find(u => u.clientCode === code);
}

// Fonction pour récupérer l'utilisateur le plus frais (Firestore d'abord)
// Cette fonction utilise la fonction getUsers() pour forcer la synchronisation.
async function getFreshUser(clientCode) {
    initializeFirebase();
    if (typeof db !== 'undefined') {
        try {
            const doc = await db.collection(USERS_COLLECTION).doc(clientCode).get();
            if (doc.exists) {
                const user = doc.data();
                // Mise à jour du LocalStorage avec les données fraîches
                await saveUserToFirestoreAndLocal(user); 
                return user;
            }
        } catch (error) {
            console.warn("Échec de la lecture Firebase pour l'utilisateur actuel. Utilisation du LocalStorage.", error);
        }
    }
    // Fallback: lecture de la version locale
    return getCurrentUser(); 
}


// --- 5. Fonctions Utilitaires (Corrigées) ---

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

/**
 * ⚠️ CORRECTION PRINCIPALE : Rendre la fonction ASYNCHRONE et utiliser await pour getUsers().
 */
async function checkAuth(adminOnly = false) {
    const sessionClientCode = localStorage.getItem('currentClientCode');
    
    // IMPORTANT : On appelle getUsers() ici pour s'assurer que si un admin a modifié 
    // les données depuis Firestore, elles sont au moins dans le LocalStorage (cache).
    // CORRECTION : Utiliser await pour attendre le tableau des utilisateurs.
    const users = await getUsers(); 
    const currentUser = users.find(u => u.clientCode === sessionClientCode);

    // Si aucune session ou utilisateur trouvé après la lecture de la BDD/Cache
    if (!currentUser) {
        // Dans index.html, cette condition est normale si non connecté. 
        // Sur les autres pages, cela redirige vers la connexion.
        if (window.location.pathname.includes('index.html')) {
             return null; // Ne rien faire, l'utilisateur est sur la page de connexion
        }
        window.location.href = 'index.html';
        return null;
    }

    // Redirection si l'utilisateur n'est pas admin et tente d'accéder à une page admin
    if (adminOnly && !currentUser.isAdmin) {
        window.location.href = 'dashboard.html';
        return null;
    }

    // [Le reste de la fonction checkAuth pour la mise à jour de l'UI]
    const userInfoElement = document.querySelector('.user-info span:first-child');
    if (userInfoElement) {
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