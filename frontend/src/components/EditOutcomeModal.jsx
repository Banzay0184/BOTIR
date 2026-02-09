import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Button, Input } from '@material-tailwind/react';
import SimpleDialog from './SimpleDialog';
import { updateOutcome, getCompaniesCached, getOutcomeByIdCached, invalidateOutcomeByIdCache, getApiErrorMessage, getApiErrorDetailsAsList } from '../api/api';
import AddCompanyModal from './AddCompanyModal';

const emptyForm = () => ({
    to_company: { id: '', name: '', phone: '', inn: '' },
    contract_date: '',
    contract_number: '',
    invoice_date: '',
    invoice_number: '',
    unit_of_measure: '',
    total: 0,
    products: [],
});

const EditOutcomeModal = ({ isOpen, onClose, outcome, onUpdateOutcome }) => {
    const [formData, setFormData] = useState(emptyForm());
    const [initialMarkingIds, setInitialMarkingIds] = useState([]);
    const [companyOptions, setCompanyOptions] = useState([]);
    const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
    const [manualTotal, setManualTotal] = useState(false);
    const [error, setError] = useState('');
    const [errorDetailsList, setErrorDetailsList] = useState([]);

    useEffect(() => {
        if (!isOpen) return;

        const fetchCompanies = async () => {
            try {
                const response = await getCompaniesCached();
                const list = response.data ?? [];
                const options = list.map(company => ({
                    value: company.id,
                    label: company.name,
                    phone: company.phone,
                    inn: company.inn,
                }));
                setCompanyOptions((prev) => {
                    const combined = [...options];
                    prev.forEach((o) => {
                        if (!combined.some((c) => Number(c.value) === Number(o.value))) combined.push(o);
                    });
                    return combined;
                });
            } catch (err) {
                console.error('Error fetching companies:', err);
            }
        };

        const run = async () => {
            setFormData(emptyForm());
            setInitialMarkingIds([]);
            setError('');
            setErrorDetailsList([]);
            await fetchCompanies();
            if (outcome?.id) {
                try {
                    const res = await getOutcomeByIdCached(outcome.id);
                    const doc = res.data;
                    const productMarkings = doc?.product_markings ?? [];
                    const byProduct = {};
                    productMarkings.forEach((m) => {
                        const pid = m.product;
                        if (!byProduct[pid]) {
                            byProduct[pid] = {
                                id: pid,
                                name: m.product_name ?? '',
                                kpi: String(m.product_kpi ?? ''),
                                price: String(m.product_price ?? ''),
                                quantity: 0,
                                markings: [],
                            };
                        }
                        byProduct[pid].markings.push({ id: m.id, marking: m.marking ?? '' });
                        byProduct[pid].quantity = byProduct[pid].markings.length;
                    });
                    const products = Object.values(byProduct);
                    const company = doc.to_company;
                    setCompanyOptions((prev) => {
                        const opt = company && { value: company.id, label: company.name, phone: company.phone ?? '', inn: company.inn ?? '' };
                        if (!opt || prev.some((o) => o.value === opt.value)) return prev;
                        return [...prev, opt];
                    });
                    const markingIds = productMarkings.map((m) => m.id).filter(Boolean);
                    setInitialMarkingIds(markingIds);
                    setFormData({
                        id: doc.id,
                        to_company: {
                            id: company?.id ?? '',
                            name: company?.name ?? '',
                            phone: company?.phone ?? '',
                            inn: company?.inn ?? '',
                        },
                        contract_date: doc.contract_date ?? '',
                        contract_number: doc.contract_number ?? '',
                        invoice_date: doc.invoice_date ?? '',
                        invoice_number: doc.invoice_number ?? '',
                        unit_of_measure: doc.unit_of_measure ?? '',
                        total: Number(doc.total) ?? 0,
                        products: products.length ? products : [],
                    });
                } catch (err) {
                    if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
                        setError(getApiErrorMessage(err));
                    }
                }
            }
        };

        run();
    }, [isOpen, outcome?.id]);

    const handleCompanyChange = (selectedOption) => {
        const selectedCompany = companyOptions.find(company => company.value === selectedOption.value);
        setFormData((prevData) => ({
            ...prevData,
            to_company: {
                id: selectedOption.value,
                name: selectedCompany.label,
                phone: selectedCompany.phone,
                inn: selectedCompany.inn,
            },
        }));
    };

    const handleChange = (e) => {
        const {name, value} = e.target;
        if (name.startsWith('to_company.')) {
            const field = name.split('.')[1];
            setFormData((prevData) => ({
                ...prevData,
                to_company: {
                    ...prevData.to_company,
                    [field]: value,
                },
            }));
        } else {
            setFormData((prevData) => ({
                ...prevData,
                [name]: value,
            }));
        }
    };

    const handleTotalChange = (e) => {
        const {value} = e.target;
        setFormData((prevData) => ({
            ...prevData,
            total: parseFloat(value),
        }));
        setManualTotal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newMarkingIds = formData.products.flatMap((product) =>
            (product.markings || []).map((m) => m.id).filter(Boolean)
        );
        const initialSet = new Set(initialMarkingIds);
        const newSet = new Set(newMarkingIds);
        const added = newMarkingIds.filter((id) => !initialSet.has(id));
        const removed = initialMarkingIds.filter((id) => !newSet.has(id));
        const markingsDiffCount = added.length + removed.length;

        if (markingsDiffCount > 0) {
            const confirmed = window.confirm(
                'Вы меняете состав маркировок (добавлено/убрано). Продолжить?'
            );
            if (!confirmed) return;
        }

        const dataToSubmit = {
            ...formData,
            total: parseFloat(formData.total),
            product_markings: newMarkingIds,
        };

        if (!dataToSubmit.to_company.name) {
            setError('Не выбрана компания.');
            setErrorDetailsList([]);
            return;
        }

        setError('');
        setErrorDetailsList([]);
        try {
            const updated = await updateOutcome(dataToSubmit.id, dataToSubmit);
            invalidateOutcomeByIdCache(dataToSubmit.id);
            onUpdateOutcome(updated);
            onClose();
        } catch (err) {
            setError(getApiErrorMessage(err));
            setErrorDetailsList(getApiErrorDetailsAsList(err));
        }
    };

    const handleOpenAddCompanyModal = (e) => {
        e.stopPropagation();
        setIsAddCompanyModalOpen(true);
    };

    const handleCloseAddCompanyModal = () => {
        setIsAddCompanyModalOpen(false);
    };

    const handleAddCompany = (newCompany) => {
        setCompanyOptions((prevOptions) => [
            ...prevOptions,
            {
                value: newCompany.id,
                label: newCompany.name,
                phone: newCompany.phone,
                inn: newCompany.inn,
            },
        ]);
        setFormData((prevData) => ({
            ...prevData,
            to_company: {
                id: newCompany.id,
                name: newCompany.name,
                phone: newCompany.phone,
                inn: newCompany.inn,
            },
        }));
        handleCloseAddCompanyModal();
    };

    return (
        <>
            <SimpleDialog open={isOpen} onClose={onClose} size="lg" className="flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-blue-gray-100">
                    <p className="font-semibold text-lg">Редактировать расход</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-blue-gray-600 hover:bg-blue-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Закрыть"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                             strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)] p-4">
                    <form id='outcome-form' onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-center mb-4">
                            <div className="w-full">
                                <Select
                                    className='w-[60%]'
                                    options={companyOptions}
                                    onChange={handleCompanyChange}
                                    placeholder="Выберите компанию"
                                    value={companyOptions.find(option => option.value === formData.to_company.id) || null}
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 10000 }) }}
                                />
                            </div>
                            <Button
                                size='sm'
                                type="button"
                                onClick={handleOpenAddCompanyModal}
                                color="blue"
                                className="ml-2"
                            >
                                Добавить
                            </Button>
                        </div>
                        <div className="flex items-center mb-4 space-x-4">
                            <div className="w-full">
                                <Input
                                    disabled
                                    type="text"
                                    label="Телефон компании"
                                    name="to_company.phone"
                                    value={formData.to_company.phone}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="w-full">
                                <Input
                                    disabled
                                    type="text"
                                    label="ИНН компании"
                                    name="to_company.inn"
                                    value={formData.to_company.inn}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center mb-4 space-x-4">
                            <div className="w-full">
                                <Input
                                    type="date"
                                    label="Дата контракта"
                                    name="contract_date"
                                    value={formData.contract_date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="w-full">
                                <Input
                                    type="text"
                                    label="Номер контракта"
                                    name="contract_number"
                                    value={formData.contract_number}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex items-center mb-4 space-x-4">
                            <div className="w-full">
                                <Input
                                    type="date"
                                    label="Дата счета"
                                    name="invoice_date"
                                    value={formData.invoice_date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="w-full">
                                <Input
                                    type="text"
                                    label="Номер счета"
                                    name="invoice_number"
                                    value={formData.invoice_number}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="w-full">
                            <Input
                                type="text"
                                label="Единица измерения"
                                name="unit_of_measure"
                                value={formData.unit_of_measure}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="w-full mt-4">
                            <Input
                                type="text"
                                label="Общая сумма"
                                name="total"
                                value={formData.total.toFixed(0)}
                                onChange={handleTotalChange}
                            />
                        </div>
                        {formData.products && formData.products.length > 0 && (
                            <div className="mt-4">
                                <h2 className="text-lg font-semibold mb-2">Продукты и Маркировки</h2>
                                {formData.products.map((product, index) => (
                                    <div key={index} className="mb-4 p-4 border rounded-lg">
                                        <div>
                                            <p><strong>Название продукта:</strong> {product.name}</p>
                                            <p><strong>KPI продукта:</strong> {product.kpi}</p>
                                            <p><strong>Цена продукта:</strong> {product.price}</p>
                                            <p><strong>Количество продукта:</strong> {product.quantity}</p>
                                        </div>
                                        {product.markings && product.markings.length > 0 && (
                                            <div className="mt-2">
                                                <strong>Маркировки:</strong>
                                                {product.markings.map((marking, markingIndex) => (
                                                    <div key={markingIndex} className="ml-4">
                                                        <p>Маркировка {markingIndex + 1}: {marking.marking}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </form>
                    {error && (
                        <div className="text-red-500 mt-2 text-center">
                            <p>{error}</p>
                            {errorDetailsList.length > 0 && (
                                <ul className="list-disc list-inside text-left mt-2 text-sm" aria-label="Детали ошибки">
                                    {errorDetailsList.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex justify-end p-4 border-t border-blue-gray-100">
                    <Button
                        form="outcome-form"
                        type="submit"
                        color="green"
                    >
                        Сохранить
                    </Button>
                </div>
            </SimpleDialog>
            <AddCompanyModal
                isOpen={isAddCompanyModalOpen}
                onClose={handleCloseAddCompanyModal}
                onAddCompany={handleAddCompany}
            />
        </>
    );
};

export default EditOutcomeModal;
