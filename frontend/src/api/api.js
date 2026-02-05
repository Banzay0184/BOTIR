import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/v1';  // Adjust the URL as needed

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

// const API_URL = 'https://banzay.pythonanywhere.com/api/v1';


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
        if (user && user.accessToken) {
            config.headers['Authorization'] = 'Bearer ' + user.accessToken; // Set Authorization header
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: 401 → refresh (ROTATE_REFRESH_TOKENS) → save new access + new refresh → retry
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const user = JSON.parse(sessionStorage.getItem('user'));

            if (!user?.refreshToken) {
                return Promise.reject(error);
            }

            try {
                const { data } = await axios.post(`${API_URL}/token/refresh/`, {
                    refresh: user.refreshToken,
                });

                if (!data.access) {
                    return Promise.reject(error);
                }

                // ROTATE_REFRESH_TOKENS: сервер отдаёт новый refresh — сохраняем оба + groups для UI
                const updatedUser = {
                    ...user,
                    accessToken: data.access,
                    refreshToken: data.refresh ?? user.refreshToken,
                    ...(Array.isArray(data.groups) && { groups: data.groups }),
                    ...(typeof data.is_superuser === 'boolean' && { is_superuser: data.is_superuser }),
                };
                sessionStorage.setItem('user', JSON.stringify(updatedUser));
                originalRequest.headers['Authorization'] = `Bearer ${data.access}`;
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                console.error('Failed to refresh token:', refreshError);
                clearSessionAndRedirect();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

// API Functions

export const getCompanies = () => axiosInstance.get('/companies/');
export const createCompany = (data) => axiosInstance.post('/companies/', data);

export const getProducts = (signal) =>
    axiosInstance.get('/products/', signal ? { signal } : {});
export const createProduct = (data) => axiosInstance.post('/products/', data);

export const getProductMarkings = () => axiosInstance.get('/product-markings/');
export const createProductMarking = (data) => axiosInstance.post('/product-markings/', data);

export const getDashboardStats = (year, signal) =>
    axiosInstance.get('/stats/dashboard/', { params: year != null ? { year } : {}, ...(signal ? { signal } : {}) });

export const getIncomes = (signal, params = {}) =>
    axiosInstance.get('/incomes/', { ...(signal ? { signal } : {}), params });
export const getIncomeById = (id, signal) =>
    axiosInstance.get(`/incomes/${id}/`, signal ? { signal } : {});
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

export const getOutcomes = (params = {}, signal) =>
    axiosInstance.get('/outcomes/', { params, ...(signal ? { signal } : {}) });
export const getOutcomeById = (id, signal) =>
    axiosInstance.get(`/outcomes/${id}/`, signal ? { signal } : {});
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
                        accessToken: response.data.access,
                        refreshToken: response.data.refresh,
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
