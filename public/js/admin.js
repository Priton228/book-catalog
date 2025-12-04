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
    
    // Загружаем нужную секцию (восстанавливаем активную вкладку)
    const savedTab = localStorage.getItem('adminActiveTab') || 'dashboard';
    showSection(savedTab);
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
        // Запоминаем активную вкладку
        try { localStorage.setItem('adminActiveTab', sectionId); } catch (e) {}
        
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
            case 'promotions':
                loadPromotions();
                break;
        }
    }
}

// Переместить форму редактирования наверх секции (над таблицей) и прокрутить к ней
function moveFormBeforeTable(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    const section = form.closest('.admin-section');
    if (!section) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }
    const tableContainer = section.querySelector('.table-container, [id$="-table-container"]');
    if (tableContainer) {
        // Поместить форму непосредственно перед контейнером таблицы
        if (form.nextElementSibling !== tableContainer) {
            section.insertBefore(form, tableContainer);
        }
    } else {
        // Если таблица не найдена, разместить форму в начале секции (после заголовка, если он есть)
        const header = section.querySelector('h2');
        if (header && header.nextSibling) {
            section.insertBefore(form, header.nextSibling);
        } else {
            section.insertBefore(form, section.firstElementChild);
        }
    }
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Локализованные статусы заказов (без эмодзи — для чекбоксов, форм и простых меток)
const STATUS_LABELS = {
    pending: 'Ожидает',
    confirmed: 'Подтвержден',
    shipped: 'Отгружен',
    delivered: 'Доставлен',
    cancelled: 'Отменен'
};

// Текст статуса с «картинками/иконками», как на пользовательской странице заказов
function getOrderStatusText(status) {
    const map = {
        pending: '⏳ Ожидает подтверждения',
        confirmed: '✅ Подтвержден',
        shipped: '🚚 Отправлен',
        delivered: '📦 Доставлен',
        cancelled: '❌ Отменен'
    };
    return map[status] || (STATUS_LABELS[status] || status);
}

// --- Сортировка: состояния и хелперы ---
let usersData = [], usersSort = { field: 'id', direction: 'asc' };
let booksData = [], booksSort = { field: 'id', direction: 'asc' };
let ordersData = [], ordersSort = { field: 'id', direction: 'asc' };
let authorsData = [], authorsSort = { field: 'id', direction: 'asc' };
let genresData = [], genresSort = { field: 'id', direction: 'asc' };

// Фильтры для таблиц (многовыбор)
let usersFilters = { roles: new Set() };
let booksFilters = { authors: new Set(), genres: new Set() };
let ordersFilters = { statuses: new Set() };

function getSortableValue(section, item, field) {
    switch (section) {
        case 'users': {
            const map = {
                id: item.id || 0,
                email: item.email || '',
                full_name: item.full_name || '',
                role: item.role || ''
            };
            return map[field];
        }
        case 'books': {
            const map = {
                id: item.id || 0,
                title: item.title || '',
                author_name: item.author_name || '',
                genre_name: item.genre_name || '',
                publication_year: item.publication_year || 0,
                price: item.price || 0
            };
            return map[field];
        }
        case 'orders': {
            const map = {
                id: item.id || 0,
                user: (item.user_email || (item.user_id != null ? String(item.user_id) : '')),
                total_amount: item.total_amount || 0,
                status: item.status || '',
                created_at: item.created_at || ''
            };
            return map[field];
        }
        case 'authors': {
            const map = {
                id: item.id || 0,
                name: item.name || item.full_name || ''
            };
            return map[field];
        }
        case 'genres': {
            const map = {
                id: item.id || 0,
                name: item.name || ''
            };
            return map[field];
        }
        default:
            return '';
    }
}

function sortData(data, section, sort) {
    if (!sort || !sort.field || !sort.direction || sort.direction === 'none') return data.slice();
    const isNumeric = (val) => typeof val === 'number';
    const arr = data.slice();
    arr.sort((a, b) => {
        let av = getSortableValue(section, a, sort.field);
        let bv = getSortableValue(section, b, sort.field);
        // Даты
        if (section === 'orders' && sort.field === 'created_at') {
            av = av ? new Date(av).getTime() : 0;
            bv = bv ? new Date(bv).getTime() : 0;
        }
        let cmp = 0;
        if (isNumeric(av) && isNumeric(bv)) {
            cmp = av - bv;
        } else {
            cmp = String(av).localeCompare(String(bv), 'ru', { sensitivity: 'base' });
        }
        return sort.direction === 'asc' ? cmp : -cmp;
    });
    return arr;
}

// Применение фильтров к данным
function applyFilters(data, section) {
    switch (section) {
        case 'users': {
            const roles = usersFilters.roles;
            if (!roles || roles.size === 0) return data;
            return data.filter(u => roles.has(u.role));
        }
        case 'books': {
            const authors = booksFilters.authors;
            const genres = booksFilters.genres;
            return data.filter(b =>
                (authors.size === 0 || authors.has((b.author_name || ''))) &&
                (genres.size === 0 || genres.has((b.genre_name || '')))
            );
        }
        case 'orders': {
            const statuses = ordersFilters.statuses;
            if (!statuses || statuses.size === 0) return data;
            return data.filter(o => statuses.has(o.status));
        }
        default:
            return data;
    }
}

function attachSortHandlers(container, section) {
    if (!container) return;
    const carets = container.querySelectorAll('.sort-caret');
    carets.forEach(caret => {
        caret.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = caret.nextElementSibling;
            if (!menu) return;
            const isShown = menu.style.display === 'block';
            // Спрятать все меню в контейнере
            container.querySelectorAll('.sort-menu').forEach(m => { m.style.display = 'none'; });
            menu.style.display = isShown ? 'none' : 'block';
        });
        const menu = caret.nextElementSibling;
        if (menu) {
            // Не закрывать меню при кликах внутри него
            menu.addEventListener('click', (evt) => evt.stopPropagation());
            menu.querySelectorAll('button[data-sort]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const clicked = btn.getAttribute('data-sort');
                    const field = clicked === 'none' ? 'id' : caret.getAttribute('data-field');
                    const direction = clicked === 'none' ? 'asc' : clicked;
                    switch (section) {
                        case 'users': usersSort = { field, direction }; break;
                        case 'books': booksSort = { field, direction }; break;
                        case 'orders': ordersSort = { field, direction }; break;
                        case 'authors': authorsSort = { field, direction }; break;
                        case 'genres': genresSort = { field, direction }; break;
                    }
                    // Перерисовать секцию
                    switch (section) {
                        case 'users': displayUsers(usersData); break;
                        case 'books': displayBooks(booksData); break;
                        case 'orders': displayOrders(ordersData); break;
                        case 'authors': displayAuthors(authorsData); break;
                        case 'genres': displayGenres(genresData); break;
                    }
                });
            });

            // Обработчики чекбоксов фильтрации внутри меню
            menu.querySelectorAll('.filter-role').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const val = e.target.value;
                    if (e.target.checked) usersFilters.roles.add(val); else usersFilters.roles.delete(val);
                });
            });
            menu.querySelectorAll('.filter-author').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const val = e.target.value;
                    if (e.target.checked) booksFilters.authors.add(val); else booksFilters.authors.delete(val);
                });
            });
            menu.querySelectorAll('.filter-genre').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const val = e.target.value;
                    if (e.target.checked) booksFilters.genres.add(val); else booksFilters.genres.delete(val);
                });
            });
            menu.querySelectorAll('.filter-status').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const val = e.target.value;
                    if (e.target.checked) ordersFilters.statuses.add(val); else ordersFilters.statuses.delete(val);
                });
            });

            // Кнопка «Применить» внутри меню
            const applyBtn = menu.querySelector('.filter-apply');
            if (applyBtn) {
                applyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    switch (section) {
                        case 'users': displayUsers(usersData); break;
                        case 'books': displayBooks(booksData); break;
                        case 'orders': displayOrders(ordersData); break;
                    }
                    // Закрыть меню после применения
                    menu.style.display = 'none';
                });
            }

            // Поиск внутри меню по чекбоксам
            const searchInput = menu.querySelector('.filter-search-input');
            if (searchInput) {
                const filterItems = Array.from(menu.querySelectorAll('.filter-item'));
                const applySearch = () => {
                    const q = searchInput.value.trim().toLowerCase();
                    filterItems.forEach(label => {
                        const text = (label.textContent || '').trim().toLowerCase();
                        label.style.display = q === '' || text.includes(q) ? '' : 'none';
                    });
                };
                searchInput.addEventListener('input', (e) => {
                    e.stopPropagation();
                    applySearch();
                });
                // Чтобы клик в поле поиска не закрывал меню
                searchInput.addEventListener('click', (e) => e.stopPropagation());
            }
        }
    });
    // Закрытие меню по клику вне
    document.addEventListener('click', () => {
        container.querySelectorAll('.sort-menu').forEach(m => { m.style.display = 'none'; });
    });
}

// Функция для загрузки статистики
async function loadDashboard() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/statistics', { headers: { 'Authorization': `Bearer ${token}` } });
        let stats;
        try { stats = await response.json(); } catch (e) { stats = { error: 'Ответ сервера не в формате JSON' }; }
        if (!response.ok) {
            const msg = stats && stats.error ? stats.error : (`HTTP ${response.status}`);
            const el = document.getElementById('stats-container');
            if (response.status === 401 || response.status === 403) {
                el.innerHTML = `<div class="error">Ошибка загрузки статистики: ${msg}</div>`;
                try { localStorage.removeItem('authToken'); localStorage.removeItem('currentUser'); } catch (e) {}
                const btn = document.createElement('button');
                btn.textContent = 'Войти заново';
                btn.style.cssText = 'margin-top:10px; padding:8px 12px; border-radius:6px; background:#2c3e50; color:#fff; border:none; cursor:pointer;';
                btn.onclick = () => { window.location.href = '/'; };
                el.appendChild(btn);
                return;
            }
            try {
                const token2 = localStorage.getItem('authToken');
                const [u, b, o] = await Promise.all([
                    fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token2}` } }),
                    fetch('/api/admin/books', { headers: { 'Authorization': `Bearer ${token2}` } }),
                    fetch('/api/admin/orders', { headers: { 'Authorization': `Bearer ${token2}` } })
                ]);
                const users = u.ok ? await u.json() : [];
                const books = b.ok ? await b.json() : [];
                const orders = o.ok ? await o.json() : [];
                const fallbackStats = buildStatsFallback(users, books, orders);
                renderDashboard(fallbackStats);
            } catch (e) {
                el.innerHTML = `<div class="error">Ошибка загрузки статистики: ${msg}</div>`;
            }
            return;
        }
        const statsContainer = document.getElementById('stats-container');
        const totalRevenue = Number(stats.totalRevenue || 0).toFixed(2);
        const avgOrder = Number(stats.avgOrderValue || 0).toFixed(2);
        const topGenre = (Array.isArray(stats.revenueByGenre) && stats.revenueByGenre.length>0) ? stats.revenueByGenre[0].genre_name : '';
        const topAuthor = (Array.isArray(stats.topAuthors) && stats.topAuthors.length>0) ? stats.topAuthors[0].author_name : '';
        const topBookTitle = (Array.isArray(stats.popularBooks) && stats.popularBooks.length>0) ? stats.popularBooks[0].title : '';
        statsContainer.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; grid-column: 1 / -1;">
                <div class="stat-card"><div class="stat-number">${stats.users || 0}</div><div class="stat-label">Пользователи</div></div>
                <div class="stat-card"><div class="stat-number">${stats.books || 0}</div><div class="stat-label">Активные книги</div></div>
                <div class="stat-card"><div class="stat-number">${stats.orders || 0}</div><div class="stat-label">Заказы</div></div>
                <div class="stat-card"><div class="stat-number">${totalRevenue} р</div><div class="stat-label">Выручка</div></div>
                ${Number(avgOrder)>0 ? `<div class="stat-card"><div class="stat-number">${avgOrder} р</div><div class="stat-label">Средний чек</div></div>` : ''}
                ${topGenre ? `<div class="stat-card"><div class="stat-number" style="font-size:1.1em; white-space:normal; overflow:visible; text-overflow:clip; word-break:break-word;">${topGenre}</div><div class="stat-label">Топ жанр</div></div>` : ''}
                ${topAuthor ? `<div class="stat-card"><div class="stat-number" style="font-size:1.1em; white-space:normal; overflow:visible; text-overflow:clip; word-break:break-word;">${topAuthor}</div><div class="stat-label">Топ автор</div></div>` : ''}
                ${topBookTitle ? `<div class="stat-card"><div class="stat-number" style="font-size:1.1em; white-space:normal; overflow:visible; text-overflow:clip; word-break:break-word;">${topBookTitle}</div><div class="stat-label">Топ книга</div></div>` : ''}
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; grid-column: 1 / -1; margin-top: 20px;">
                <div style="background:#fff; padding: 20px; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                    <h3 style="margin-bottom:10px; color:#2c3e50;">Тренд заказов за 30 дней</h3>
                    <canvas id="chart-orders-trend" style="width:100%; height:280px;"></canvas>
                </div>
                <div style="background:#fff; padding: 20px; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                    <h3 style="margin-bottom:10px; color:#2c3e50;">Выручка по дням (30 дней)</h3>
                    <canvas id="chart-revenue" style="width:100%; height:280px;"></canvas>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; grid-column: 1 / -1; margin-top: 20px;">
                <div style="background:#fff; padding: 20px; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                    <h3 style="margin-bottom:10px; color:#2c3e50;">Статусы заказов</h3>
                    <canvas id="chart-status" style="width:100%; height:300px;"></canvas>
                </div>
                <div style="background:#fff; padding: 20px; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                    <h3 style="margin-bottom:10px; color:#2c3e50;">Топ-5 книг (шт.)</h3>
                    <canvas id="chart-top-books" style="width:100%; height:300px;"></canvas>
                </div>
            </div>
        `;
        const ordersByDayArr = Array.isArray(stats.ordersByDay) ? stats.ordersByDay.slice().reverse() : [];
        const labelsDays = ordersByDayArr.map(x => new Date(x.date).toLocaleDateString('ru-RU'));
        const countsDays = ordersByDayArr.map(x => Number(x.count || 0));
        const revenueDays = ordersByDayArr.map(x => Number(x.revenue || 0));
        const topBooks = Array.isArray(stats.popularBooks) ? stats.popularBooks : [];
        const labelsBooks = topBooks.map(x => (x.title || '').slice(0,24));
        const valuesBooks = topBooks.map(x => Number(x.total_sold || 0));
        drawLine(document.getElementById('chart-orders-trend'), labelsDays, countsDays, { color: '#3498db' });
        drawBars(document.getElementById('chart-revenue'), labelsDays, revenueDays, { color: '#27ae60' });
        const statusData = Array.isArray(stats.ordersByStatus) ? stats.ordersByStatus : [];
        const statusLabels = statusData.map(s => getOrderStatusText(s.status));
        const statusValues = statusData.map(s => Number(s.count || 0));
        const statusColors = statusData.map(s => {
            switch(String(s.status)) {
                case 'cancelled': return '#e74c3c';
                case 'delivered': return '#27ae60';
                case 'confirmed': return '#3498db';
                case 'pending': return '#f1c40f';
                case 'shipped': return '#9b59b6';
                default: return '#34495e';
            }
        });
        drawDonut(document.getElementById('chart-status'), statusLabels, statusValues, { colors: statusColors });
        // Legend DOM for statuses
        const legendStatus = document.createElement('div');
        legendStatus.id = 'legend-status';
        legendStatus.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;';
        statusData.forEach((s, i) => {
            const item = document.createElement('div');
            item.style.cssText = 'display:flex; align-items:center; gap:6px; padding:4px 8px; background:#f9f9f9; border-radius:6px;';
            const sw = document.createElement('span');
            sw.style.cssText = `display:inline-block; width:12px; height:12px; border-radius:2px; background:${statusColors[i]}`;
            const label = document.createElement('span');
            const pct = statusValues.reduce((a,b)=>a+b,0) ? Math.round((statusValues[i]/statusValues.reduce((a,b)=>a+b,0))*100) : 0;
            label.textContent = `${getOrderStatusText(s.status)} — ${s.count} (${pct}%)`;
            item.appendChild(sw);
            item.appendChild(label);
            legendStatus.appendChild(item);
        });
        document.getElementById('chart-status').parentElement.appendChild(legendStatus);
        drawHorizontalBars(document.getElementById('chart-top-books'), labelsBooks, valuesBooks, { color: '#9b59b6' });
    } catch (error) {
        document.getElementById('stats-container').innerHTML = '<div class="error">Ошибка загрузки статистики</div>';
    }
}

function buildStatsFallback(users, books, orders) {
    const ordersByDayMap = new Map();
    const revenueByDayMap = new Map();
    const statusMap = new Map();
    const totalRevenue = orders.reduce((s,o)=>s+Number(o.total_amount||0),0);
    orders.forEach(o=>{
        const d = new Date(o.created_at).toISOString().slice(0,10);
        ordersByDayMap.set(d, (ordersByDayMap.get(d)||0)+1);
        revenueByDayMap.set(d, (revenueByDayMap.get(d)||0)+Number(o.total_amount||0));
        statusMap.set(o.status, (statusMap.get(o.status)||0)+1);
    });
    const ordersByDay = Array.from(ordersByDayMap.entries()).map(([date,count])=>({date, count, revenue: revenueByDayMap.get(date)||0})).sort((a,b)=>a.date.localeCompare(b.date));
    const ordersByStatus = Array.from(statusMap.entries()).map(([status,count])=>({status, count}));
    return {
        users: Array.isArray(users)?users.length:0,
        books: Array.isArray(books)?books.length:0,
        orders: Array.isArray(orders)?orders.length:0,
        totalRevenue,
        ordersByDay,
        ordersByStatus,
        popularBooks: []
    };
}

function renderDashboard(stats) {
    const statsContainer = document.getElementById('stats-container');
    const totalRevenue = Number(stats.totalRevenue || 0).toFixed(2);
    const avgOrder = stats.orders>0 ? (Number(stats.totalRevenue||0)/Number(stats.orders)).toFixed(2) : '0.00';
    const topGenre = '';
    const topAuthor = '';
    const topBookTitle = '';
    statsContainer.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; grid-column: 1 / -1;">
            <div class="stat-card"><div class="stat-number">${stats.users || 0}</div><div class="stat-label">Пользователи</div></div>
            <div class="stat-card"><div class="stat-number">${stats.books || 0}</div><div class="stat-label">Активные книги</div></div>
            <div class="stat-card"><div class="stat-number">${stats.orders || 0}</div><div class="stat-label">Заказы</div></div>
            <div class="stat-card"><div class="stat-number">${totalRevenue} р</div><div class="stat-label">Выручка</div></div>
            ${Number(avgOrder)>0 ? `<div class="stat-card"><div class="stat-number">${avgOrder} р</div><div class="stat-label">Средний чек</div></div>` : ''}
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; grid-column: 1 / -1; margin-top: 20px;">
            <div style="background:#fff; padding: 20px; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                <h3 style="margin-bottom:10px; color:#2c3e50;">Тренд заказов за 30 дней</h3>
                <canvas id="chart-orders-trend" style="width:100%; height:280px;"></canvas>
            </div>
            <div style="background:#fff; padding: 20px; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                <h3 style="margin-bottom:10px; color:#2c3e50;">Выручка по дням (30 дней)</h3>
                <canvas id="chart-revenue" style="width:100%; height:280px;"></canvas>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; grid-column: 1 / -1; margin-top: 20px;">
            <div style="background:#fff; padding: 20px; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                <h3 style="margin-bottom:10px; color:#2c3e50;">Статусы заказов (круговая)</h3>
                <canvas id="chart-status" style="width:100%; height:300px;"></canvas>
            </div>
            <div style="background:#fff; padding: 20px; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                <h3 style="margin-bottom:10px; color:#2c3e50;">Топ-5 книг (шт.)</h3>
                <canvas id="chart-top-books" style="width:100%; height:300px;"></canvas>
            </div>
        </div>
    `;

    const ordersByDayTrend = stats.ordersByDay.slice().reverse().slice(-30);
    const labelsDays = ordersByDayTrend.map(x => new Date(x.date).toLocaleDateString('ru-RU'));
    const countsDays = ordersByDayTrend.map(x => Number(x.count||0));
    const revenueDays = stats.ordersByDay.map(x => Number(x.revenue||0));
    const statusData = Array.isArray(stats.ordersByStatus)?stats.ordersByStatus:[];
    const statusLabels = statusData.map(s=>getOrderStatusText(s.status));
    const statusValues = statusData.map(s=>Number(s.count||0));
    const statusColors = statusData.map(s=>{
        switch(String(s.status)){
            case 'cancelled': return '#e74c3c';
            case 'delivered': return '#27ae60';
            case 'confirmed': return '#3498db';
            case 'pending': return '#f1c40f';
            case 'shipped': return '#9b59b6';
            default: return '#34495e';
        }
    });
    drawLine(document.getElementById('chart-orders-trend'), labelsDays, countsDays, { color: '#3498db' });
    drawBars(document.getElementById('chart-revenue'), labelsDays, revenueDays, { color: '#27ae60' });
    drawDonut(document.getElementById('chart-status'), statusLabels, statusValues, { colors: statusColors });
    drawHorizontalBars(document.getElementById('chart-top-books'), [], [], { color: '#9b59b6' });
    const legendStatus = document.createElement('div');
    legendStatus.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;';
    statusData.forEach((s,i)=>{
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; align-items:center; gap:6px; padding:4px 8px; background:#f9f9f9; border-radius:6px;';
        const sw = document.createElement('span');
        sw.style.cssText = `display:inline-block; width:12px; height:12px; border-radius:2px; background:${statusColors[i]}`;
        const label = document.createElement('span');
        const pct = statusValues.reduce((a,b)=>a+b,0) ? Math.round((statusValues[i]/statusValues.reduce((a,b)=>a+b,0))*100) : 0;
        label.textContent = `${getOrderStatusText(s.status)} — ${s.count} (${pct}%)`;
        item.appendChild(sw); item.appendChild(label);
        legendStatus.appendChild(item);
    });
    document.getElementById('chart-status').parentElement.appendChild(legendStatus);
}

function drawBars(canvas, labels, values, opts) {
    if (!canvas || !labels || !values) return;
    const prep = prepareHiDPI(canvas);
    const ctx = prep.ctx; const w = prep.w; const h = prep.h;
    ctx.clearRect(0,0,w,h);
    const padL = 50, padR = 20, padT = 20, padB = 40;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();
    const maxVal = Math.max(1, ...values);
    const barCount = values.length;
    const gap = 8;
    const barW = Math.max(10, Math.floor((plotW - gap*(barCount+1)) / Math.max(1, barCount)));
    ctx.fillStyle = opts && opts.color ? opts.color : '#3498db';
    for (let i=0;i<barCount;i++) {
        const x = padL + gap + i*(barW+gap);
        const val = values[i];
        const bh = Math.round((val/maxVal) * (plotH-2));
        const y = padT + plotH - bh;
        ctx.fillRect(x, y, barW, bh);
    }
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    for (let i=0;i<barCount;i++) {
        const x = padL + gap + i*(barW+gap) + barW/2;
        const lbl = labels[i] || '';
        const val = values[i] || 0;
        ctx.save();
        ctx.translate(x, padT + plotH + 14);
        ctx.rotate(-Math.PI/6);
        ctx.textAlign = 'right';
        ctx.fillText(String(lbl), 0, 0);
        ctx.restore();
        ctx.textAlign = 'center';
        ctx.fillText(String(val), padL + gap + i*(barW+gap) + barW/2, yPosForValue(values[i], padT, plotH, maxVal));
    }
    function yPosForValue(v, padTop, plotHeight, maxV) {
        const bh = Math.round((v/Math.max(1,maxV)) * (plotHeight-2));
        return padTop + plotHeight - bh - 6;
    }
}

function drawDonut(canvas, labels, values, opts) {
    if (!canvas || !labels || !values || values.length === 0) return;
    const prep = prepareHiDPI(canvas);
    const ctx = prep.ctx; const w = prep.w; const h = prep.h;
    ctx.clearRect(0,0,w,h);
    const cx = w/2, cy = h/2, r = Math.min(w,h)/2 - 20, ir = r*0.6;
    const sum = values.reduce((s,v)=>s+v,0) || 1;
    const colors = (opts && opts.colors) || ['#3498db','#2ecc71','#f1c40f','#9b59b6','#e74c3c','#34495e','#1abc9c'];
    let start = -Math.PI/2;
    for (let i=0;i<values.length;i++) {
        const angle = (values[i]/sum) * Math.PI*2;
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.arc(cx,cy,r,start,start+angle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        start += angle;
    }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx,cy,ir,0,Math.PI*2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    
}

function drawHorizontalBars(canvas, labels, values, opts) {
    if (!canvas || !labels || !values) return;
    const prep = prepareHiDPI(canvas);
    const ctx = prep.ctx; const w = prep.w; const h = prep.h;
    ctx.clearRect(0,0,w,h);
    ctx.font = '12px Arial';
    // compute left padding to fit longest label fully
    const longest = labels.reduce((m, l) => (String(l).length > m.length ? String(l) : m), '');
    const textWidth = Math.ceil(ctx.measureText(longest).width);
    const padL = Math.max(120, textWidth + 40);
    const padR = 20, padT = 20, padB = 20;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const maxVal = Math.max(1, ...values);
    const rowH = Math.max(18, Math.floor(plotH / Math.max(1, values.length)) - 10);
    ctx.fillStyle = opts && opts.color ? opts.color : '#3498db';
    ctx.textAlign = 'right';
    for (let i=0;i<values.length;i++) {
        const y = padT + i*(rowH+10);
        const bw = Math.round((values[i]/maxVal) * (plotW-4));
        ctx.fillRect(padL, y, bw, rowH);
        ctx.fillStyle = '#333';
        ctx.fillText(String(labels[i]), padL - 6, y + rowH - 4);
        ctx.textAlign = 'left';
        ctx.fillText(String(values[i]), padL + bw + 6, y + rowH - 4);
        ctx.textAlign = 'right';
        ctx.fillStyle = opts && opts.color ? opts.color : '#3498db';
    }
}

function drawLine(canvas, labels, values, opts) {
    if (!canvas || !labels || !values) return;
    const prep = prepareHiDPI(canvas);
    const ctx = prep.ctx; const w = prep.w; const h = prep.h;
    ctx.clearRect(0,0,w,h);
    const padL = 50, padR = 20, padT = 20, padB = 40;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const maxVal = Math.max(1, ...values);
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();
    ctx.strokeStyle = (opts && opts.color) || '#3498db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i=0;i<values.length;i++) {
        const x = padL + (i*(plotW/Math.max(1, values.length-1)));
        const y = padT + plotH - Math.round((values[i]/maxVal) * (plotH-2));
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    // points
    ctx.fillStyle = (opts && opts.color) || '#3498db';
    for (let i=0;i<values.length;i++) {
        const x = padL + (i*(plotW/Math.max(1, values.length-1)));
        const y = padT + plotH - Math.round((values[i]/maxVal) * (plotH-2));
        ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
    }
    // labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    for (let i=0;i<labels.length;i++) {
        const x = padL + (i*(plotW/Math.max(1, labels.length-1)));
        const lbl = labels[i] || '';
        ctx.save();
        ctx.translate(x, padT + plotH + 14);
        ctx.rotate(-Math.PI/6);
        ctx.textAlign = 'right';
        ctx.fillText(String(lbl), 0, 0);
        ctx.restore();
    }
}

function prepareHiDPI(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
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
    usersData = Array.isArray(users) ? users : (usersData || []);
    let filtered = applyFilters(usersData, 'users');
    let data = sortData(filtered, 'users', usersSort);
    // Авто-сброс фильтров, если после удаления/изменений результат пуст, но данные существуют
    const filtersApplied = usersFilters.roles && usersFilters.roles.size > 0;
    if (data.length === 0 && (usersData && usersData.length > 0) && filtersApplied) {
        usersFilters.roles.clear();
        filtered = applyFilters(usersData, 'users');
        data = sortData(filtered, 'users', usersSort);
    }
    if (data.length === 0) {
        container.innerHTML = '<p>Нет пользователей</p>';
        return;
    }
    
    // Список ролей для меню фильтрации в заголовке
    const roles = Array.from(new Set((usersData || []).map(u => u.role).filter(Boolean)))
        .sort((a,b)=>String(a).localeCompare(String(b),'ru',{sensitivity:'base'}));

    container.innerHTML = `
        <table class="admin-table users-table">
            <thead>
                <tr>
                    <th><div class="th-inner"><span class="th-label">ID</span>
                        <span class="sort-caret" data-section="users" data-field="id">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">По возрастанию</button>
                            <button data-sort="desc">По убыванию</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Email</span>
                        <span class="sort-caret" data-section="users" data-field="email">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">Алфавит A→Я</button>
                            <button data-sort="desc">Алфавит Я→А</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Имя</span>
                        <span class="sort-caret" data-section="users" data-field="full_name">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">Алфавит A→Я</button>
                            <button data-sort="desc">Алфавит Я→А</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Роль</span>
                        <span class="sort-caret" data-section="users" data-field="role">▾</span>
                        <div class="sort-menu">
                            <div class="filter-search"><input type="text" class="filter-search-input" placeholder="Поиск..." /></div>
                            <div class="filter-list">
                                ${roles.map(r => `<label class="filter-item"><input type="checkbox" class="filter-role" value="${r}" ${usersFilters.roles.has(r)?'checked':''}/> ${r}</label>`).join('') || '<span class="filters-empty">Роли отсутствуют</span>'}
                            </div>
                            <div class="filter-actions">
                                <button class="filter-apply">Применить</button>
                            </div>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Действия</span></div></th>
                </tr>
            </thead>
            <tbody id="usersList">
            </tbody>
        </table>
    `;
    
    const usersList = document.getElementById('usersList');
    data.forEach(user => {
        const userRow = document.createElement('tr');
        if (user.blocked) {
            userRow.className = 'blocked-user';
        }
        userRow.innerHTML = `
            <td>${user.id}</td>
            <td>${user.email}</td>
            <td>${user.full_name || ''}</td>
            <td>${user.role}</td>
            <td class="admin-actions">
                <button onclick="editUser(${user.id})" class="btn-small btn-edit">Редактировать</button>
                ${user.blocked ? `<button onclick="unblockUser(${user.id})" class="btn-small btn-primary">Разблокировать</button>` : `<button onclick="blockUser(${user.id})" class="btn-small btn-delete">Заблокировать</button>`}
            </td>
        `;
        usersList.appendChild(userRow);
    });

    attachSortHandlers(container, 'users');
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

// Функция для блокировки пользователя
async function blockUser(userId) {
    if (!confirm('Вы уверены, что хотите заблокировать этого пользователя?')) {
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
            showMessage('Пользователь успешно заблокирован', 'success');
        } else {
            const error = await response.json();
            showMessage('Ошибка при блокировке пользователя: ' + (error.error || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('Error blocking user:', error);
        showMessage('Ошибка при блокировке пользователя', 'error');
    }
}

// Функция для разблокировки пользователя
async function unblockUser(userId) {
    if (!confirm('Вы уверены, что хотите разблокировать этого пользователя?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/admin/users/${userId}/unblock`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            loadUsers();
            showMessage('Пользователь успешно разблокирован', 'success');
        } else {
            const error = await response.json();
            showMessage('Ошибка при разблокировке пользователя: ' + (error.error || 'Неизвестная ошибка'), 'error');
        }
    } catch (error) {
        console.error('Error unblocking user:', error);
        showMessage('Ошибка при разблокировке пользователя', 'error');
    }
}

// Функция для редактирования пользователя
async function editUser(userId) {
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/users/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const form = document.getElementById('edit-user-form');
        form.style.display = 'block';
        moveFormBeforeTable('edit-user-form');
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
            moveFormBeforeTable('edit-user-form');
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
        // Убедимся, что жанры загружены для корректной фильтрации по жанрам
        if (!Array.isArray(genresData) || genresData.length === 0) {
            try { await loadGenres(); } catch (e) { /* ignore */ }
        }
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
    booksData = Array.isArray(books) ? books : (booksData || []);
    let filtered = applyFilters(booksData, 'books');
    let data = sortData(filtered, 'books', booksSort);
    // Авто-сброс фильтров (автор/жанр), если после удаления/изменений результат пуст, но книги в базе есть
    const filtersApplied = (booksFilters.authors && booksFilters.authors.size > 0) || (booksFilters.genres && booksFilters.genres.size > 0);
    if (data.length === 0 && (booksData && booksData.length > 0) && filtersApplied) {
        booksFilters.authors.clear();
        booksFilters.genres.clear();
        filtered = applyFilters(booksData, 'books');
        data = sortData(filtered, 'books', booksSort);
    }
    if (data.length === 0) {
        container.innerHTML = '<p>Нет книг</p>';
        return;
    }
    
    // Списки для меню фильтрации в заголовках
    const authorsList = Array.from(new Set((booksData||[]).map(b => b.author_name).filter(Boolean)))
        .sort((a,b)=>String(a).localeCompare(String(b),'ru',{sensitivity:'base'}));
    const genresSource = (Array.isArray(genresData) && genresData.length > 0)
        ? genresData.map(g => g.name)
        : (booksData||[]).map(b => b.genre_name);
    const genresList = Array.from(new Set(genresSource.filter(Boolean)))
        .sort((a,b)=>String(a).localeCompare(String(b),'ru',{sensitivity:'base'}));

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th><div class="th-inner"><span class="th-label">ID</span>
                        <span class="sort-caret" data-section="books" data-field="id">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">По возрастанию</button>
                            <button data-sort="desc">По убыванию</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Обложка</span></div></th>
                    <th><div class="th-inner"><span class="th-label">Название</span>
                        <span class="sort-caret" data-section="books" data-field="title">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">Алфавит A→Я</button>
                            <button data-sort="desc">Алфавит Я→А</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Автор</span>
                        <span class="sort-caret" data-section="books" data-field="author_name">▾</span>
                        <div class="sort-menu">
                            <div class="filter-search"><input type="text" class="filter-search-input" placeholder="Поиск..." /></div>
                            <div class="filter-list">
                                ${authorsList.map(a => `<label class="filter-item"><input type="checkbox" class="filter-author" value="${a}" ${booksFilters.authors.has(a)?'checked':''}/> ${a}</label>`).join('') || '<span class="filters-empty">Авторы отсутствуют</span>'}
                            </div>
                            <div class="filter-actions">
                                <button class="filter-apply">Применить</button>
                            </div>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Жанр</span>
                        <span class="sort-caret" data-section="books" data-field="genre_name">▾</span>
                        <div class="sort-menu">
                            <div class="filter-search"><input type="text" class="filter-search-input" placeholder="Поиск..." /></div>
                            <div class="filter-list">
                                ${genresList.map(g => `<label class="filter-item"><input type="checkbox" class="filter-genre" value="${g}" ${booksFilters.genres.has(g)?'checked':''}/> ${g}</label>`).join('') || '<span class="filters-empty">Жанры отсутствуют</span>'}
                            </div>
                            <div class="filter-actions">
                                <button class="filter-apply">Применить</button>
                            </div>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Год</span>
                        <span class="sort-caret" data-section="books" data-field="publication_year">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">По возрастанию</button>
                            <button data-sort="desc">По убыванию</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Издательство</span>
                        <span class="sort-caret" data-section="books" data-field="publisher">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">Алфавит A→Я</button>
                            <button data-sort="desc">Алфавит Я→А</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Цена</span>
                        <span class="sort-caret" data-section="books" data-field="price">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">По возрастанию</button>
                            <button data-sort="desc">По убыванию</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Описание</span></div></th>
                    <th><div class="th-inner"><span class="th-label">Действия</span></div></th>
                </tr>
            </thead>
            <tbody id="booksList">
            </tbody>
        </table>
    `;
    
    const booksList = document.getElementById('booksList');
    data.forEach(book => {
        const bookRow = document.createElement('tr');
        const safeTitle = (book.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeAuthor = (book.author_name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeGenre = (book.genre_name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeDesc = (book.description || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const defaultCover = 'https://i.pinimg.com/474x/e2/93/05/e29305e0ee7c3d1ef31ce6f234e194f8.jpg';
        const coverSrc = book.cover_image ? book.cover_image : defaultCover;
        const coverCell = `
            <div class="book-cover-wrap">
                <img src="${coverSrc}" alt="Обложка" class="book-cover" onerror="this.onerror=null;this.src='${defaultCover}';"/>
                <div class="book-isbn">${book.isbn ? 'ISBN: ' + String(book.isbn).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'ISBN не указан'}</div>
            </div>
        `;
        const safePublisher = (book.publisher || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        bookRow.innerHTML = `
            <td>${book.id}</td>
            <td>${coverCell}</td>
            <td>${safeTitle}</td>
            <td>${safeAuthor}</td>
            <td>${safeGenre}</td>
            <td>${book.publication_year || ''}</td>
            <td>${safePublisher}</td>
            <td>${book.price} руб.</td>
            <td>
                ${book.description ? `
                    <div class="desc-wrap">
                        <span class="desc-full">${safeDesc}</span>
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

    // Кнопка раскрытия описания удалена в админке вкладки "Книги"
    attachSortHandlers(container, 'books');
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
        moveFormBeforeTable('edit-book-form');
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
            moveFormBeforeTable('edit-book-form');
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
    ordersData = Array.isArray(orders) ? orders : (ordersData || []);
    let filtered = applyFilters(ordersData, 'orders');
    let data = sortData(filtered, 'orders', ordersSort);
    // Авто-сброс фильтров статусов, если результат пуст, но заказы существуют
    const filtersApplied = ordersFilters.statuses && ordersFilters.statuses.size > 0;
    if (data.length === 0 && (ordersData && ordersData.length > 0) && filtersApplied) {
        ordersFilters.statuses.clear();
        filtered = applyFilters(ordersData, 'orders');
        data = sortData(filtered, 'orders', ordersSort);
    }
    if (data.length === 0) {
        container.innerHTML = '<p>Нет заказов</p>';
        return;
    }
    
    // Список статусов для меню фильтрации в заголовке
    const statusesList = Array.from(new Set((ordersData||[]).map(o => o.status).filter(Boolean)))
        .sort((a,b)=>String(a).localeCompare(String(b),'ru',{sensitivity:'base'}));

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th><div class="th-inner"><span class="th-label">ID</span>
                        <span class="sort-caret" data-section="orders" data-field="id">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">По возрастанию</button>
                            <button data-sort="desc">По убыванию</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Пользователь</span>
                        <span class="sort-caret" data-section="orders" data-field="user">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">Алфавит A→Я</button>
                            <button data-sort="desc">Алфавит Я→А</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Сумма</span>
                        <span class="sort-caret" data-section="orders" data-field="total_amount">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">По возрастанию</button>
                            <button data-sort="desc">По убыванию</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Статус</span>
                        <span class="sort-caret" data-section="orders" data-field="status">▾</span>
                        <div class="sort-menu">
                            <div class="filter-search"><input type="text" class="filter-search-input" placeholder="Поиск..." /></div>
                            <div class="filter-list">
                                ${statusesList.map(s => `<label class="filter-item"><input type="checkbox" class="filter-status" value="${s}" ${ordersFilters.statuses.has(s)?'checked':''}/> ${STATUS_LABELS[s] || s}</label>`).join('') || '<span class="filters-empty">Статусы отсутствуют</span>'}
                            </div>
                            <div class="filter-actions">
                                <button class="filter-apply">Применить</button>
                            </div>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Дата</span>
                        <span class="sort-caret" data-section="orders" data-field="created_at">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">По возрастанию</button>
                            <button data-sort="desc">По убыванию</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Действия</span></div></th>
                </tr>
            </thead>
            <tbody id="ordersList">
            </tbody>
        </table>
    `;
    
    const ordersList = document.getElementById('ordersList');
    data.forEach(order => {
        const orderRow = document.createElement('tr');
        orderRow.innerHTML = `
            <td>${order.id}</td>
            <td>${order.user_email || order.user_id}</td>
            <td>${order.total_amount} руб.</td>
            <td><span class="order-status order-status-${order.status}">${getOrderStatusText(order.status)}</span></td>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
            <td class="admin-actions">
                <button onclick="viewOrder(${order.id})" class="btn-small" style="background: #3498db; color: white;">Просмотр</button>
                <button onclick="updateOrderStatus(${order.id})" class="btn-small" style="background: #f39c12; color: white;">Изменить статус</button>
            </td>
        `;
        ordersList.appendChild(orderRow);
    });

    attachSortHandlers(container, 'orders');
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
    authorsData = Array.isArray(authors) ? authors : (authorsData || []);
    const data = sortData(authorsData, 'authors', authorsSort);
    if (!data || data.length === 0) {
        container.innerHTML = '<p>Нет авторов</p>';
        return;
    }
    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th><div class="th-inner"><span class="th-label">ID</span>
                        <span class="sort-caret" data-section="authors" data-field="id">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">По возрастанию</button>
                            <button data-sort="desc">По убыванию</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Имя</span>
                        <span class="sort-caret" data-section="authors" data-field="name">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">Алфавит A→Я</button>
                            <button data-sort="desc">Алфавит Я→А</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Действия</span></div></th>
                </tr>
            </thead>
            <tbody id="authorsList"></tbody>
        </table>
    `;
    const list = document.getElementById('authorsList');
    data.forEach(a => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${a.id}</td>
            <td>${a.name || a.full_name || ''}</td>
            <td>
                <button class="btn-small btn-edit-orange" onclick="editAuthor(${a.id})">Редактировать</button>
                <button class="btn-small" style="background:#e74c3c;color:white" onclick="deleteAuthor(${a.id})">Удалить</button>
            </td>
        `;
        list.appendChild(row);
    });

    attachSortHandlers(container, 'authors');
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
    genresData = Array.isArray(genres) ? genres : (genresData || []);
    const data = sortData(genresData, 'genres', genresSort);
    if (!data || data.length === 0) {
        container.innerHTML = '<p>Нет жанров</p>';
        return;
    }
    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th><div class="th-inner"><span class="th-label">ID</span>
                        <span class="sort-caret" data-section="genres" data-field="id">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">По возрастанию</button>
                            <button data-sort="desc">По убыванию</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Жанр</span>
                        <span class="sort-caret" data-section="genres" data-field="name">▾</span>
                        <div class="sort-menu">
                            <button data-sort="asc">По возрастанию</button>
                            <button data-sort="desc">По убыванию</button>
                            <button data-sort="none">Сброс</button>
                        </div>
                    </div></th>
                    <th><div class="th-inner"><span class="th-label">Действия</span></div></th>
                </tr>
            </thead>
            <tbody id="genresList"></tbody>
        </table>
    `;
    const list = document.getElementById('genresList');
    data.forEach(g => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${g.id}</td>
            <td>${g.name || ''}</td>
            <td>
                <button class="btn-small btn-edit-orange" onclick="editGenre(${g.id})">Редактировать</button>
                <button class="btn-small" style="background:#e74c3c;color:white" onclick="deleteGenre(${g.id})">Удалить</button>
            </td>
        `;
        list.appendChild(row);
    });

    attachSortHandlers(container, 'genres');
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
        moveFormBeforeTable('edit-author-form');
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
            moveFormBeforeTable('edit-author-form');
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
        moveFormBeforeTable('edit-genre-form');
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
            moveFormBeforeTable('edit-genre-form');
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

async function loadPromotions() {
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch('/api/admin/promotions', { headers: { 'Authorization': `Bearer ${token}` } });
        const container = document.getElementById('promotions-table-container');
        if (!container) return;
        if (!resp.ok) {
            container.innerHTML = '<div class="error">Ошибка загрузки акций</div>';
            return;
        }
        const promos = await resp.json();
        if (!Array.isArray(promos) || promos.length === 0) {
            container.innerHTML = '<p>Нет акций</p>';
            return;
        }
        const now = new Date();
        const rows = promos.map(p => {
            const active = Boolean(p.is_active) && (p.start_date ? new Date(p.start_date) <= now : true) && (p.end_date ? new Date(p.end_date) >= now : true);
            return `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${p.discount_type === 'percent' ? (p.discount_value + '%') : (p.discount_value + ' р')}</td>
                <td>${p.start_date ? new Date(p.start_date).toLocaleString('ru-RU') : ''}</td>
                <td>${p.end_date ? new Date(p.end_date).toLocaleString('ru-RU') : ''}</td>
                <td>${active ? 'Активна' : 'Неактивна'}</td>
                <td>
                    <button class="btn-small" onclick="showEditPromotionForm(${p.id})" style="background:#3498db;color:white">Редактировать</button>
                    <button class="btn-small" onclick="deletePromotion(${p.id})" style="background:#e74c3c;color:white">Удалить</button>
                </td>
            </tr>
        `}).join('');
        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Название</th>
                        <th>Скидка</th>
                        <th>Начало</th>
                        <th>Окончание</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    } catch (e) {
        const container = document.getElementById('promotions-table-container');
        if (container) container.innerHTML = '<div class="error">Ошибка загрузки акций</div>';
    }
}

function showCreatePromotionForm() {
    const form = document.getElementById('create-promotion-form');
    if (form) {
        form.style.display = 'block';
        moveFormBeforeTable('create-promotion-form');
        populatePromotionCheckboxes('promo');
        initFilterDropdown('promo-genres-dropdown');
        initFilterDropdown('promo-authors-dropdown');
        initPromoValueHints();
    }
}

function hideCreatePromotionForm() {
    const form = document.getElementById('create-promotion-form');
    if (form) form.style.display = 'none';
}

async function submitCreatePromotion() {
    const name = document.getElementById('promo-name').value.trim();
    const type = document.getElementById('promo-type').value;
    const value = parseFloat(document.getElementById('promo-value').value);
    const start = document.getElementById('promo-start').value;
    const end = document.getElementById('promo-end').value;
    const minTotal = parseFloat(document.getElementById('promo-min-total').value);
    const genresList = document.getElementById('promo-genres-list');
    const authorsList = document.getElementById('promo-authors-list');
    const imageUrl = document.getElementById('promo-image-url') ? document.getElementById('promo-image-url').value.trim() : '';
    const minItems = parseInt(document.getElementById('promo-min-items').value, 10);
    if (!name || !type || !(value > 0) || !start) {
        showMessage('Заполните обязательные поля: название, тип, значение скидки, дата начала', 'error');
        return;
    }
    const conditions = {};
    if (minTotal > 0) conditions.min_total_amount = minTotal;
    const genres = Array.from(genresList.querySelectorAll('input[type="checkbox"]:checked')).map(i => parseInt(i.value, 10)).filter(n => !isNaN(n));
    if (genres.length > 0) conditions.include_genres = genres;
    const authors = Array.from(authorsList.querySelectorAll('input[type="checkbox"]:checked')).map(i => parseInt(i.value, 10)).filter(n => !isNaN(n));
    if (authors.length > 0) conditions.include_authors = authors;
    if (!isNaN(minItems) && minItems > 0) conditions.min_items = minItems;
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch('/api/admin/promotions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                name,
                discount_type: type,
                discount_value: value,
                start_date: start,
                end_date: end || null,
                conditions,
                image_url: imageUrl || null
            })
        });
        if (resp.ok) {
            hideCreatePromotionForm();
            showMessage('Акция создана', 'success');
            loadPromotions();
        } else {
            const err = await resp.json().catch(() => ({}));
            showMessage(err.error || 'Ошибка создания акции', 'error');
        }
    } catch (e) {
        showMessage('Ошибка создания акции', 'error');
    }
}

async function populatePromotionCheckboxes(prefix, preselected) {
    try {
        const [authorsResp, genresResp] = await Promise.all([
            fetch('/api/authors'),
            fetch('/api/genres')
        ]);
        const authorsData = await authorsResp.json();
        const genresData = await genresResp.json();
        const authorsList = document.getElementById(prefix + '-authors-list');
        const genresList = document.getElementById(prefix + '-genres-list');
        const selAuthors = (preselected && preselected.authors) ? new Set(preselected.authors.map(x=>String(x))) : new Set();
        const selGenres = (preselected && preselected.genres) ? new Set(preselected.genres.map(x=>String(x))) : new Set();
        if (authorsList && Array.isArray(authorsData)) {
            authorsList.innerHTML = '';
            authorsData.forEach(a => {
                const id = a.id;
                const name = a.name || a.full_name || '';
                const label = document.createElement('label');
                label.className = 'filter-item';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = id;
                if (selAuthors.has(String(id))) cb.checked = true;
                const text = document.createElement('span');
                text.textContent = name;
                label.appendChild(cb);
                label.appendChild(text);
                authorsList.appendChild(label);
            });
        }
        if (genresList && Array.isArray(genresData)) {
            genresList.innerHTML = '';
            genresData.forEach(g => {
                const id = g.id;
                const name = g.name || '';
                const label = document.createElement('label');
                label.className = 'filter-item';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = id;
                if (selGenres.has(String(id))) cb.checked = true;
                const text = document.createElement('span');
                text.textContent = name;
                label.appendChild(cb);
                label.appendChild(text);
                genresList.appendChild(label);
            });
        }
    } catch (e) {
        console.warn('Populate promotion selects failed:', e);
    }
}

function showEditPromotionForm(id) {
    const form = document.getElementById('edit-promotion-form');
    if (!form) return;
    form.style.display = 'block';
    form.dataset.promoId = String(id);
    moveFormBeforeTable('edit-promotion-form');
    loadPromotionToEdit(id);
    initEditPromoValueHints();
}

function hideEditPromotionForm() {
    const form = document.getElementById('edit-promotion-form');
    if (form) form.style.display = 'none';
}

async function loadPromotionToEdit(id) {
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/promotions/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) { showMessage('Ошибка загрузки акции', 'error'); return; }
        const p = await resp.json();
        document.getElementById('edit-promo-name').value = p.name || '';
        document.getElementById('edit-promo-type').value = p.discount_type || 'percent';
        document.getElementById('edit-promo-value').value = p.discount_value || 0;
        document.getElementById('edit-promo-start').value = p.start_date ? new Date(p.start_date).toISOString().slice(0,16) : '';
        document.getElementById('edit-promo-end').value = p.end_date ? new Date(p.end_date).toISOString().slice(0,16) : '';
        const cond = p.conditions || {};
        const imgInput = document.getElementById('edit-promo-image-url');
        if (imgInput) imgInput.value = p.image_url || '';
        const preselected = {
            genres: Array.isArray(cond.include_genres) ? cond.include_genres : [],
            authors: Array.isArray(cond.include_authors) ? cond.include_authors : []
        };
        populatePromotionCheckboxes('edit-promo', preselected);
        initFilterDropdown('edit-promo-genres-dropdown');
        initFilterDropdown('edit-promo-authors-dropdown');
        document.getElementById('edit-promo-min-total').value = cond.min_total_amount || '';
        document.getElementById('edit-promo-min-items').value = cond.min_items || '';
    } catch (e) {
        showMessage('Ошибка загрузки акции', 'error');
    }
}

async function submitEditPromotion() {
    const form = document.getElementById('edit-promotion-form');
    const id = parseInt(form.dataset.promoId, 10);
    const name = document.getElementById('edit-promo-name').value.trim();
    const type = document.getElementById('edit-promo-type').value;
    const value = parseFloat(document.getElementById('edit-promo-value').value);
    const start = document.getElementById('edit-promo-start').value;
    const end = document.getElementById('edit-promo-end').value;
    const minTotal = parseFloat(document.getElementById('edit-promo-min-total').value);
    const genresList = document.getElementById('edit-promo-genres-list');
    const authorsList = document.getElementById('edit-promo-authors-list');
    const imageUrl = document.getElementById('edit-promo-image-url') ? document.getElementById('edit-promo-image-url').value.trim() : '';
    const minItems = parseInt(document.getElementById('edit-promo-min-items').value, 10);
    if (!name || !type || !(value > 0) || !start) {
        showMessage('Заполните обязательные поля: название, тип, значение скидки, дата начала', 'error');
        return;
    }
    const conditions = {};
    if (minTotal > 0) conditions.min_total_amount = minTotal;
    const genres = Array.from(genresList.querySelectorAll('input[type="checkbox"]:checked')).map(i => parseInt(i.value, 10)).filter(n => !isNaN(n));
    if (genres.length > 0) conditions.include_genres = genres;
    const authors = Array.from(authorsList.querySelectorAll('input[type="checkbox"]:checked')).map(i => parseInt(i.value, 10)).filter(n => !isNaN(n));
    if (authors.length > 0) conditions.include_authors = authors;
    if (!isNaN(minItems) && minItems > 0) conditions.min_items = minItems;
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/promotions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                name,
                discount_type: type,
                discount_value: value,
                start_date: start,
                end_date: end || null,
                conditions,
                image_url: imageUrl || null
            })
        });
        if (resp.ok) {
            hideEditPromotionForm();
            showMessage('Акция обновлена', 'success');
            loadPromotions();
        } else {
            const err = await resp.json().catch(() => ({}));
            showMessage(err.error || 'Ошибка обновления акции', 'error');
        }
    } catch (e) {
        showMessage('Ошибка обновления акции', 'error');
    }
}

async function deletePromotion(id) {
    if (!confirm('Удалить акцию?')) return;
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`/api/admin/promotions/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (resp.ok) {
            showMessage('Акция удалена', 'success');
            loadPromotions();
        } else {
            const err = await resp.json().catch(() => ({}));
            showMessage(err.error || 'Ошибка удаления акции', 'error');
        }
    } catch (e) {
        showMessage('Ошибка удаления акции', 'error');
    }
}

function initFilterDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const toggleBtn = dropdown.querySelector('.dropdown-toggle');
    const menu = dropdown.querySelector('.filter-menu');
    const searchInput = dropdown.querySelector('.filter-search-input');
    const list = dropdown.querySelector('.filter-list');
    if (toggleBtn && menu) {
        toggleBtn.addEventListener('click', () => {
            menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'block' : 'none';
        });
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) menu.style.display = 'none';
        });
    }
    if (searchInput && list) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            list.querySelectorAll('label').forEach(label => {
                const text = label.textContent.toLowerCase();
                label.style.display = text.includes(q) ? 'block' : 'none';
            });
        });
    }
    if (list && toggleBtn) {
        list.addEventListener('change', () => updateDropdownSummary(dropdownId));
        updateDropdownSummary(dropdownId);
    }
}

function updateDropdownSummary(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const toggleBtn = dropdown.querySelector('.dropdown-toggle');
    const list = dropdown.querySelector('.filter-list');
    if (!toggleBtn || !list) return;
    const checked = Array.from(list.querySelectorAll('input[type="checkbox"]:checked'));
    if (checked.length === 0) {
        toggleBtn.textContent = toggleBtn.id && toggleBtn.id.includes('authors') ? 'Выбрать авторов' : (toggleBtn.id && toggleBtn.id.includes('genres') ? 'Выбрать жанры' : 'Выбрать');
        return;
    }
    const names = checked.map(cb => cb.parentElement.querySelector('span')?.textContent || '').filter(Boolean);
    const preview = names.slice(0, 3).join(', ');
    const suffix = names.length > 3 ? ` и ещё ${names.length - 3}` : '';
    toggleBtn.textContent = `Выбрано: ${preview}${suffix}`;
}

function initPromoValueHints() {
    const t = document.getElementById('promo-type');
    const v = document.getElementById('promo-value');
    if (!t || !v) return;
    const apply = () => {
        if (t.value === 'percent') {
            v.step = '1';
            v.min = '0';
            v.max = '100';
        } else {
            v.step = '0.01';
            v.min = '0';
            v.removeAttribute('max');
        }
    };
    apply();
    t.addEventListener('change', apply);
}

function initEditPromoValueHints() {
    const t = document.getElementById('edit-promo-type');
    const v = document.getElementById('edit-promo-value');
    if (!t || !v) return;
    const apply = () => {
        if (t.value === 'percent') {
            v.step = '1';
            v.placeholder = 'Напр. 20';
            v.min = '0';
            v.max = '100';
        } else {
            v.step = '0.01';
            v.placeholder = 'Напр. 100.00';
            v.min = '0';
            v.removeAttribute('max');
        }
    };
    apply();
    t.addEventListener('change', apply);
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
                <div><strong>Статус:</strong> <span class="order-status order-status-${order.status}">${getOrderStatusText(order.status)}</span></div>
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

// Кнопка «Выход» в админке: просто переход к каталогу без выхода
function logout() {
    window.location.href = '/catalog.html';
}

// Делаем функции глобально доступными
window.showSection = showSection;
window.logout = logout;
window.showCreateUserForm = showCreateUserForm;
window.hideCreateUserForm = hideCreateUserForm;
window.createUser = createUser;
window.blockUser = blockUser;
window.unblockUser = unblockUser;
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
