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
    document.getElementById('logout-btn')?.addEventListener('click', showLogoutConfirm);
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
        if (userName) {
            let displayName = '';
            if (currentUser.full_name && typeof currentUser.full_name === 'string') {
                const parts = currentUser.full_name.trim().split(/\s+/).filter(Boolean);
                if (parts.length >= 2) {
                    displayName = parts[1]; // имя во втором слове (Фамилия Имя ...)
                } else if (parts.length === 1) {
                    displayName = parts[0];
                }
            }
            if (!displayName && currentUser.email && typeof currentUser.email === 'string') {
                displayName = currentUser.email.split('@')[0];
            }
            if (!displayName) {
                displayName = 'Пользователь';
            }
            userName.textContent = displayName;
        }
        
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
    window.location.href = '/';
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
// Модальное подтверждение выхода (легкое всплывающее окно в правом верхнем углу)
function showLogoutConfirm(event) {
    event?.preventDefault();
    // Если уже показано — не создаем повторно
    if (document.getElementById('logout-confirm')) return;

    const wrap = document.createElement('div');
    wrap.id = 'logout-confirm';
    wrap.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff;
        border: 1px solid #d0d7de;
        box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        border-radius: 6px;
        padding: 12px 14px;
        z-index: 10001;
        max-width: 300px;
        font-family: Arial, sans-serif;
    `;

    const title = document.createElement('div');
    title.textContent = 'Выйти из аккаунта?';
    title.style.cssText = 'font-weight: 600; margin-bottom: 8px;';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex; gap:8px; justify-content:flex-end;';

    const yesBtn = document.createElement('button');
    yesBtn.textContent = 'Да';
    yesBtn.style.cssText = 'background:#e74c3c;color:#fff;border:none;border-radius:4px;padding:6px 10px;cursor:pointer;';
    yesBtn.addEventListener('click', () => { wrap.remove(); logout(); });

    const noBtn = document.createElement('button');
    noBtn.textContent = 'Нет';
    noBtn.style.cssText = 'background:#95a5a6;color:#fff;border:none;border-radius:4px;padding:6px 10px;cursor:pointer;';
    noBtn.addEventListener('click', () => wrap.remove());

    actions.appendChild(yesBtn);
    actions.appendChild(noBtn);
    wrap.appendChild(title);
    wrap.appendChild(actions);
    document.body.appendChild(wrap);
}
