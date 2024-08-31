import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/v1';  // Adjust the URL as needed

const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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

// Response Interceptor to handle token refresh
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const user = JSON.parse(sessionStorage.getItem('user'));

            if (user && user.refreshToken) {
                try {
                    const response = await axios.post(`${API_URL}/token/refresh/`, {
                        refresh: user.refreshToken,
                    });

                    if (response.data.access) {
                        user.accessToken = response.data.access;
                        sessionStorage.setItem('user', JSON.stringify(user));
                        axiosInstance.defaults.headers['Authorization'] = 'Bearer ' + response.data.access;
                        originalRequest.headers['Authorization'] = 'Bearer ' + response.data.access;
                        return axiosInstance(originalRequest);
                    }
                } catch (refreshError) {
                    console.error('Failed to refresh token:', refreshError);
                    AuthService.logout();
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

// API Functions

export const getCompanies = () => axiosInstance.get('/companies/');
export const createCompany = (data) => axiosInstance.post('/companies/', data);

export const getProducts = () => axiosInstance.get('/products/');
export const createProduct = (data) => axiosInstance.post('/products/', data);

export const getProductMarkings = () => axiosInstance.get('/product-markings/');
export const createProductMarking = (data) => axiosInstance.post('/product-markings/', data);

export const getIncomes = () => axiosInstance.get('/incomes/');
export const createIncome = (data) => axiosInstance.post('/incomes/', data);

export const updateMarking = async (incomeId, productId, markingId, newMarking) => {
    try {
        const response = await axiosInstance.put(
            `/incomes/${incomeId}/products/${productId}/markings/${markingId}/`,
            {marking: newMarking}
        );
        return response.data;
    } catch (error) {
        console.error('Error updating marking:', error.response?.data || error.message);
        throw error;
    }
};

export const checkMarkingExists = (marking) => axiosInstance.get(`/product-markings/check-marking/${marking}/`);

export const getOutcomes = () => axiosInstance.get('/outcomes/');
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
        console.log('Updating outcome with data:', updatedData);
        const response = await axiosInstance.put(`/outcomes/${outcomeId}/`, updatedData);
        return response.data;
    } catch (error) {
        console.error('Error updating outcome:', error.response?.data || error.message);
        throw error;
    }
};

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

export default new AuthService();
