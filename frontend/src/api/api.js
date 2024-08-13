import axios from 'axios';


// const API_URL = ' http://127.0.0.1:8000/api/v1';

const API_URL = 'https://banzay.pythonanywhere.com/api/v1';

const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});


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

export const checkMarkingExists = (marking) => {
    return axiosInstance.get(`/product-markings/check-marking/${marking}/`);
};


export const deleteMarking = async (incomeId, productId, markingId) => {
    try {
        await axiosInstance.delete(`/incomes/${incomeId}/products/${productId}/markings/${markingId}/`);
    } catch (error) {
        console.error('Error deleting marking:', error.response?.data || error.message);
        throw error;
    }
};

// Добавляем API функции для Outcome
export const getOutcomes = () => axiosInstance.get('/outcomes/');
export const createOutcome = (data) => axiosInstance.post('/outcomes/', data);

// Новая функция для обновления Income
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
        console.log('Updating outcome with data:', updatedData); // Добавьте это для отладки
        const response = await axiosInstance.put(`/outcomes/${outcomeId}/`, updatedData);
        return response.data;
    } catch (error) {
        console.error('Error updating outcome:', error.response?.data || error.message);
        throw error;
    }
};


class AuthService {
    login(username, password) {
        return axios
            .post(API_URL + '/token/', {
                username,
                password,
            })
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