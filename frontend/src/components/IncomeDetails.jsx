import React, {useEffect, useState} from 'react';
import {Dialog, DialogHeader, DialogBody, DialogFooter, Button} from '@material-tailwind/react';
import {getProducts} from '../api/api';

const IncomeDetails = ({isOpen, onClose, income}) => {
    const [products, setProducts] = useState({});

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await getProducts();
                const productMap = response.data.reduce((map, product) => {
                    map[product.id] = {
                        name: product.name,
                        price: product.price
                    };
                    return map;
                }, {});
                setProducts(productMap);
            } catch (error) {
                console.error('Failed to fetch products:', error);
            }
        };

        fetchProducts();
    }, []);

    if (!income) return null;

    const handleCopy = () => {
        const markingsText = income.product_markings.map(marking => marking.marking).join('\n');
        navigator.clipboard.writeText(markingsText).then(() => {
            alert('Маркировки скопированы в буфер обмена!');
        }).catch(error => {
            console.error('Failed to copy text: ', error);
        });
    };

    return (
        <Dialog open={isOpen} handler={onClose} size="lg" className="overflow-auto">
            <DialogHeader className='flex justify-between'>
                <p>Детали дохода</p>
                <svg onClick={onClose} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                     strokeWidth={1.5} stroke="currentColor" className="size-6 cursor-pointer">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                </svg>
            </DialogHeader>
            <DialogBody className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                <div className="space-y-4">
                    <div>
                        <p><strong>Компания:</strong> {income.from_company?.name}</p>
                        <p><strong>Телефон:</strong> {income.from_company?.phone}</p>
                        <p><strong>ИНН:</strong> {income.from_company?.inn}</p>
                    </div>
                    <div>
                        <p><strong>Дата контракта:</strong> {income.contract_date}</p>
                        <p><strong>Номер контракта:</strong> {income.contract_number}</p>
                    </div>
                    <div>
                        <p><strong>Дата счета:</strong> {income.invoice_date}</p>
                        <p><strong>Номер счета:</strong> {income.invoice_number}</p>
                    </div>
                    <div>
                        <p><strong>Единица измерения:</strong> {income.unit_of_measure}</p>
                        <p><strong>Общая сумма:</strong> {income.total}</p>
                    </div>
                    <div>
                        <strong>Продукты:</strong>
                        {income.product_markings && income.product_markings.length > 0 ? (
                            <div>
                                <Button onClick={handleCopy} color="blue" size="sm">Скопировать все маркировки</Button>
                                <div className="flex flex-wrap mt-2">
                                    {income.product_markings.map((marking, index) => (
                                        <div key={index} className="border p-2 m-1">
                                            <p><strong>Маркировка:</strong> {marking.marking}</p>
                                            <p>
                                                <strong>Продукт:</strong> {products[marking.product]?.name || `Product ID ${marking.product}`}
                                            </p>
                                            <p>
                                                <strong>Цена:</strong> {products[marking.product]?.price !== undefined ? `${products[marking.product].price} руб.` : 'N/A'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p>Нет продуктов</p>
                        )}
                    </div>
                </div>
            </DialogBody>
            <DialogFooter>
                <Button onClick={onClose}>Закрыть</Button>
            </DialogFooter>
        </Dialog>
    );
};

export default IncomeDetails;
