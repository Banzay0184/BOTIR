import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getOutcomeById } from '../api/api';

/** Собирает строки таблицы товаров из product_markings (данные приходят с API: product_name, product_kpi, product_price). */
const buildProductDetailsFromMarkings = (productMarkings) => {
    if (!Array.isArray(productMarkings) || productMarkings.length === 0) return [];
    const byProduct = {};
    for (const m of productMarkings) {
        const productId = m.product ?? m.product_id;
        if (productId == null) continue;
        if (!byProduct[productId]) {
            byProduct[productId] = {
                id: productId,
                product_name: m.product_name ?? '—',
                kpi: m.product_kpi ?? '—',
                price: m.product_price,
                quantity: 0,
            };
        }
        byProduct[productId].quantity += 1;
    }
    return Object.values(byProduct);
};

const OutcomeDocumentViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [outcome, setOutcome] = useState(null);
    const [productDetails, setProductDetails] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await getOutcomeById(id, controller.signal);
                if (controller.signal.aborted) return;
                const doc = response.data;
                setOutcome(doc);
                setProductDetails(buildProductDetailsFromMarkings(doc?.product_markings ?? []));
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(err.response?.status === 404 ? 'Документ не найден' : 'Ошибка загрузки');
                }
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };

        if (id) fetchData();
        return () => controller.abort();
    }, [id]);

    const handleBack = () => navigate(-1);

    if (isLoading) {
        return (
            <div className="w-full min-w-0 h-full overflow-auto p-4 flex items-center justify-center">
                <p className="text-blue-gray-500">Загрузка...</p>
            </div>
        );
    }

    if (error || !outcome) {
        return (
            <div className="w-full min-w-0 h-full overflow-auto p-4">
                <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 mb-4 text-blue-gray-700 hover:text-blue-gray-900 font-medium"
                    aria-label="Назад"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                    Назад
                </button>
                <p className="text-red-500">{error || 'Документ не найден'}</p>
            </div>
        );
    }

    return (
        <div className="w-full min-w-0 h-full overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 text-blue-gray-700 hover:text-blue-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-gray-300 rounded"
                    aria-label="Назад"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                    Назад
                </button>

                <header>
                    <h1 className="text-2xl font-bold text-blue-gray-900">Документ расхода</h1>
                    <p className="mt-1 text-sm text-blue-gray-500">№ контракта: {outcome.contract_number}</p>
                </header>

                <section className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-blue-gray-800">
                        <div>
                            <h2 className="text-sm font-semibold text-blue-gray-500 uppercase tracking-wide mb-2">Контракт и счёт</h2>
                            <p><span className="text-blue-gray-500">Номер контракта:</span> {outcome.contract_number}</p>
                            <p><span className="text-blue-gray-500">Дата контракта:</span> {outcome.contract_date}</p>
                            <p><span className="text-blue-gray-500">Номер счета:</span> {outcome.invoice_number}</p>
                            <p><span className="text-blue-gray-500">Дата счета:</span> {outcome.invoice_date}</p>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-blue-gray-500 uppercase tracking-wide mb-2">Компания</h2>
                            <p><span className="text-blue-gray-500">Название:</span> {outcome.to_company?.name ?? '—'}</p>
                            <p><span className="text-blue-gray-500">ИНН:</span> {outcome.to_company?.inn ?? '—'}</p>
                            <p><span className="text-blue-gray-500">Телефон:</span> {outcome.to_company?.phone ?? '—'}</p>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold text-blue-gray-500 uppercase tracking-wide mb-3">Товары</h2>
                        <div className="overflow-x-auto rounded-lg border border-blue-gray-200" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <table className="table-auto w-full text-left">
                                <thead>
                                    <tr className="bg-blue-gray-50 text-blue-gray-700 text-sm">
                                        <th className="px-4 py-3 font-medium">№</th>
                                        <th className="px-4 py-3 font-medium">Название товара</th>
                                        <th className="px-4 py-3 font-medium">ИКПУ</th>
                                        <th className="px-4 py-3 font-medium">Ед. изм.</th>
                                        <th className="px-4 py-3 font-medium text-right">Кол-во маркировок</th>
                                        <th className="px-4 py-3 font-medium text-right">Цена</th>
                                        <th className="px-4 py-3 font-medium text-right">Сумма</th>
                                    </tr>
                                </thead>
                                <tbody className="text-blue-gray-800 divide-y divide-blue-gray-100">
                                    {productDetails.length > 0 ? (
                                        productDetails.map((detail, index) => (
                                            <tr key={detail.id} className="hover:bg-blue-gray-50/50">
                                                <td className="px-4 py-3">{index + 1}</td>
                                                <td className="px-4 py-3">{detail.product_name}</td>
                                                <td className="px-4 py-3">{detail.kpi ?? '—'}</td>
                                                <td className="px-4 py-3">{outcome.unit_of_measure ?? '—'}</td>
                                                <td className="px-4 py-3 text-right">{detail.quantity ?? '—'}</td>
                                                <td className="px-4 py-3 text-right">{detail.price != null ? detail.price.toLocaleString() : '—'} сум.</td>
                                                <td className="px-4 py-3 text-right">{detail.price != null && detail.quantity != null ? (detail.price * detail.quantity).toLocaleString() : '—'} сум.</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-6 text-center text-blue-gray-500 text-sm">В документе нет товаров</td>
                                        </tr>
                                    )}
                                    <tr className="bg-blue-gray-50/80 font-semibold">
                                        <td colSpan="4" className="px-4 py-3">Итого</td>
                                        <td className="px-4 py-3 text-right">
                                            {productDetails.length > 0
                                                ? productDetails.reduce((total, detail) => total + (detail.quantity || 0), 0).toLocaleString() + ' шт.'
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3" />
                                        <td className="px-4 py-3 text-right">{outcome.total != null ? outcome.total.toLocaleString() : '—'} сум.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default OutcomeDocumentViewPage;
