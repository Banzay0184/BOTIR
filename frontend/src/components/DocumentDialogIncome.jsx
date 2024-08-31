import React, {useEffect, useState} from 'react';
import {Dialog, DialogHeader, DialogBody, DialogFooter, Button} from '@material-tailwind/react';
import {getProducts} from '../api/api';  // Импортируем функцию для получения данных о продукте

const DocumentDialogIncome = ({isOpen, onClose, income}) => {
    const [productDetails, setProductDetails] = useState([]);

    useEffect(() => {
        const fetchProductDetails = async () => {
            try {
                const products = await getProducts(); // Получаем все продукты
                const details = income.product_markings.map((marking) => {
                    const product = products.data.find((p) => p.id === marking.product);
                    if (!product) {
                        return null;
                    }
                    return {
                        id: product.id,
                        product_name: product.name,
                        kpi: product.kpi,
                        price: product.price,
                        quantity: product.quantity,
                    };
                });

                // Удаляем дубликаты по ID продукта
                const uniqueDetails = details.filter((detail, index, self) =>
                    index === self.findIndex((d) => d && d.id === detail.id)
                );

                setProductDetails(uniqueDetails);
            } catch (error) {
                console.error('Failed to fetch product details:', error);
            }
        };

        if (income && income.product_markings.length > 0) {
            fetchProductDetails();
        }
    }, [income]);

    if (!income) return null;

    return (
        <Dialog open={isOpen} handler={onClose} size="xl" className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
            <DialogHeader className='flex justify-between'>
                <p>Документ</p>
                <svg onClick={onClose} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                     strokeWidth={1.5} stroke="currentColor" className="size-6 cursor-pointer">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                </svg>
            </DialogHeader>
            <DialogBody className="overflow-auto">
                <div className="space-y-4">
                    <div>
                        <p><strong>Номер контракта:</strong> {income.contract_number}</p>
                        <p><strong>Дата контракта:</strong> {income.contract_date}</p>
                        <p><strong>Номер счета:</strong> {income.invoice_number}</p>
                        <p><strong>Дата счета:</strong> {income.invoice_date}</p>
                    </div>
                    <div className=''>
                        <p><strong>Компания:</strong> {income.from_company?.name}</p>
                        <p><strong>ИНН:</strong> {income.from_company?.inn}</p>
                        <p><strong>Телефон:</strong> {income.from_company?.phone}</p>
                    </div>
                    <table className="table-auto w-full mt-4 border border-gray-300">
                        <thead>
                        <tr className='bg-gray-100 border border-gray-300'>
                            <th className='text-center border border-gray-300'>№</th>
                            <th className='text-center border border-gray-300' >Название товара</th>
                            <th className='text-center border border-gray-300' >ИКПУ</th>
                            <th className='text-center border border-gray-300' >Единица измерения</th>
                            <th className='text-center border border-gray-300'>Количество</th>
                            <th className='text-center border border-gray-300'>Цена</th>
                            <th className='text-center border border-gray-300'>Общая стоимость</th>
                        </tr>
                        </thead>
                        <tbody className=' '>
                        {productDetails && productDetails.length > 0 ? (
                            productDetails.map((detail, index) => (
                                <tr key={detail.id}>
                                    <td className='text-center border border-gray-300' >{index + 1}</td>
                                    <td className='text-center border border-gray-300'>{detail.product_name}</td>
                                    <td className='text-center border border-gray-300'>{detail.kpi}</td>
                                    <td className='text-center border border-gray-300'>{income.unit_of_measure}</td>
                                    <td className='text-center border border-gray-300'>{detail.quantity}</td>
                                    <td className='text-center border border-gray-300'>{detail.price ? detail.price.toLocaleString() : 'N/A'} cум.</td>
                                    <td className='text-center border border-gray-300'>{detail.price && detail.quantity ? (detail.price * detail.quantity).toLocaleString() : 'N/A'} cум.</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center">Нет данных о продуктах</td>
                            </tr>
                        )}
                        <tr>
                            <td colSpan="4" className="text-left font-bold">Общая стоимость всех товаров:</td>
                            <td className="font-bold text-center">
                                {productDetails && productDetails.length > 0
                                    ? productDetails.reduce((total, detail) => {
                                    if (detail.quantity) {
                                        return total + detail.quantity;
                                    }
                                    return total;
                                }, 0).toLocaleString() + ' шт.'
                                    : 'N/A'}
                            </td>
                            <td></td>
                            <td className="font-bold text-center">{income.total ? income.total.toLocaleString() : 'N/A'} cум.</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </DialogBody>
            <DialogFooter>
                <Button onClick={onClose}>Закрыть</Button>
            </DialogFooter>
        </Dialog>
    );
};

export default DocumentDialogIncome;
