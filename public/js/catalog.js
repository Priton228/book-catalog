// Загрузка книг при открытии страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Catalog.js loaded');
    initializeCatalogEventListeners();
    loadBooks();
    loadFilters();
});

// Состояние каталога: сортировка и фильтры
let catalogSort = { field: 'none', direction: 'asc' };
const catalogFilters = { authors: new Set(), genres: new Set() };

// Инициализация обработчиков событий для каталога
function initializeCatalogEventListeners() {
    console.log('🔧 Initializing catalog event listeners');
    
    // Кнопка применения фильтров
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', loadBooks);
        console.log('Apply filters button listener added');
    }
    
    // Живой поиск: применяем ввёденный текст без Enter (дебаунс)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(loadBooks, 250);
        });
        // Сохраняем поддержку Enter для удобства
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                loadBooks();
            }
        });
        console.log('Live search listener added');
    }

    // Селект сортировки
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const val = this.value;
            switch (val) {
                case 'title_asc': catalogSort = { field: 'title', direction: 'asc' }; break;
                case 'title_desc': catalogSort = { field: 'title', direction: 'desc' }; break;
                case 'price_asc': catalogSort = { field: 'price', direction: 'asc' }; break;
                case 'price_desc': catalogSort = { field: 'price', direction: 'desc' }; break;
                default: catalogSort = { field: 'none', direction: 'asc' }; break;
            }
            loadBooks();
        });
    }

    // Выпадающие меню авторов/жанров
    ['authors','genres'].forEach(type => {
        const dropdown = document.getElementById(`${type}-dropdown`);
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

        // Применение фильтра при изменении чекбокса
        if (list) {
            list.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    const selected = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
                    if (type === 'authors') {
                        catalogFilters.authors = new Set(selected);
                    } else {
                        catalogFilters.genres = new Set(selected);
                    }
                    loadBooks();
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const q = searchInput.value.toLowerCase();
                list.querySelectorAll('.filter-item').forEach(item => {
                    const txt = item.textContent.toLowerCase();
                    item.style.display = txt.includes(q) ? '' : 'none';
                });
            });
        }
    });
}

// Загрузка книг с фильтрами
async function loadBooks() {
    console.log('Loading books...');
    
    const search = document.getElementById('search-input').value.trim();
    // Автор/жанр фильтруем на клиенте (мультивыбор)

    // Показываем индикатор загрузки
    document.getElementById('loading').style.display = 'block';
    document.getElementById('no-books').style.display = 'none';

    // Строим URL с параметрами
    let url = '/api/books?';
    const params = new URLSearchParams();
    
    if (search) params.append('search', search);
    // На сервер отправляем только текстовый поиск; сортировка/автор/жанр применяются на клиенте
    
    url += params.toString();

    try {
        const response = await fetch(url);
        const data = await response.json();

        document.getElementById('loading').style.display = 'none';

        if (response.ok) {
            console.log(`Loaded ${data.books.length} books`);
            const filtered = applyCatalogFilters(data.books);
            const sorted = sortCatalogData(filtered);
            displayBooks(sorted);
        } else {
            console.error('Error loading books:', data.error);
            showMessage('Ошибка загрузки книг', 'error');
        }
    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        console.error('Connection error:', error);
        showMessage('Ошибка соединения', 'error');
    }
}

// Применение клиентской фильтрации
function applyCatalogFilters(books) {
    const a = catalogFilters.authors;
    const g = catalogFilters.genres;
    return books.filter(b =>
        (a.size === 0 || a.has(b.author_name || '')) &&
        (g.size === 0 || g.has(b.genre_name || ''))
    );
}

// Сортировка данных по названию/цене
function sortCatalogData(books) {
    const { field, direction } = catalogSort;
    if (field === 'none') return books;
    const dir = direction === 'desc' ? -1 : 1;
    return [...books].sort((x,y) => {
        let vx = 0, vy = 0;
        if (field === 'title') {
            return dir * String(x.title||'').localeCompare(String(y.title||''),'ru',{sensitivity:'base'});
        }
        if (field === 'price') {
            vx = Number(x.price||0); vy = Number(y.price||0);
        }
        return dir * (vx - vy);
    });
}

// Отображение книг в сетке
function displayBooks(books) {
    console.log('Displaying books...');
    
    const container = document.getElementById('books-container');
    const noBooks = document.getElementById('no-books');

    if (!books || books.length === 0) {
        container.innerHTML = '';
        noBooks.style.display = 'block';
        console.log('No books to display');
        return;
    }

    noBooks.style.display = 'none';

    container.innerHTML = books.map(book => {
        const safeTitle = escapeHtml(book.title);
        const safeAuthor = escapeHtml(book.author_name || 'Автор не указан');
        const safeGenre = escapeHtml(book.genre_name || 'Жанр не указан');
        const shortDesc = book.description ? (book.description.length > 80 ? book.description.substring(0, 80) + '...' : book.description) : '';
        const safeShortDesc = escapeHtml(shortDesc);
        const safeFullDesc = escapeHtml(book.description || '');
        const defaultCover = 'https://i.pinimg.com/474x/e2/93/05/e29305e0ee7c3d1ef31ce6f234e194f8.jpg';
        const coverSrc = book.cover_image ? book.cover_image : defaultCover;
        const coverHtml = `
            <div class="book-cover-wrap">
                <img src="${coverSrc}" alt="Обложка ${safeTitle}" class="book-cover" onerror="this.onerror=null;this.src='${defaultCover}';"/>
            </div>
        `;
        
        return `
        <div class="book-card" data-book-id="${book.id}">
            ${coverHtml}
            <div class="book-title">${safeTitle}</div>
            <div class="book-author">${safeAuthor}</div>
            <div class="book-genre">${safeGenre}</div>
            <div class="book-price">${book.price ? book.price + ' ₽' : 'Цена не указана'}</div>
            <div class="book-stock">В наличии: ${book.stock_quantity || 0} шт.</div>
            ${book.description ? `
                <div class="book-description">
                    <span class="desc-short">${safeShortDesc}</span>
                    <span class="desc-full" style="display:none;">${safeFullDesc}</span>
                    ${book.description.length > 80 ? `<button class="btn btn-link toggle-description" data-book-id="${book.id}">Показать полностью</button>` : ''}
                </div>
            ` : ''}
            <div class="book-actions">
                ${book.stock_quantity > 0 ? `
                    <button class="btn btn-primary add-to-cart-btn" 
                            data-book-id="${book.id}"
                            data-book-title="${safeTitle}"
                            data-book-price="${book.price}"
                            data-book-author="${safeAuthor}">
                        В корзину
                    </button>
                ` : `
                    <button class="btn btn-outline" disabled>Нет в наличии</button>
                `}
            </div>
        </div>
        `;
    }).join('');
    
    // Добавляем обработчики для кнопок "В корзину"
    addCartButtonListeners();
    
    // Обработчики для раскрытия описания
    const toggleButtons = document.querySelectorAll('.toggle-description');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.book-card');
            if (!card) return;
            const shortEl = card.querySelector('.desc-short');
            const fullEl = card.querySelector('.desc-full');
            const isHidden = fullEl.style.display === 'none';
            fullEl.style.display = isHidden ? 'inline' : 'none';
            shortEl.style.display = isHidden ? 'none' : 'inline';
            this.textContent = isHidden ? 'Свернуть' : 'Показать полностью';
        });
    });
    console.log('Books displayed successfully');
}

// Добавление обработчиков для кнопок "В корзину"
function addCartButtonListeners() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    console.log(`Found ${addToCartButtons.length} add-to-cart buttons`);
    
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            const bookId = this.getAttribute('data-book-id');
            const bookTitle = this.getAttribute('data-book-title');
            const bookPrice = parseFloat(this.getAttribute('data-book-price'));
            const bookAuthor = this.getAttribute('data-book-author');
            
            console.log('Add to cart clicked:', { bookId, bookTitle, bookPrice, bookAuthor });
            
            addToCart(bookId, bookTitle, bookPrice, bookAuthor);
        });
    });
}

// Загрузка фильтров (жанры и авторы)
async function loadFilters() {
    console.log('Loading filters...');
    
    try {
        // Загружаем жанры
        const genresResponse = await fetch('/api/genres');
        const genresData = await genresResponse.json();
        
        if (genresResponse.ok) {
            const genresArray = Array.isArray(genresData) ? genresData : (Array.isArray(genresData.genres) ? genresData.genres : []);
            const genresList = document.getElementById('genres-list');
            if (genresList) {
                if (genresArray.length) {
                    genresList.innerHTML = genresArray
                        .map(g => `<label class="filter-item"><input type="checkbox" value="${escapeHtml(g.name)}" ${catalogFilters.genres.has(g.name)?'checked':''}/> ${escapeHtml(g.name)}</label>`)
                        .join('');
                } else {
                    genresList.innerHTML = '<span class="filters-empty">Жанры отсутствуют</span>';
                }
            }
            console.log('Genres loaded:', genresArray.length);
        } else {
            console.warn('No genres data available or invalid format');
        }

        // Загружаем авторы
        const authorsResponse = await fetch('/api/authors');
        const authorsData = await authorsResponse.json();
        
        if (authorsResponse.ok) {
            const authorsArray = Array.isArray(authorsData) ? authorsData : (Array.isArray(authorsData.authors) ? authorsData.authors : []);
            const authorsList = document.getElementById('authors-list');
            if (authorsList) {
                if (authorsArray.length) {
                    authorsList.innerHTML = authorsArray
                        .map(a => `<label class="filter-item"><input type="checkbox" value="${escapeHtml(a.name)}" ${catalogFilters.authors.has(a.name)?'checked':''}/> ${escapeHtml(a.name)}</label>`)
                        .join('');
                } else {
                    authorsList.innerHTML = '<span class="filters-empty">Авторы отсутствуют</span>';
                }
            }
            console.log('Authors loaded:', authorsArray.length);
        } else {
            console.warn('No authors data available or invalid format');
        }
    } catch (error) {
        console.error('Error loading filters:', error);
    }
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
