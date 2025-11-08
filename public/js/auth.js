// Токен аутентификации
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    updateAuthUI();
});

// Инициализация обработчиков событий
function initializeEventListeners() {
    // Кнопки авторизации
    document.getElementById('login-btn')?.addEventListener('click', showLogin);
    document.getElementById('register-btn')?.addEventListener('click', showRegister);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('cart-btn')?.addEventListener('click', showCart);
    
    // Закрытие модальных окон
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModals);
    });
    
    // Формы
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    
    // Закрытие по клику вне модального окна
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

// Обновление интерфейса в зависимости от авторизации
function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    const adminBtn = document.getElementById('admin-btn');

    if (authToken && currentUser) {
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (userName) userName.textContent = currentUser.full_name || currentUser.email;
        
        // Показать кнопку админа только для администраторов
        if (adminBtn) {
            adminBtn.style.display = currentUser.role === 'admin' ? 'inline-block' : 'none';
            adminBtn.onclick = () => window.location.href = '/admin.html';
        }
        
        if (typeof updateCartIcon === 'function') {
            updateCartIcon();
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}

// Показать модальное окно входа
function showLogin() {
    console.log('showLogin called');
    document.getElementById('login-modal').style.display = 'block';
}

// Показать модальное окно регистрации
function showRegister() {
    console.log('showRegister called');
    document.getElementById('register-modal').style.display = 'block';
}

// Показать корзину
function showCart() {
    console.log('showCart called');
    if (!authToken) {
        showMessage('Для просмотра корзины необходимо войти в систему', 'warning');
        showLogin();
        return;
    }
    document.getElementById('cart-modal').style.display = 'block';
    updateCartDisplay();
}

// Закрыть все модальные окна
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Обработка формы входа
async function handleLogin(e) {
    e.preventDefault();
    console.log('handleLogin called');
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            closeModals();
            updateAuthUI();
            showMessage('Успешный вход!', 'success');
            
            // Очищаем форму
            document.getElementById('login-form').reset();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Ошибка соединения', 'error');
    }
}

// Обработка формы регистрации
async function handleRegister(e) {
    e.preventDefault();
    console.log('handleRegister called');
    
    const full_name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ full_name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Регистрация успешна! Теперь войдите в систему.', 'success');
            closeModals();
            showLogin();
            
            // Очищаем форму
            document.getElementById('register-form').reset();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showMessage('Ошибка соединения', 'error');
    }
}

// Выход из системы
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('cart');
    updateAuthUI();
    showMessage('Вы вышли из системы', 'info');
}

// Показать сообщение
function showMessage(message, type = 'info') {
    // Создаем элемент сообщения
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.className = 'message';
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 4px;
        color: white;
        z-index: 10000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        info: '#3498db',
        warning: '#f39c12'
    };
    
    messageEl.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(messageEl);
    
    // Удаляем сообщение через 5 секунд
    setTimeout(() => {
        messageEl.remove();
    }, 5000);
}

// Получить заголовки с авторизацией
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
}

// Экранирование HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
