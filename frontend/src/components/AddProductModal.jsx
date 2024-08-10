import React, {useState} from 'react';
import {Dialog, DialogHeader, DialogBody, DialogFooter, Button, Input} from '@material-tailwind/react';
import {createProduct} from '../api/api';

const AddProductModal = ({isOpen, onClose, onAddProduct}) => {
    const [productData, setProductData] = useState({
        name: '',
        kpi: '',
        price: '',
    });

    const handleChange = (e) => {
        const {name, value} = e.target;
        setProductData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await createProduct(productData);
            onAddProduct(response.data); // Pass the newly added product back to the parent component
            onClose();
        } catch (error) {
            console.error('Error adding product:', error.response?.data || error.message);
        }
    };

    return (
        <Dialog open={isOpen} handler={onClose}>
            <DialogHeader>Добавить Продукт</DialogHeader>
            <DialogBody>
                <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="text"
                        label="Название продукта"
                        name="name"
                        value={productData.name}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        type="text"
                        label="KPI продукта"
                        name="kpi"
                        value={productData.kpi}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        type="text"
                        label="Цена продукта"
                        name="price"
                        value={productData.price}
                        onChange={handleChange}
                        required
                    />
                </form>
            </DialogBody>
            <DialogFooter className=' flex justify-end items-center space-x-2'>
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
