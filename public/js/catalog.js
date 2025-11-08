// Загрузка книг при открытии страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Catalog.js loaded');
    initializeCatalogEventListeners();
    loadBooks();
    loadFilters();
});

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
}

// Загрузка книг с фильтрами
async function loadBooks() {
    console.log('Loading books...');
    
    const search = document.getElementById('search-input').value.trim();
    const genreId = document.getElementById('genre-filter').value;
    const authorId = document.getElementById('author-filter').value;

    // Показываем индикатор загрузки
    document.getElementById('loading').style.display = 'block';
    document.getElementById('no-books').style.display = 'none';

    // Строим URL с параметрами
    let url = '/api/books?';
    const params = new URLSearchParams();
    
    if (search) params.append('search', search);
    if (genreId) params.append('genre_id', genreId);
    if (authorId) params.append('author_id', authorId);
    
    url += params.toString();

    try {
        const response = await fetch(url);
        const data = await response.json();

        document.getElementById('loading').style.display = 'none';

        if (response.ok) {
            console.log(`Loaded ${data.books.length} books`);
            displayBooks(data.books);
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
        
        if (genresResponse.ok && genresData.genres && Array.isArray(genresData.genres)) {
            const genreSelect = document.getElementById('genre-filter');
            genreSelect.innerHTML = '<option value="">Все жанры</option>' +
                genresData.genres.map(genre => 
                    `<option value="${genre.id}">${escapeHtml(genre.name)}</option>`
                ).join('');
            console.log('Genres loaded:', genresData.genres.length);
        } else {
            console.warn('No genres data available or invalid format');
        }

        // Загружаем авторы
        const authorsResponse = await fetch('/api/authors');
        const authorsData = await authorsResponse.json();
        
        if (authorsResponse.ok && authorsData.authors && Array.isArray(authorsData.authors)) {
            const authorSelect = document.getElementById('author-filter');
            authorSelect.innerHTML = '<option value="">Все авторы</option>' +
                authorsData.authors.map(author => 
                    `<option value="${author.id}">${escapeHtml(author.name)}</option>`
                ).join('');
            console.log('Authors loaded:', authorsData.authors.length);
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
