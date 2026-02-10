import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/v1';  // Adjust the URL as needed
// const API_URL = 'https://banzay.pythonanywhere.com/api/v1';

// Единый формат ошибок API: { error: { code, message, details } }
// Упрощает тосты, локализацию и логирование.
export const getApiError = (err) => {
    const data = err?.response?.data;
    if (data?.error && typeof data.error === 'object') {
        return {
            code: data.error.code ?? 'ERROR',
            message: data.error.message ?? 'Произошла ошибка',
            details: data.error.details ?? null,
        };
    }
    const detail = data?.detail;
    const message = Array.isArray(detail) ? detail[0] : (typeof detail === 'string' ? detail : null);
    return {
        code: 'ERROR',
        message: message || (err?.message ?? 'Ошибка сети'),
        details: data ?? null,
    };
};

export const getApiErrorMessage = (err) => getApiError(err).message;
export const getApiErrorCode = (err) => getApiError(err).code;
export const getApiErrorDetails = (err) => getApiError(err).details;

const MAX_DETAIL_ITEMS = 10;

/**
 * Для VALIDATION_ERROR и подобных: details может быть объектом с массивами строк
 * (например product_markings: ["Маркировка уже списана: X", ...]).
 * Возвращает плоский список строк (первые MAX_DETAIL_ITEMS) для отображения списком в UI.
 */
export const getApiErrorDetailsAsList = (err) => {
    const details = getApiError(err).details;
    if (details == null || typeof details !== 'object') return [];
    const list = [];
    for (const value of Object.values(details)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                if (typeof item === 'string') list.push(item);
                if (list.length >= MAX_DETAIL_ITEMS) return list;
            }
        }
    }
    return list;
};


const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Вспомогательная функция выхода (используется в интерцепторе до определения AuthService)
const clearSessionAndRedirect = () => {
    sessionStorage.removeItem('user');
    window.location.href = '/';
};

// Add Axios Interceptors

// Request Interceptor to add JWT token to headers
axiosInstance.interceptors.request.use(
    (config) => {
        const user = JSON.parse(sessionStorage.getItem('user')); // Retrieve user data from sessionStorage
        if (user && user.access) {
            config.headers['Authorization'] = 'Bearer ' + user.access; // Set Authorization header
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/** Один refresh на всех: если refresh уже идёт — остальные ждут его, не запуская новый. */
let refreshPromise = null;

// Response Interceptor: 401 → single-flight refresh (raw axios) → retry; на логин только при 401/400 token invalid
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }
        originalRequest._retry = true;
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (!user?.refresh) {
            return Promise.reject(error);
        }

        if (!refreshPromise) {
            refreshPromise = (async () => {
                try {
                    const { data } = await axios.post(`${API_URL}/token/refresh/`, {
                        refresh: user.refresh,
                    });
                    if (!data.access) throw new Error('No access token in refresh response');
                    const updatedUser = {
                        ...user,
                        access: data.access,
                        refresh: data.refresh ?? user.refresh,
                        ...(Array.isArray(data.groups) && { groups: data.groups }),
                        ...(typeof data.is_superuser === 'boolean' && { is_superuser: data.is_superuser }),
                    };
                    sessionStorage.setItem('user', JSON.stringify(updatedUser));
                    return data.access;
                } catch (refreshError) {
                    const status = refreshError.response?.status;
                    const isTokenInvalid = status === 401 || status === 400;
                    if (isTokenInvalid) {
                        console.error('Refresh token invalid or expired:', refreshError.response?.data ?? refreshError);
                        clearSessionAndRedirect();
                    } else {
                        console.error('Failed to refresh token (network/5xx):', refreshError.message ?? refreshError);
                    }
                    throw refreshError;
                } finally {
                    refreshPromise = null;
                }
            })();
        }

        try {
            const newAccess = await refreshPromise;
            originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
            return axiosInstance(originalRequest);
        } catch (refreshErr) {
            return Promise.reject(refreshErr);
        }
    }
);

// API Functions
// Контракт: list — (params = {}, signal), getById — (id, signal). Не путать порядок аргументов.

export const getCompanies = () => axiosInstance.get('/companies/');

let _companiesCache = null;
let _companiesPromise = null;

/**
 * Список компаний с кэшем (один запрос на сессию, без дубликатов при повторном открытии модалки).
 * Сброс кэша: после createCompany или перезагрузка страницы.
 */
export const getCompaniesCached = async () => {
    if (Array.isArray(_companiesCache) && _companiesCache.length > 0) return { data: _companiesCache };
    if (_companiesPromise) return _companiesPromise;
    _companiesPromise = getCompanies()
        .then((res) => {
            const raw = res.data;
            const list = Array.isArray(raw) ? raw : (raw?.results ?? []);
            _companiesCache = Array.isArray(list) ? list : [];
            return { data: _companiesCache };
        })
        .finally(() => {
            _companiesPromise = null;
        });
    return _companiesPromise;
};

export const invalidateCompaniesCache = () => {
    _companiesCache = null;
    _companiesPromise = null;
};

export const createCompany = (data) => axiosInstance.post('/companies/', data).then((res) => {
    invalidateCompaniesCache();
    return res;
});

/** Список товаров. Контракт list: (params, signal). */
export const getProducts = (params = {}, signal) =>
    axiosInstance.get('/products/', { params, ...(signal ? { signal } : {}) });

/** Список товаров с пагинацией. (params, signal). */
export const getProductsPaginated = (params = {}, signal) =>
    axiosInstance.get('/products/', { params, ...(signal ? { signal } : {}) });

/** Список товаров для селектов. (params, signal), params: { q, page }. */
export const getProductsSelect = (params = {}, signal) =>
    axiosInstance.get('/products/select/', { params, ...(signal ? { signal } : {}) });

let _productsSelectFirstPageCache = null;
let _productsSelectFirstPagePromise = null;

/**
 * Первая страница products/select с кэшем (для модалки прихода — без повторного запроса при открытии).
 */
export const getProductsSelectCachedFirstPage = async (signal) => {
    if (_productsSelectFirstPageCache != null) return { data: _productsSelectFirstPageCache };
    if (_productsSelectFirstPagePromise) return _productsSelectFirstPagePromise;
    _productsSelectFirstPagePromise = getProductsSelect({ page: 1 }, signal)
        .then((res) => {
            _productsSelectFirstPageCache = res.data;
            return { data: _productsSelectFirstPageCache };
        })
        .finally(() => {
            _productsSelectFirstPagePromise = null;
        });
    return _productsSelectFirstPagePromise;
};

export const invalidateProductsSelectFirstPageCache = () => {
    _productsSelectFirstPageCache = null;
    _productsSelectFirstPagePromise = null;
};

/** Загрузить все страницы товаров в один массив (для выпадающих списков и карт товаров). */
export const getProductsAllPages = async (signal) => {
    const all = [];
    let page = 1;
    let hasNext = true;
    while (hasNext) {
        const config = { params: { page } };
        if (signal) config.signal = signal;
        const response = await axiosInstance.get('/products/', config);
        const data = response.data;
        const results = data?.results ?? (Array.isArray(data) ? data : []);
        all.push(...results);
        hasNext = Boolean(data?.next);
        page += 1;
    }
    return all;
};

// Кэш товаров, чтобы не делать 20+ запросов в нескольких компонентах одновременно.
let _allProductsCache = null;
let _allProductsPromise = null;

/**
 * Товары одним списком с кэшем.
 * Важно: используется для UI (списки/маппинг id->name). Данные обновляются после перезагрузки страницы.
 */
export const getAllProductsCached = async (signal) => {
    if (Array.isArray(_allProductsCache)) return _allProductsCache;
    if (_allProductsPromise) return _allProductsPromise;

    _allProductsPromise = (async () => {
        const list = await getProductsAllPages(signal);
        _allProductsCache = Array.isArray(list) ? list : [];
        return _allProductsCache;
    })().finally(() => {
        _allProductsPromise = null;
    });

    return _allProductsPromise;
};

export const createProduct = (data) => axiosInstance.post('/products/', data);

export const getProductMarkings = () => axiosInstance.get('/product-markings/');
export const createProductMarking = (data) => axiosInstance.post('/product-markings/', data);

/** Список доступных маркировок (склад). (params, signal), params: { search, page }. */
export const getAvailableMarkings = (params = {}, signal) =>
    axiosInstance.get('/product-markings/available/', { 
        params, 
        ...(signal ? { signal } : {}) 
    });

/** Список приходов. (params, signal). */
export const getIncomes = (params = {}, signal) =>
    axiosInstance.get('/incomes/', { params, ...(signal ? { signal } : {}) });
/** Один приход по id. (id, signal). */
export const getIncomeById = (id, signal) =>
    axiosInstance.get(`/incomes/${id}/`, signal ? { signal } : {});

const _incomeByIdCache = { id: null, data: null, ts: 0 };
const INCOME_BY_ID_CACHE_TTL_MS = 3000;

/**
 * Кэш на несколько секунд, чтобы при двойном вызове эффекта (StrictMode) не дублировать GET /incomes/:id/.
 */
export const getIncomeByIdCached = async (id, signal) => {
    const now = Date.now();
    if (_incomeByIdCache.id === id && _incomeByIdCache.data != null && now - _incomeByIdCache.ts < INCOME_BY_ID_CACHE_TTL_MS) {
        return { data: _incomeByIdCache.data };
    }
    const res = await getIncomeById(id, signal);
    _incomeByIdCache.id = id;
    _incomeByIdCache.data = res.data;
    _incomeByIdCache.ts = Date.now();
    return res;
};

export const invalidateIncomeByIdCache = (id) => {
    if (id == null || _incomeByIdCache.id === id) {
        _incomeByIdCache.id = null;
        _incomeByIdCache.data = null;
        _incomeByIdCache.ts = 0;
    }
};

export const createIncome = (data) => axiosInstance.post('/incomes/', data);

export const updateMarking = async (incomeId, productId, markingId, newMarking, newMarkingCounter) => {
    try {
        const response = await axiosInstance.put(
            `/incomes/${incomeId}/products/${productId}/markings/${markingId}/`,
            {marking: newMarking, counter: newMarkingCounter}
        );
        return response.data;
    } catch (error) {
        console.error('Error updating marking:', error.response?.data || error.message);
        throw error;
    }
};

export const checkMarkingExists = (marking) => axiosInstance.get(`/product-markings/check-marking/${marking}/`);

/**
 * Проверка маркировок пачкой. Один запрос вместо N.
 * Body: { markings: string[] }
 * Response: { exists: string[], duplicates: string[] }
 */
export const checkMarkingsBatch = (markings) =>
    axiosInstance.post('/product-markings/check/', { markings });

/** Список расходов. (params, signal). */
export const getOutcomes = (params = {}, signal) =>
    axiosInstance.get('/outcomes/', { params, ...(signal ? { signal } : {}) });
/** Один расход по id. (id, signal). */
export const getOutcomeById = (id, signal) =>
    axiosInstance.get(`/outcomes/${id}/`, signal ? { signal } : {});

const _outcomeByIdCache = { id: null, data: null, ts: 0 };
const OUTCOME_BY_ID_CACHE_TTL_MS = 3000;
/** Один запрос на id: при двойном вызове (например Strict Mode) возвращаем тот же промис. */
let _outcomeByIdInFlight = null;

export const getOutcomeByIdCached = async (id, signal) => {
    const now = Date.now();
    if (_outcomeByIdCache.id === id && _outcomeByIdCache.data != null && now - _outcomeByIdCache.ts < OUTCOME_BY_ID_CACHE_TTL_MS) {
        return { data: _outcomeByIdCache.data };
    }
    if (_outcomeByIdInFlight && _outcomeByIdInFlight.id === id) {
        return _outcomeByIdInFlight.promise;
    }
    const promise = getOutcomeById(id, signal)
        .then((res) => {
            _outcomeByIdCache.id = id;
            _outcomeByIdCache.data = res.data;
            _outcomeByIdCache.ts = Date.now();
            return res;
        })
        .finally(() => {
            if (_outcomeByIdInFlight && _outcomeByIdInFlight.id === id) _outcomeByIdInFlight = null;
        });
    _outcomeByIdInFlight = { id, promise };
    return promise;
};

export const invalidateOutcomeByIdCache = (id) => {
    if (id == null || _outcomeByIdCache.id === id) {
        _outcomeByIdCache.id = null;
        _outcomeByIdCache.data = null;
        _outcomeByIdCache.ts = 0;
    }
    if (id == null || (_outcomeByIdInFlight && _outcomeByIdInFlight.id === id)) {
        _outcomeByIdInFlight = null;
    }
};

export const createOutcome = (data) => axiosInstance.post('/outcomes/', data);

export const updateIncome = async (incomeId, updatedData) => {
    try {
        const response = await axiosInstance.put(`/incomes/${incomeId}/`, updatedData);
        return response.data;
    } catch (error) {
        console.error('Error updating income:', error.response?.data || error.message);
        throw error;
    }
};

export const updateOutcome = async (outcomeId, updatedData) => {
    try {
        const response = await axiosInstance.put(`/outcomes/${outcomeId}/`, updatedData);
        return response.data;
    } catch (error) {
        console.error('Error updating outcome:', error.response?.data || error.message);
        throw error;
    }
};

export const archiveIncome = (incomeId) => axiosInstance.post(`/incomes/${incomeId}/archive/`);
export const unarchiveIncome = (incomeId) => axiosInstance.post(`/incomes/${incomeId}/unarchive/`);
export const archiveOutcome = (outcomeId) => axiosInstance.post(`/outcomes/${outcomeId}/archive/`);
export const unarchiveOutcome = (outcomeId) => axiosInstance.post(`/outcomes/${outcomeId}/unarchive/`);

export const deleteMarking = async (incomeId, productId, markingId) => {
    try {
        const response = await axiosInstance.delete(
            `/incomes/${incomeId}/products/${productId}/markings/${markingId}/`
        );
        return response.data;
    } catch (error) {
        console.error('Error deleting marking:', error.response?.data || error.message);
        throw error;
    }
};

export const deleteOutcome = async (outcomeId) => {
    try {
        const response = await axiosInstance.delete(`/outcomes/${outcomeId}/`);
        return response.data;
    } catch (error) {
        console.error('Error deleting outcome:', error.response?.data || error.message);
        throw error;
    }
};


export const deleteIncome = async (incomeId) => {
    try {
        const response = await axiosInstance.delete(`/incomes/${incomeId}/`);
        return response.data;
    } catch (error) {
        console.error('Error deleting income:', error.response?.data || error.message);
        throw error;
    }
};

// Admin API (только для пользователей в группе admin)
export const getAdminUsers = () => axiosInstance.get('/admin/users/');
export const getAdminUser = (id) => axiosInstance.get(`/admin/users/${id}/`);
export const createAdminUser = (data) => axiosInstance.post('/admin/users/', data);
export const updateAdminUser = (id, data) => axiosInstance.patch(`/admin/users/${id}/`, data);
export const getAdminRoles = () => axiosInstance.get('/admin/roles/');
export const adminResetPassword = (userId, newPassword) =>
    axiosInstance.post('/admin/reset-password/', { user_id: userId, new_password: newPassword });


class AuthService {
    login(username, password) {
        return axios.post(API_URL + '/token/', {username, password})
            .then(response => {
                if (response.data.access) {
                    const user = {
                        access: response.data.access,
                        refresh: response.data.refresh,
                        username: response.data.username,
                        firstName: response.data.first_name,
                        lastName: response.data.last_name,
                        email: response.data.email,
                        phone: response.data.phone,
                        position: response.data.position,
                        groups: response.data.groups ?? [],
                        is_superuser: Boolean(response.data.is_superuser),
                    };
                    sessionStorage.setItem('user', JSON.stringify(user));
                    return user;
                }
            });
    }

    logout() {
        sessionStorage.removeItem('user');
        return Promise.resolve();
    }

    register(username, password, email, first_name, last_name, phone, position) {
        return axios.post(API_URL + '/register/', {
            username,
            password,
            email,
            first_name,
            last_name,
            phone,
            position,
        });
    }

    getCurrentUser() {
        return JSON.parse(sessionStorage.getItem('user'));
    }
}

// Helpers: права по группам (только для UI; сервер проверяет по request.user.groups)
export const getGroups = () => {
    try {
        const user = JSON.parse(sessionStorage.getItem('user'));
        return Array.isArray(user?.groups) ? user.groups : [];
    } catch {
        return [];
    }
};

export const isAdmin = () => {
    try {
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (user?.is_superuser) return true;
    } catch {
        // ignore
    }
    return getGroups().includes('admin');
};

export const canEdit = () => {
    try {
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (user?.is_superuser) return true;
    } catch {
        // ignore
    }
    const groups = getGroups();
    return groups.includes('admin') || groups.includes('operator');
};

export default new AuthService();
