import React, {useState} from 'react';
import {Dialog, DialogHeader, DialogBody, DialogFooter, Button, Input} from '@material-tailwind/react';
import {createProduct, getApiErrorMessage, getApiErrorDetails} from '../api/api';

const AddProductModal = ({isOpen, onClose, onAddProduct}) => {
    const [productData, setProductData] = useState({
        name: '',
        kpi: '',
        price: '',
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const {name, value} = e.target;
        setProductData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
        setErrors((prevErrors) => ({
            ...prevErrors,
            [name]: '', // Очищаем ошибку при изменении значения в поле
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await createProduct(productData);
            onAddProduct(response.data); // Передаем новый продукт обратно в родительский компонент
            onClose();
        } catch (error) {
            const details = getApiErrorDetails(error);
            if (details && typeof details === 'object' && !Array.isArray(details)) {
                const fieldErrors = {};
                for (const [key, val] of Object.entries(details)) {
                    fieldErrors[key] = Array.isArray(val) ? val[0] : String(val);
                }
                setErrors(fieldErrors);
            } else {
                setErrors({ __message: getApiErrorMessage(error) });
            }
            console.error('Ошибка при добавлении продукта:', error.response?.data ?? error.message);
        }
    };

    return (
        <Dialog open={isOpen} handler={onClose}>
            <DialogHeader>Добавить Продукт</DialogHeader>
            <DialogBody>
                <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
                    {errors.__message && (
                        <p className="text-red-500 text-sm">{errors.__message}</p>
                    )}
                    <div>
                        <Input
                            type="text"
                            label="Название продукта"
                            name="name"
                            value={productData.name}
                            onChange={handleChange}
                            required
                        />
                        {errors.name && (
                            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                        )}
                    </div>
                    <div>
                        <Input
                            type="text"
                            label="ИКПУ продукта"
                            name="kpi"
                            value={productData.kpi}
                            onChange={handleChange}
                            required
                        />
                        {errors.kpi && (
                            <p className="text-red-500 text-sm mt-1">{errors.kpi}</p>
                        )}
                    </div>
                    <div>
                        <Input
                            type="text"
                            label="Цена продукта"
                            name="price"
                            value={productData.price}
                            onChange={handleChange}
                            required
                        />
                        {errors.price && (
                            <p className="text-red-500 text-sm mt-1">Требуется действительный номер.</p>
                        )}
                    </div>
                </form>
            </DialogBody>
            <DialogFooter className='flex justify-end items-center space-x-2'>
                <Button form="product-form" type="submit" color="green">
                    Сохранить
                </Button>
                <Button
                    type="button"
                    color="red"
                    onClick={onClose}
                >
                    Отмена
                </Button>
            </DialogFooter>
        </Dialog>
    );
};

export default AddProductModal;
