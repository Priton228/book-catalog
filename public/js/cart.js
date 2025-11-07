// Корзина покупок - ГЛОБАЛЬНЫЕ ФУНКЦИИ
window.cart = JSON.parse(localStorage.getItem('cart')) || [];

console.log('🛒 Cart.js loaded');

// Инициализация корзины при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Initializing cart...');
    initializeCartEventListeners();
    updateCartIcon();
});

// Инициализация обработчиков событий для корзины
function initializeCartEventListeners() {
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', window.checkout);
        console.log('✅ Checkout button listener added');
    }
}

// ГЛОБАЛЬНАЯ функция добавления в корзину
window.addToCart = function(bookId, bookTitle, bookPrice, bookAuthor) {
    console.log('➕ Adding to cart:', { bookId, bookTitle, bookPrice, bookAuthor });
    
    if (!window.isAuthenticated()) {
        window.showMessage('Для добавления в корзину необходимо войти в систему', 'warning');
        window.showLogin();
        return;
    }

    const existingItem = window.cart.find(item => item.bookId == bookId);
    
    if (existingItem) {
        existingItem.quantity += 1;
        console.log('📦 Increased quantity for:', bookTitle);
    } else {
        window.cart.push({
            bookId: bookId,
            title: bookTitle,
            author: bookAuthor,
            price: bookPrice,
            quantity: 1
        });
        console.log('🆕 Added new item to cart:', bookTitle);
    }
    
    window.updateCart();
    window.showMessage(`"${bookTitle}" добавлена в корзину`, 'success');
};

// ГЛОБАЛЬНАЯ функция обновления корзины
window.updateCart = function() {
    localStorage.setItem('cart', JSON.stringify(window.cart));
    window.updateCartIcon();
    window.updateCartDisplay();
    console.log('🔄 Cart updated. Items:', window.cart.length);
};

// Обновление иконки корзины
window.updateCartIcon = function() {
    const cartCount = document.getElementById('cart-count');
    const totalItems = window.cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'inline' : 'none';
        console.log('📊 Cart count updated:', totalItems);
    }
};

// Обновление отображения корзины в модальном окне
window.updateCartDisplay = function() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    if (!cartItems) {
        console.log('❌ Cart items element not found');
        return;
    }
    
    if (window.cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Корзина пуста</p>';
        if (cartTotal) cartTotal.textContent = '0 ₽';
        console.log('🛒 Cart is empty');
    } else {
        cartItems.innerHTML = window.cart.map(item => `
            <div class="cart-item" data-cart-item-id="${item.bookId}">
                <div class="cart-item-info">
                    <div class="cart-item-title">${window.escapeHtml(item.title)}</div>
                    <div class="cart-item-author">${window.escapeHtml(item.author)}</div>
                    <div class="cart-item-price">${item.price} ₽ × ${item.quantity}</div>
                </div>
                <div class="cart-item-total">${(item.price * item.quantity).toFixed(2)} ₽</div>
                <div class="cart-item-actions">
                    <button class="btn btn-outline cart-decrease-btn" data-book-id="${item.bookId}">-</button>
                    <span>${item.quantity}</span>
                    <button class="btn btn-outline cart-increase-btn" data-book-id="${item.bookId}">+</button>
                    <button class="btn btn-danger cart-remove-btn" data-book-id="${item.bookId}">×</button>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики для кнопок в корзине
        addCartItemListeners();
        
        const total = window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        if (cartTotal) cartTotal.textContent = total.toFixed(2) + ' ₽';
        console.log('💰 Cart total:', total);
    }
};

// Добавление обработчиков для кнопок в корзине
function addCartItemListeners() {
    // Кнопки уменьшения количества
    document.querySelectorAll('.cart-decrease-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const bookId = this.getAttribute('data-book-id');
            window.updateCartItem(bookId, -1);
        });
    });
    
    // Кнопки увеличения количества
    document.querySelectorAll('.cart-increase-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const bookId = this.getAttribute('data-book-id');
            window.updateCartItem(bookId, 1);
        });
    });
    
    // Кнопки удаления
    document.querySelectorAll('.cart-remove-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const bookId = this.getAttribute('data-book-id');
            window.removeFromCart(bookId);
        });
    });
}

// ГЛОБАЛЬНАЯ функция обновления количества
window.updateCartItem = function(bookId, change) {
    console.log('🔄 Updating cart item:', bookId, change);
    
    const item = window.cart.find(item => item.bookId == bookId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            window.removeFromCart(bookId);
        } else {
            window.updateCart();
        }
    }
};

// ГЛОБАЛЬНАЯ функция удаления из корзины
window.removeFromCart = function(bookId) {
    console.log('🗑️ Removing from cart:', bookId);
    
    window.cart = window.cart.filter(item => item.bookId != bookId);
    window.updateCart();
    window.showMessage('Товар удален из корзины', 'info');
};

// ГЛОБАЛЬНАЯ функция оформления заказа
window.checkout = function() {
    console.log('💳 Starting checkout...');
    
    if (window.cart.length === 0) {
        window.showMessage('Корзина пуста', 'warning');
        return;
    }
    
    // Переходим на страницу оформления заказа
    window.location.href = '/checkout.html';
};

// ГЛОБАЛЬНАЯ функция проверки авторизации
window.isAuthenticated = function() {
    const isAuth = localStorage.getItem('authToken') !== null;
    console.log('🔐 Authentication check:', isAuth);
    return isAuth;
};
