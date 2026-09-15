const SUPABASE_URL = 'https://hjduofhhimdezhywkvlx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tdvCZON4HcFe_7hmy6Nb-g_m6a8WDhe';
const supabaseClient = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const burger = document.querySelector('.burger');
const navMenu = document.querySelector('.nav-menu');
const cartButton = document.querySelector('.cart-button');
const accountButton = document.querySelector('.account-button');
const revealItems = document.querySelectorAll('.reveal');
const products = document.querySelectorAll('.product');
const showcase = document.querySelector('.product-showcase');
const cartCount = document.querySelector('.cart-count');
const productModal = document.querySelector('.product-modal');
const modalClose = document.querySelector('.modal-close');
const favoriteStorageKey = 'iglow-favorites';
const cartStorageKey = 'iglow-cart';
function readStoreState(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

let favorites = readStoreState(favoriteStorageKey);
let cart = readStoreState(cartStorageKey);

function saveStoreState() {
    localStorage.setItem(favoriteStorageKey, JSON.stringify(favorites));
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
}

function updateCartCount() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.setAttribute('aria-label', `${totalItems} article${totalItems > 1 ? 's' : ''} dans le panier`);
    }
}

function getProductData(product) {
    return {
        name: product.querySelector('h4')?.textContent.trim() || '',
        description: product.querySelector('.product-info p')?.textContent.trim() || '',
        price: product.querySelector('.product-bottom strong')?.textContent.trim() || '',
        image: product.querySelector('.product-image img')?.src || '',
        stock: Number(product.dataset.stock || 0)
    };
}

function showProductDetails(product) {
    const data = getProductData(product);
    if (!productModal) {
        return;
    }

    productModal.querySelector('.modal-product-image').src = data.image;
    productModal.querySelector('.modal-product-image').alt = data.name;
    productModal.querySelector('#modal-product-name').textContent = data.name;
    productModal.querySelector('.modal-product-description').textContent = data.description;
    productModal.querySelector('.modal-product-price').textContent = data.price;
    productModal.hidden = false;
    document.body.classList.add('modal-open');
}

function closeProductDetails() {
    if (productModal) {
        productModal.hidden = true;
        document.body.classList.remove('modal-open');
    }
}

function addToCart(product) {
    const data = getProductData(product);
    if (data.stock < 1) {
        alert(`${data.name} est momentanément en rupture de stock.`);
        return;
    }

    const existingItem = cart.find((item) => item.name === data.name);
    if (existingItem) {
        if (existingItem.quantity < data.stock) {
            existingItem.quantity += 1;
        }
    } else {
        cart.push({ name: data.name, price: data.price, quantity: 1 });
    }

    saveStoreState();
    updateCartCount();
}

async function syncProductsFromDatabase() {
    if (!supabaseClient) {
        return;
    }

    const { data, error } = await supabaseClient
        .from('products')
        .select('name, description, price_xof, stock')
        .eq('is_active', true);

    if (error) {
        console.warn('Impossible de charger les produits Supabase.', error.message);
        return;
    }

    const productsByName = new Map(data.map((product) => [product.name, product]));

    products.forEach((product) => {
        const name = product.querySelector('h4')?.textContent.trim();
        const databaseProduct = productsByName.get(name);
        const badge = product.querySelector('.stock-badge');
        const price = product.querySelector('.product-bottom strong');
        const description = product.querySelector('.product-info p');

        if (!databaseProduct) {
            return;
        }

        product.dataset.stock = databaseProduct.stock;

        if (price) {
            price.textContent = `${databaseProduct.price_xof.toLocaleString('fr-FR')} FCFA`;
        }

        if (description) {
            description.textContent = databaseProduct.description;
        }

        if (badge) {
            badge.textContent = databaseProduct.stock > 0
                ? `${databaseProduct.stock} en stock`
                : 'Rupture de stock';
            badge.classList.toggle('out-stock', databaseProduct.stock <= 0);
        }
    });
}

syncProductsFromDatabase();
updateCartCount();

if (burger && navMenu) {
    burger.addEventListener('click', () => {
        const isOpen = navMenu.classList.toggle('open');
        burger.classList.toggle('open', isOpen);
        burger.setAttribute('aria-expanded', String(isOpen));
    });

    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('open');
            burger.classList.remove('open');
            burger.setAttribute('aria-expanded', 'false');
        });
    });
}

if (cartButton) {
    cartButton.addEventListener('click', () => {
        if (!cart.length) {
            alert('Votre panier est vide pour le moment.');
            return;
        }

        const summary = cart
            .map((item) => `${item.quantity} × ${item.name}`)
            .join('\n');
        alert(`Votre panier :\n\n${summary}\n\nLe formulaire de commande sera ajouté ensuite.`);
    });
}

if (accountButton) {
    accountButton.addEventListener('click', () => {
        alert('La connexion à votre compte sera bientôt disponible.');
    });
}

if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.18
    });

    revealItems.forEach((item) => observer.observe(item));
} else {
    revealItems.forEach((item) => item.classList.add('visible'));
}

if (showcase) {
    showcase.addEventListener('pointermove', (event) => {
        const rect = showcase.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        showcase.style.transform = `rotateX(${(50 - y) / 20}deg) rotateY(${(x - 50) / 18}deg)`;
    });

    showcase.addEventListener('pointerleave', () => {
        showcase.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
}

products.forEach((product) => {
    const stock = Number(product.dataset.stock || 0);
    const badge = product.querySelector('.stock-badge');

    if (badge) {
        if (stock > 0) {
            badge.textContent = `${stock} en stock`;
            badge.classList.remove('out-stock');
        } else {
            badge.textContent = 'Rupture de stock';
            badge.classList.add('out-stock');
        }
    }

    const productName = product.querySelector('h4')?.textContent.trim();
    const favoriteButton = product.querySelector('.favorite-button');
    const detailsButton = product.querySelector('.details-button');
    const addCartButton = product.querySelector('.add-cart-button');

    if (favoriteButton && productName) {
        const isFavorite = favorites.includes(productName);
        favoriteButton.classList.toggle('is-favorite', isFavorite);
        favoriteButton.textContent = isFavorite ? '♥' : '♡';
        favoriteButton.setAttribute('aria-pressed', String(isFavorite));

        favoriteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const favoriteIndex = favorites.indexOf(productName);
            if (favoriteIndex >= 0) {
                favorites.splice(favoriteIndex, 1);
            } else {
                favorites.push(productName);
            }
            const nowFavorite = favorites.includes(productName);
            favoriteButton.classList.toggle('is-favorite', nowFavorite);
            favoriteButton.textContent = nowFavorite ? '♥' : '♡';
            favoriteButton.setAttribute('aria-pressed', String(nowFavorite));
            saveStoreState();
        });
    }

    detailsButton?.addEventListener('click', () => showProductDetails(product));
    addCartButton?.addEventListener('click', () => addToCart(product));

    product.addEventListener('pointermove', (event) => {
        const rect = product.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        product.style.transform = `perspective(1000px) rotateX(${(50 - y) / 22}deg) rotateY(${(x - 50) / 22}deg) translateY(-6px)`;
    });

    product.addEventListener('pointerleave', () => {
        product.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
});

modalClose?.addEventListener('click', closeProductDetails);
productModal?.addEventListener('click', (event) => {
    if (event.target === productModal) {
        closeProductDetails();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeProductDetails();
    }
});
