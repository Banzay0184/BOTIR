import React, {useState, useEffect} from 'react';
import {Dialog, DialogHeader, DialogBody, DialogFooter, Button} from '@material-tailwind/react';
import {getProducts} from '../api/api';
import DocumentDialogOutcome from "./DocumentDialogOutcome.jsx";

const OutcomeDetails = ({isOpen, onClose, outcome}) => {
    const [products, setProducts] = useState({});
    const [showDocument, setShowDocument] = useState(false); // Состояние для отображения документа

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

    if (!outcome) return null;

    const handleCopy = (markings) => {
        const markingsText = markings.join('\n');
        navigator.clipboard.writeText(markingsText).then(() => {
            alert('Маркировки скопированы в буфер обмена!');
        }).catch(error => {
            console.error('Failed to copy text: ', error);
        });
    };

    const groupedMarkings = outcome.product_markings.reduce((acc, marking) => {
        const productName = products[marking.product]?.name || `Product ID ${marking.product}`;
        if (!acc[productName]) {
            acc[productName] = [];
        }
        acc[productName].push(marking.marking);
        return acc;
    }, {});

    return (
        <Dialog open={isOpen} handler={onClose} size="lg" className="overflow-auto">
            <DialogHeader className='flex justify-between'>
                <p>Детали расхода</p>
                <svg onClick={onClose} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                     strokeWidth={1.5} stroke="currentColor" className="size-6 cursor-pointer">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                </svg>
            </DialogHeader>
            <DialogBody className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                <div className="space-y-4">
                    <div>
                        <p><strong>Компания:</strong> {outcome.to_company?.name}</p>
                        <p><strong>Телефон:</strong> {outcome.to_company?.phone}</p>
                        <p><strong>ИНН:</strong> {outcome.to_company?.inn}</p>
                    </div>
                    <div>
                        <p><strong>Дата контракта:</strong> {outcome.contract_date}</p>
                        <p><strong>Номер контракта:</strong> {outcome.contract_number}</p>
                    </div>
                    <div>
                        <p><strong>Дата счета:</strong> {outcome.invoice_date}</p>
                        <p><strong>Номер счета:</strong> {outcome.invoice_number}</p>
                    </div>
                    <div>
                        <p><strong>Единица измерения:</strong> {outcome.unit_of_measure}</p>
                        <p><strong>Общая сумма:</strong> {outcome.total.toLocaleString()} сум</p>
                    </div>
                    <div>
                        <strong>Продукты и маркировки:</strong>
                        {Object.keys(groupedMarkings).length > 0 ? (
                            <div className="flex flex-wrap mt-2">
                                {Object.entries(groupedMarkings).map(([productName, markings], index) => (
                                    <div key={index} className="border p-2 m-1 w-full">
                                        <div className="flex justify-between">
                                            <p><strong>Продукт:</strong> {productName}</p>
                                            <div className="flex flex-col items-end text-black">
                                                {markings.map((marking, idx) => (
                                                    <p key={idx}> {marking}</p>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-2">
                                            <Button
                                                onClick={() => handleCopy(markings)}
                                                color="blue"
                                                size="sm"
                                            >
                                                Скопировать маркировки
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>Нет продуктов</p>
                        )}
                    </div>
                    <div>
                        <p><strong>Добавил(а) доход:</strong> {outcome.added_by ? outcome.added_by : 'Неизвестно'}</p>
                    </div>
                </div>
                <Button
                    color="green"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowDocument(true)}
                >
                    Показать документ
                </Button>
            </DialogBody>
            <DialogFooter>
                <Button onClick={onClose}>Закрыть</Button>
            </DialogFooter>

            {/* Использование отдельного компонента DocumentDialogIncomeIcome */}
            <DocumentDialogOutcome isOpen={showDocument} onClose={() => setShowDocument(false)} outcome={outcome}/>
        </Dialog>
    );
};

export default OutcomeDetails;
