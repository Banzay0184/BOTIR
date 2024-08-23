import React, { useEffect, useState } from 'react';
import { Dialog, DialogHeader, DialogBody, DialogFooter, Button } from '@material-tailwind/react';
import { getProducts } from '../api/api.js';

const DocumentDialogOutcome = ({ isOpen, onClose, outcome }) => {
    const [productDetails, setProductDetails] = useState([]);

    useEffect(() => {
        const fetchProductDetails = async () => {
            try {
                const products = await getProducts(); // Fetch all products
                console.log('Fetched Products:', products.data);

                // Map each marking to its respective product and count the markings per product
                const details = outcome.product_markings.reduce((acc, marking) => {
                    const product = products.data.find((p) => p.id === marking.product);
                    if (!product) {
                        console.warn(`Product with ID ${marking.product} not found`);
                        return acc;
                    }

                    // Find if the product already exists in the acc array
                    const existingProduct = acc.find((item) => item.id === product.id);
                    if (existingProduct) {
                        existingProduct.quantity += 1; // Increment the count of markings
                    } else {
                        acc.push({
                            id: product.id,
                            product_name: product.name,
                            kpi: product.kpi,
                            price: product.price,
                            quantity: 1, // Start with one marking
                        });
                    }
                    return acc;
                }, []);

                setProductDetails(details);
            } catch (error) {
                console.error('Failed to fetch product details:', error);
            }
        };

        if (outcome && outcome.product_markings.length > 0) {
            fetchProductDetails();
        }
    }, [outcome]);

    if (!outcome) return null;

    return (
        <Dialog open={isOpen} handler={onClose} size="xl" className="overflow-auto">
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
                        <p><strong>Номер контракта:</strong> {outcome.contract_number}</p>
                        <p><strong>Дата контракта:</strong> {outcome.contract_date}</p>
                        <p><strong>Номер счета:</strong> {outcome.invoice_number}</p>
                        <p><strong>Дата счета:</strong> {outcome.invoice_date}</p>
                    </div>
                    <div className=''>
                        <p><strong>Компания:</strong> {outcome.to_company?.name}</p>
                        <p><strong>ИНН:</strong> {outcome.to_company?.inn}</p>
                        <p><strong>Телефон:</strong> {outcome.to_company?.phone}</p>
                    </div>
                    <table className="table-auto w-full mt-4 border border-gray-300">
                        <thead>
                        <tr className='bg-gray-100 border border-gray-300'>
                            <th className='text-center border border-gray-300'>№</th>
                            <th className='text-center border border-gray-300'>Название товара</th>
                            <th className='text-center border border-gray-300'>ИКПУ</th>
                            <th className='text-center border border-gray-300'>Единица измерения</th>
                            <th className='text-center border border-gray-300'>Количество маркировок</th>
                            <th className='text-center border border-gray-300'>Цена</th>
                            <th className='text-center border border-gray-300'>Общая стоимость</th>
                        </tr>
                        </thead>
                        <tbody className=''>
                        {productDetails && productDetails.length > 0 ? (
                            productDetails.map((detail, index) => (
                                <tr key={detail.id}>
                                    <td className='text-center border border-gray-300'>{index + 1}</td>
                                    <td className='text-center border border-gray-300'>{detail.product_name}</td>
                                    <td className='text-center border border-gray-300'>{detail.kpi}</td>
                                    <td className='text-center border border-gray-300'>{outcome.unit_of_measure}</td>
                                    <td className='text-center border border-gray-300'>{detail.quantity}</td>
                                    <td className='text-center border border-gray-300'>{detail.price ? detail.price.toLocaleString() : 'N/A'} сум.</td>
                                    <td className='text-center border border-gray-300'>{detail.price && detail.quantity ? (detail.price * detail.quantity).toLocaleString() : 'N/A'} сум.</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center">Нет данных о продуктах</td>
                            </tr>
                        )}
                        <tr>
                            <td colSpan="6" className="text-left font-bold">Общая стоимость всех товаров:</td>
                            <td className="font-bold text-center">{outcome.total ? outcome.total.toLocaleString() : 'N/A'} сум.</td>
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

export default DocumentDialogOutcome;
