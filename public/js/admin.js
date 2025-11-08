// Функция для показа сообщений
function showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('message-container');
    if (!messageContainer) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
    messageEl.textContent = message;
    messageEl.style.cssText = 'margin: 10px 0; padding: 10px; border-radius: 4px;';
    
    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

// Проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel loaded, checking authorization...');
    
    // Проверяем токен
    const token = localStorage.getItem('authToken');
    if (!token) {
        showMessage('Необходима авторизация для доступа к админ панели', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        return;
    }
    
    // Загружаем начальные данные
    loadDashboard();
});

// Функция для показа нужной секции
function showSection(sectionId) {
    // Скрываем все секции
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Удаляем активный класс у всех кнопок навигации
    document.querySelectorAll('.admin-nav button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем выбранную секцию
    const section = document.getElementById(sectionId + '-section');
    if (section) {
        section.classList.remove('hidden');
        
        // Добавляем активный класс кнопке навигации
        const navBtn = document.getElementById('nav-' + sectionId);
        if (navBtn) {
            navBtn.classList.add('active');
        }
        
        // Загружаем данные для выбранной секции
        switch(sectionId) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'users':
                loadUsers();
                break;
            case 'books':
                loadBooks();
                break;
            case 'orders':
                loadOrders();
                break;
            case 'authors':
                loadAuthors();
                break;
            case 'genres':
                loadGenres();
                break;
        }
    }
}

// Локализованные статусы заказов
const STATUS_LABELS = {
    pending: 'Ожидает',
    confirmed: 'Подтвержден',
    shipped: 'Отгружен',
    delivered: 'Доставлен',
    cancelled: 'Отменен'
};

// Функция для загрузки статистики
async function loadDashboard() {
    try {
        const token = localStorage.getItem('authToken');
        
        // Загружаем данные для статистики
        const [usersResponse, booksResponse, ordersResponse] = await Promise.all([
            fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/admin/books', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/admin/orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        let totalUsers = 0, totalBooks = 0, totalOrders = 0;
        
        if (usersResponse.ok) {
            const users = await usersResponse.json();
            totalUsers = users.length;
        }
        
        if (booksResponse.ok) {
            const books = await booksResponse.json();
            totalBooks = books.length;
        }
        
        if (ordersResponse.ok) {
            const orders = await ordersResponse.json();
            totalOrders = orders.length;
        }
        
        const statsContainer = document.getElementById('stats-container');
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-number" id="totalUsers">${totalUsers}</div>
                <div class="stat-label">Всего пользователей</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="totalBooks">${totalBooks}</div>
                <div class="stat-label">Всего книг</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="totalOrders">${totalOrders}</div>
                <div class="stat-label">Всего заказов</div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('stats-container').innerHTML = '<div class="error">Ошибка загрузки статистики</div>';
    }
}

// Функция для загрузки пользователей
async function loadUsers() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const users = await response.json();
            displayUsers(users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Функция для отображения пользователей
function displayUsers(users) {
    const container = document.getElementById('users-table-container');
    
    if (users.length === 0) {
        container.innerHTML = '<p>Нет пользователей</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Имя</th>
                    <th>Роль</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody id="usersList">
            </tbody>
        </table>
    `;
    
    const usersList = document.getElementById('usersList');
    users.forEach(user => {
        const userRow = document.createElement('tr');
        userRow.innerHTML = `
            <td>${user.id}</td>
            <td>${user.email}</td>
            <td>${user.full_name || ''}</td>
            <td>${user.role}</td>
            <td class="admin-actions">
                <button onclick="editUser(${user.id})" class="btn-small btn-edit">Редактировать</button>
                <button onclick="deleteUser(${user.id})" class="btn-small btn-delete">Удалить</button>
            </td>
        `;
        usersList.appendChild(userRow);
    });
}

// Функция для показа формы создания пользователя
function showCreateUserForm() {
    document.getElementById('create-user-form').style.display = 'block';
}

// Функция для скрытия формы создания пользователя
function hideCreateUserForm() {
    document.getElementById('create-user-form').style.display = 'none';
    // Очищаем поля формы
    document.getElementById('new-user-email').value = '';
    document.getElementById('new-user-name').value = '';
    document.getElementById('new-user-password').value = '';
    document.getElementById('new-user-role').value = 'customer';
}

// Функция для создания пользователя
async function createUser() {
    const userData = {
        email: document.getElementById('new-user-email').value,
        password: document.getElementById('new-user-password').value,
        full_name: document.getElementById('new-user-name').value,
        role: document.getElementById('new-user-role').value
    };
    
    if (!userData.email || !userData.password || !userData.full_name) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            hideCreateUserForm();
            loadUsers();
            showMessage('Пользователь успешно создан', 'success');
        } else {
            const error = await response.json();
            showMessage('Ошибка при создании пользователя: ' + (error.error || error.message || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showMessage('Ошибка при создании пользователя', 'error');
    }
}

// Функция для удаления пользователя
async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            loadUsers();
        } else {
            alert('Ошибка при удалении пользователя');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
    }
}

// Функция для редактирования пользователя
async function editUser(userId) {
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/users/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const form = document.getElementById('edit-user-form');
        form.style.display = 'block';
        if (resp.ok) {
            const user = await resp.json();
            form.dataset.userId = user.id;
            document.getElementById('edit-user-email').value = user.email || '';
            document.getElementById('edit-user-name').value = user.full_name || '';
            document.getElementById('edit-user-role').value = user.role || 'customer';
        } else {
            form.dataset.userId = userId;
            showMessage('Не удалось загрузить пользователя, отредактируйте поля вручную', 'warning');
        }
    } catch (e) {
        console.error('editUser error:', e);
        const form = document.getElementById('edit-user-form');
        if (form) {
            form.style.display = 'block';
            form.dataset.userId = userId;
        }
        showMessage('Ошибка открытия формы редактирования, попробуйте вручную', 'error');
    }
}

function hideEditUserForm() {
    const form = document.getElementById('edit-user-form');
    form.style.display = 'none';
    form.dataset.userId = '';
    document.getElementById('edit-user-email').value = '';
    document.getElementById('edit-user-name').value = '';
    document.getElementById('edit-user-role').value = 'customer';
}

async function submitEditUser() {
    const form = document.getElementById('edit-user-form');
    const userId = form.dataset.userId;
    const payload = {
        email: document.getElementById('edit-user-email').value,
        full_name: document.getElementById('edit-user-name').value,
        role: document.getElementById('edit-user-role').value
    };
    if (!payload.email || !payload.full_name) {
        showMessage('Заполните email и имя', 'error');
        return;
    }
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if (resp.ok) {
            showMessage('Пользователь обновлен', 'success');
            hideEditUserForm();
            loadUsers();
        } else {
            const err = await resp.json();
            showMessage('Ошибка обновления пользователя: ' + (err.error || err.message || 'Неизвестная ошибка'), 'error');
        }
    } catch (e) {
        console.error('submitEditUser error:', e);
        showMessage('Ошибка обновления пользователя', 'error');
    }
}

// Функция для загрузки книг
async function loadBooks() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/books', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const books = await response.json();
            displayBooks(books);
        }
    } catch (error) {
        console.error('Error loading books:', error);
    }
}

// Функция для отображения книг
function displayBooks(books) {
    const container = document.getElementById('books-table-container');
    
    if (books.length === 0) {
        container.innerHTML = '<p>Нет книг</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Обложка</th>
                    <th>Название</th>
                    <th>Автор</th>
                    <th>Жанр</th>
                    <th>Год</th>
                    <th>Цена</th>
                    <th>Описание</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody id="booksList">
            </tbody>
        </table>
    `;
    
    const booksList = document.getElementById('booksList');
    books.forEach(book => {
        const bookRow = document.createElement('tr');
        const safeTitle = (book.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeAuthor = (book.author_name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeGenre = (book.genre_name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const shortDesc = book.description ? (book.description.length > 120 ? book.description.substring(0, 120) + '...' : book.description) : '';
        const safeShortDesc = shortDesc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeFullDesc = (book.description || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const defaultCover = 'https://i.pinimg.com/474x/e2/93/05/e29305e0ee7c3d1ef31ce6f234e194f8.jpg';
        const coverSrc = book.cover_image ? book.cover_image : defaultCover;
        const coverCell = `<img src="${coverSrc}" alt="Обложка" class="book-cover" onerror="this.onerror=null;this.src='${defaultCover}';"/>`;
        bookRow.innerHTML = `
            <td>${book.id}</td>
            <td>${coverCell}</td>
            <td>${safeTitle}</td>
            <td>${safeAuthor}</td>
            <td>${safeGenre}</td>
            <td>${book.publication_year || ''}</td>
            <td>${book.price} руб.</td>
            <td>
                ${book.description ? `
                    <div class="desc-wrap">
                        <span class="desc-short">${safeShortDesc}</span>
                        <span class="desc-full" style="display:none;">${safeFullDesc}</span>
                        <button class="btn-small btn-toggle-desc" data-book-id="${book.id}">Показать полностью</button>
                    </div>
                ` : ''}
            </td>
            <td class="admin-actions">
                <button onclick="editBook(${book.id})" class="btn-small btn-edit">Редактировать</button>
                <button onclick="deleteBook(${book.id})" class="btn-small btn-delete">Удалить</button>
            </td>
        `;
        booksList.appendChild(bookRow);
    });

    // Обработчики для раскрытия описания
    booksList.querySelectorAll('.btn-toggle-desc').forEach(btn => {
        btn.addEventListener('click', function() {
            const wrap = this.closest('.desc-wrap');
            if (!wrap) return;
            const shortEl = wrap.querySelector('.desc-short');
            const fullEl = wrap.querySelector('.desc-full');
            const isHidden = fullEl.style.display === 'none';
            fullEl.style.display = isHidden ? 'inline' : 'none';
            shortEl.style.display = isHidden ? 'none' : 'inline';
            this.textContent = isHidden ? 'Свернуть' : 'Показать полностью';
        });
    });
}

// Функции для формы создания книги
function showCreateBookForm() {
    populateAuthorGenreSelects().then(() => {
        document.getElementById('create-book-form').style.display = 'block';
    }).catch(() => {
        document.getElementById('create-book-form').style.display = 'block';
        showMessage('Не удалось загрузить списки авторов/жанров. Попробуйте позже.', 'warning');
    });
}

function hideCreateBookForm() {
    document.getElementById('create-book-form').style.display = 'none';
    // очистка полей
    const fields = [
        'new-book-title','new-book-author-id','new-book-genre-id','new-book-isbn','new-book-publisher',
        'new-book-year','new-book-price','new-book-stock','new-book-description','new-book-cover'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

async function createBook() {
    const bookData = {
        title: document.getElementById('new-book-title').value,
        author_id: parseInt(document.getElementById('new-book-author-id').value, 10),
        genre_id: parseInt(document.getElementById('new-book-genre-id').value, 10),
        isbn: document.getElementById('new-book-isbn').value,
        publisher: document.getElementById('new-book-publisher').value,
        publication_year: parseInt(document.getElementById('new-book-year').value, 10),
        price: parseFloat(document.getElementById('new-book-price').value),
        stock_quantity: parseInt(document.getElementById('new-book-stock').value, 10),
        description: document.getElementById('new-book-description').value,
        cover_image: document.getElementById('new-book-cover').value
    };

    if (!bookData.title || !bookData.author_id || !bookData.genre_id || isNaN(bookData.price) || isNaN(bookData.stock_quantity)) {
        showMessage('Заполните обязательные поля: название, автор, жанр, цена, количество', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/books', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bookData)
        });

        if (response.ok) {
            hideCreateBookForm();
            loadBooks();
            showMessage('Книга успешно создана', 'success');
        } else {
            const error = await response.json();
            showMessage('Ошибка при создании книги: ' + (error.error || error.message || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('Error creating book:', error);
        showMessage('Ошибка при создании книги', 'error');
    }
}

// Функция для редактирования книги
async function editBook(bookId) {
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/books/${bookId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const form = document.getElementById('edit-book-form');
        await populateAuthorGenreSelects();
        form.style.display = 'block';
        if (resp.ok) {
            const book = await resp.json();
            form.dataset.bookId = book.id;
            document.getElementById('edit-book-title').value = book.title || '';
            document.getElementById('edit-book-author-id').value = book.author_id || '';
            document.getElementById('edit-book-genre-id').value = book.genre_id || '';
            document.getElementById('edit-book-isbn').value = book.isbn || '';
            document.getElementById('edit-book-publisher').value = book.publisher || '';
            document.getElementById('edit-book-year').value = book.publication_year || '';
            document.getElementById('edit-book-price').value = book.price || '';
            document.getElementById('edit-book-stock').value = book.stock_quantity || '';
            document.getElementById('edit-book-description').value = book.description || '';
            document.getElementById('edit-book-cover').value = book.cover_image || '';
        } else {
            form.dataset.bookId = bookId;
            showMessage('Не удалось загрузить книгу, отредактируйте поля вручную', 'warning');
        }
    } catch (e) {
        console.error('editBook error:', e);
        const form = document.getElementById('edit-book-form');
        if (form) {
            form.style.display = 'block';
            form.dataset.bookId = bookId;
        }
        showMessage('Ошибка открытия формы редактирования книги, попробуйте вручную', 'error');
    }
}

function hideEditBookForm() {
    const form = document.getElementById('edit-book-form');
    form.style.display = 'none';
    form.dataset.bookId = '';
    ['title','author-id','genre-id','isbn','publisher','year','price','stock','description','cover']
        .forEach(suffix => {
            const el = document.getElementById('edit-book-' + suffix);
            if (el) el.value = '';
        });
}

async function submitEditBook() {
    const form = document.getElementById('edit-book-form');
    const bookId = form.dataset.bookId;
    const payload = {
        title: document.getElementById('edit-book-title').value,
        author_id: parseInt(document.getElementById('edit-book-author-id').value, 10),
        genre_id: parseInt(document.getElementById('edit-book-genre-id').value, 10),
        isbn: document.getElementById('edit-book-isbn').value,
        publisher: document.getElementById('edit-book-publisher').value,
        publication_year: parseInt(document.getElementById('edit-book-year').value, 10),
        price: parseFloat(document.getElementById('edit-book-price').value),
        stock_quantity: parseInt(document.getElementById('edit-book-stock').value, 10),
        description: document.getElementById('edit-book-description').value,
        cover_image: document.getElementById('edit-book-cover').value
    };
    if (!payload.title || !payload.author_id || !payload.genre_id || isNaN(payload.price) || isNaN(payload.stock_quantity)) {
        showMessage('Заполните обязательные поля: название, автор, жанр, цена, количество', 'error');
        return;
    }
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/books/${bookId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if (resp.ok) {
            showMessage('Книга обновлена', 'success');
            hideEditBookForm();
            loadBooks();
        } else {
            const err = await resp.json();
            showMessage('Ошибка обновления книги: ' + (err.error || err.message || 'Неизвестная ошибка'), 'error');
        }
    } catch (e) {
        console.error('submitEditBook error:', e);
        showMessage('Ошибка обновления книги', 'error');
    }
}

// Функция для удаления книги
async function deleteBook(bookId) {
    if (!confirm('Вы уверены, что хотите удалить эту книгу?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/admin/books/${bookId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            loadBooks();
        } else {
            alert('Ошибка при удалении книги');
        }
    } catch (error) {
        console.error('Error deleting book:', error);
    }
}

// Функция для загрузки заказов
async function loadOrders() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/orders', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const orders = await response.json();
            displayOrders(orders);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Функция для отображения заказов
function displayOrders(orders) {
    const container = document.getElementById('orders-table-container');
    
    if (orders.length === 0) {
        container.innerHTML = '<p>Нет заказов</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Пользователь</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                    <th>Дата</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody id="ordersList">
            </tbody>
        </table>
    `;
    
    const ordersList = document.getElementById('ordersList');
    orders.forEach(order => {
        const orderRow = document.createElement('tr');
        orderRow.innerHTML = `
            <td>${order.id}</td>
            <td>${order.user_email || order.user_id}</td>
            <td>${order.total_amount} руб.</td>
            <td>${STATUS_LABELS[order.status] || order.status}</td>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
            <td class="admin-actions">
                <button onclick="viewOrder(${order.id})" class="btn-small" style="background: #3498db; color: white;">Просмотр</button>
                <button onclick="updateOrderStatus(${order.id})" class="btn-small" style="background: #f39c12; color: white;">Изменить статус</button>
            </td>
        `;
        ordersList.appendChild(orderRow);
    });
}

// Авторы
async function loadAuthors() {
    try {
        const response = await fetch('/api/authors');
        if (response.ok) {
            const authors = await response.json();
            displayAuthors(authors);
            // также обновим выпадающие списки для книг, если они существуют
            updateAuthorSelects(authors);
        } else {
            showMessage('Ошибка загрузки авторов', 'error');
        }
    } catch (e) {
        console.error('Error loading authors:', e);
        showMessage('Ошибка загрузки авторов', 'error');
    }
}

function displayAuthors(authors) {
    const container = document.getElementById('authors-table-container');
    if (!container) return;
    if (!authors || authors.length === 0) {
        container.innerHTML = '<p>Нет авторов</p>';
        return;
    }
    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Имя</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody id="authorsList"></tbody>
        </table>
    `;
    const list = document.getElementById('authorsList');
    authors.forEach(a => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${a.id}</td>
            <td>${a.name || a.full_name || ''}</td>
            <td>
                <button class="btn-small" onclick="editAuthor(${a.id})">✏️ Редактировать</button>
                <button class="btn-small" style="background:#e74c3c;color:white" onclick="deleteAuthor(${a.id})">🗑️ Удалить</button>
            </td>
        `;
        list.appendChild(row);
    });
}

// Жанры
async function loadGenres() {
    try {
        const response = await fetch('/api/genres');
        if (response.ok) {
            const genres = await response.json();
            displayGenres(genres);
            // также обновим выпадающие списки для книг, если они существуют
            updateGenreSelects(genres);
        } else {
            showMessage('Ошибка загрузки жанров', 'error');
        }
    } catch (e) {
        console.error('Error loading genres:', e);
        showMessage('Ошибка загрузки жанров', 'error');
    }
}

function displayGenres(genres) {
    const container = document.getElementById('genres-table-container');
    if (!container) return;
    if (!genres || genres.length === 0) {
        container.innerHTML = '<p>Нет жанров</p>';
        return;
    }
    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Жанр</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody id="genresList"></tbody>
        </table>
    `;
    const list = document.getElementById('genresList');
    genres.forEach(g => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${g.id}</td>
            <td>${g.name || ''}</td>
            <td>
                <button class="btn-small" onclick="editGenre(${g.id})">✏️ Редактировать</button>
                <button class="btn-small" style="background:#e74c3c;color:white" onclick="deleteGenre(${g.id})">🗑️ Удалить</button>
            </td>
        `;
        list.appendChild(row);
    });
}

// --- CRUD для авторов ---
function showCreateAuthorForm() {
    const form = document.getElementById('create-author-form');
    if (form) form.style.display = 'block';
}

function hideCreateAuthorForm() {
    const form = document.getElementById('create-author-form');
    if (form) form.style.display = 'none';
    const nameEl = document.getElementById('create-author-name');
    const bioEl = document.getElementById('create-author-biography');
    if (nameEl) nameEl.value = '';
    if (bioEl) bioEl.value = '';
}

async function createAuthor() {
    const name = document.getElementById('create-author-name').value.trim();
    const biography = document.getElementById('create-author-biography').value.trim();
    if (!name) {
        showMessage('Имя автора обязательно', 'error');
        return;
    }
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch('/api/admin/authors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, biography })
        });
        if (resp.ok) {
            showMessage('Автор создан', 'success');
            hideCreateAuthorForm();
            loadAuthors();
            // обновим выпадающие списки в книгах
            await populateAuthorGenreSelects();
        } else {
            const err = await resp.json().catch(() => ({}));
            showMessage(err.error || 'Ошибка создания автора', 'error');
        }
    } catch (e) {
        console.error('createAuthor error:', e);
        showMessage('Ошибка создания автора', 'error');
    }
}

async function editAuthor(authorId) {
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/authors/${authorId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const form = document.getElementById('edit-author-form');
        form.style.display = 'block';
        if (resp.ok) {
            const author = await resp.json();
            form.dataset.authorId = author.id;
            document.getElementById('edit-author-name').value = author.name || '';
            document.getElementById('edit-author-biography').value = author.biography || '';
        } else {
            form.dataset.authorId = authorId;
            showMessage('Не удалось загрузить автора, отредактируйте поля вручную', 'warning');
        }
    } catch (e) {
        console.error('editAuthor error:', e);
        const form = document.getElementById('edit-author-form');
        if (form) {
            form.style.display = 'block';
            form.dataset.authorId = authorId;
        }
        showMessage('Ошибка открытия формы редактирования автора', 'error');
    }
}

function hideEditAuthorForm() {
    const form = document.getElementById('edit-author-form');
    if (!form) return;
    form.style.display = 'none';
    form.dataset.authorId = '';
    const nameEl = document.getElementById('edit-author-name');
    const bioEl = document.getElementById('edit-author-biography');
    if (nameEl) nameEl.value = '';
    if (bioEl) bioEl.value = '';
}

async function submitEditAuthor() {
    const form = document.getElementById('edit-author-form');
    const authorId = form.dataset.authorId;
    const name = document.getElementById('edit-author-name').value.trim();
    const biography = document.getElementById('edit-author-biography').value.trim();
    if (!name) {
        showMessage('Имя автора обязательно', 'error');
        return;
    }
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/authors/${authorId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, biography })
        });
        if (resp.ok) {
            showMessage('Автор обновлен', 'success');
            hideEditAuthorForm();
            loadAuthors();
            await populateAuthorGenreSelects();
        } else {
            const err = await resp.json().catch(() => ({}));
            showMessage(err.error || 'Ошибка обновления автора', 'error');
        }
    } catch (e) {
        console.error('submitEditAuthor error:', e);
        showMessage('Ошибка обновления автора', 'error');
    }
}

async function deleteAuthor(authorId) {
    if (!confirm('Удалить автора? Это может повлиять на книги.')) return;
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/authors/${authorId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (resp.ok) {
            showMessage('Автор удален', 'success');
            loadAuthors();
            await populateAuthorGenreSelects();
        } else {
            const err = await resp.json().catch(() => ({}));
            showMessage(err.error || 'Ошибка удаления автора', 'error');
        }
    } catch (e) {
        console.error('deleteAuthor error:', e);
        showMessage('Ошибка удаления автора', 'error');
    }
}

// --- CRUD для жанров ---
function showCreateGenreForm() {
    const form = document.getElementById('create-genre-form');
    if (form) form.style.display = 'block';
}

function hideCreateGenreForm() {
    const form = document.getElementById('create-genre-form');
    if (form) form.style.display = 'none';
    const nameEl = document.getElementById('create-genre-name');
    const descEl = document.getElementById('create-genre-description');
    if (nameEl) nameEl.value = '';
    if (descEl) descEl.value = '';
}

async function createGenre() {
    const name = document.getElementById('create-genre-name').value.trim();
    const description = document.getElementById('create-genre-description').value.trim();
    if (!name) {
        showMessage('Название жанра обязательно', 'error');
        return;
    }
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch('/api/admin/genres', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, description })
        });
        if (resp.ok) {
            showMessage('Жанр создан', 'success');
            hideCreateGenreForm();
            loadGenres();
            await populateAuthorGenreSelects();
        } else {
            const err = await resp.json().catch(() => ({}));
            showMessage(err.error || 'Ошибка создания жанра', 'error');
        }
    } catch (e) {
        console.error('createGenre error:', e);
        showMessage('Ошибка создания жанра', 'error');
    }
}

async function editGenre(genreId) {
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/genres/${genreId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const form = document.getElementById('edit-genre-form');
        form.style.display = 'block';
        if (resp.ok) {
            const genre = await resp.json();
            form.dataset.genreId = genre.id;
            document.getElementById('edit-genre-name').value = genre.name || '';
            document.getElementById('edit-genre-description').value = genre.description || '';
        } else {
            form.dataset.genreId = genreId;
            showMessage('Не удалось загрузить жанр, отредактируйте поля вручную', 'warning');
        }
    } catch (e) {
        console.error('editGenre error:', e);
        const form = document.getElementById('edit-genre-form');
        if (form) {
            form.style.display = 'block';
            form.dataset.genreId = genreId;
        }
        showMessage('Ошибка открытия формы редактирования жанра', 'error');
    }
}

function hideEditGenreForm() {
    const form = document.getElementById('edit-genre-form');
    if (!form) return;
    form.style.display = 'none';
    form.dataset.genreId = '';
    const nameEl = document.getElementById('edit-genre-name');
    const descEl = document.getElementById('edit-genre-description');
    if (nameEl) nameEl.value = '';
    if (descEl) descEl.value = '';
}

async function submitEditGenre() {
    const form = document.getElementById('edit-genre-form');
    const genreId = form.dataset.genreId;
    const name = document.getElementById('edit-genre-name').value.trim();
    const description = document.getElementById('edit-genre-description').value.trim();
    if (!name) {
        showMessage('Название жанра обязательно', 'error');
        return;
    }
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/genres/${genreId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, description })
        });
        if (resp.ok) {
            showMessage('Жанр обновлен', 'success');
            hideEditGenreForm();
            loadGenres();
            await populateAuthorGenreSelects();
        } else {
            const err = await resp.json().catch(() => ({}));
            showMessage(err.error || 'Ошибка обновления жанра', 'error');
        }
    } catch (e) {
        console.error('submitEditGenre error:', e);
        showMessage('Ошибка обновления жанра', 'error');
    }
}

async function deleteGenre(genreId) {
    if (!confirm('Удалить жанр? Это может повлиять на книги.')) return;
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/genres/${genreId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (resp.ok) {
            showMessage('Жанр удален', 'success');
            loadGenres();
            await populateAuthorGenreSelects();
        } else {
            const err = await resp.json().catch(() => ({}));
            showMessage(err.error || 'Ошибка удаления жанра', 'error');
        }
    } catch (e) {
        console.error('deleteGenre error:', e);
        showMessage('Ошибка удаления жанра', 'error');
    }
}

// --- Вспомогательные функции для выпадающих списков авторов/жанров в форме книг ---
async function populateAuthorGenreSelects() {
    try {
        const [authorsResp, genresResp] = await Promise.all([
            fetch('/api/authors'),
            fetch('/api/genres')
        ]);
        const authors = authorsResp.ok ? await authorsResp.json() : [];
        const genres = genresResp.ok ? await genresResp.json() : [];
        updateAuthorSelects(authors);
        updateGenreSelects(genres);
    } catch (e) {
        console.error('populateAuthorGenreSelects error:', e);
    }
}

function updateAuthorSelects(authors) {
    const createSelect = document.getElementById('new-book-author-id');
    const editSelect = document.getElementById('edit-book-author-id');
    [createSelect, editSelect].forEach(sel => {
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">Выберите автора</option>';
        (authors || []).forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = a.name || a.full_name || '';
            sel.appendChild(opt);
        });
        if (current) sel.value = current;
    });
}

function updateGenreSelects(genres) {
    const createSelect = document.getElementById('new-book-genre-id');
    const editSelect = document.getElementById('edit-book-genre-id');
    [createSelect, editSelect].forEach(sel => {
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">Выберите жанр</option>';
        (genres || []).forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name || '';
            sel.appendChild(opt);
        });
        if (current) sel.value = current;
    });
}

// Функция для просмотра заказа
async function viewOrder(orderId) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/admin/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const error = await response.json();
            showMessage('Ошибка получения заказа: ' + (error.error || error.message || 'Неизвестная ошибка'), 'error');
            return;
        }
        const order = await response.json();
        const detailsContainer = document.getElementById('order-details-container');
        if (detailsContainer) {
            detailsContainer.style.display = 'block';
            const itemsRows = (order.items || []).map(item => `
                <tr>
                    <td>${item.title}</td>
                    <td>${item.author_name || ''}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unit_price}</td>
                    <td>${item.total_price}</td>
                </tr>
            `).join('');
            detailsContainer.innerHTML = `
                <h3>Заказ #${order.id}</h3>
                <p><strong>Покупатель:</strong> ${order.user_email || '—'}</p>
                <p><strong>Статус:</strong> ${STATUS_LABELS[order.status] || order.status}</p>
                <p><strong>Сумма:</strong> ${order.total_amount} руб.</p>
                <div style="overflow:auto">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th>Автор</th>
                                <th>Кол-во</th>
                                <th>Цена</th>
                                <th>Итого</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows || '<tr><td colspan="5">Нет позиций</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div class="form-actions">
                    <button class="btn-small" style="background:#f39c12;color:white" onclick="updateOrderStatus(${order.id})">Изменить статус</button>
                    <button class="btn-small" style="background:#95a5a6;color:white" onclick="(function(){document.getElementById('order-details-container').style.display='none'})()">Закрыть</button>
                </div>
            `;
        } else {
            alert('Заказ #' + order.id + '\nСтатус: ' + order.status + '\nСумма: ' + order.total_amount + ' руб.');
        }
    } catch (error) {
        console.error('Error viewing order:', error);
        showMessage('Ошибка просмотра заказа', 'error');
    }
}

// Функция для обновления статуса заказа — открывает модалку
async function updateOrderStatus(orderId) {
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/orders/${orderId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) {
            const err = await resp.json();
            showMessage('Ошибка загрузки заказа: ' + (err.error || err.message || 'Неизвестная ошибка'), 'error');
            return;
        }
        const order = await resp.json();
        openStatusModal(order);
    } catch (e) {
        console.error('updateOrderStatus error:', e);
        showMessage('Ошибка открытия изменения статуса', 'error');
    }
}

function openStatusModal(order) {
    const modal = document.getElementById('status-modal');
    const select = document.getElementById('status-select');
    const statuses = ['pending','confirmed','shipped','delivered','cancelled'];
    modal.dataset.orderId = order.id;
    select.innerHTML = statuses.map(s => `<option value="${s}" ${s===order.status?'selected':''}>${STATUS_LABELS[s] || s}</option>`).join('');
    modal.style.display = 'flex';
}

function closeStatusModal() {
    const modal = document.getElementById('status-modal');
    modal.style.display = 'none';
    modal.dataset.orderId = '';
}

async function submitOrderStatus() {
    const modal = document.getElementById('status-modal');
    const orderId = modal.dataset.orderId;
    const select = document.getElementById('status-select');
    const newStatus = select.value;
    const validStatuses = ['pending','confirmed','shipped','delivered','cancelled'];
    if (!validStatuses.includes(newStatus)) {
        showMessage('Недопустимый статус', 'error');
        return;
    }
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            showMessage('Статус заказа обновлен', 'success');
            closeStatusModal();
            loadOrders();
        } else {
            const error = await response.json();
            showMessage('Ошибка обновления статуса: ' + (error.error || error.message || 'Неизвестная ошибка'), 'error');
        }
    } catch (e) {
        console.error('submitOrderStatus error:', e);
        showMessage('Ошибка обновления статуса заказа', 'error');
    }
}

// Функция для «Выход» в админке: переход в каталог без разлогина
function logout() {
    window.location.href = '/catalog.html';
}

// Делаем функции глобально доступными
window.showSection = showSection;
window.logout = logout;
window.showCreateUserForm = showCreateUserForm;
window.hideCreateUserForm = hideCreateUserForm;
window.createUser = createUser;
window.deleteUser = deleteUser;
window.editUser = editUser;
window.hideEditUserForm = hideEditUserForm;
window.submitEditUser = submitEditUser;
window.showCreateBookForm = showCreateBookForm;
window.hideCreateBookForm = hideCreateBookForm;
window.createBook = createBook;
window.editBook = editBook;
window.hideEditBookForm = hideEditBookForm;
window.submitEditBook = submitEditBook;
window.deleteBook = deleteBook;
window.viewOrder = viewOrder;
window.updateOrderStatus = updateOrderStatus;
window.submitOrderStatus = submitOrderStatus;
window.openStatusModal = openStatusModal;
window.closeStatusModal = closeStatusModal;
window.loadAuthors = loadAuthors;
window.displayAuthors = displayAuthors;
window.loadGenres = loadGenres;
window.displayGenres = displayGenres;
// экспорт CRUD авторов/жанров
window.showCreateAuthorForm = showCreateAuthorForm;
window.hideCreateAuthorForm = hideCreateAuthorForm;
window.createAuthor = createAuthor;
window.editAuthor = editAuthor;
window.hideEditAuthorForm = hideEditAuthorForm;
window.submitEditAuthor = submitEditAuthor;
window.deleteAuthor = deleteAuthor;
window.showCreateGenreForm = showCreateGenreForm;
window.hideCreateGenreForm = hideCreateGenreForm;
window.createGenre = createGenre;
window.editGenre = editGenre;
window.hideEditGenreForm = hideEditGenreForm;
window.submitEditGenre = submitEditGenre;
window.deleteGenre = deleteGenre;