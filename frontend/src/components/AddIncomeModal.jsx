import React, {useState, useEffect, useRef} from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import {Dialog, DialogHeader, DialogBody, DialogFooter, Button, Input} from '@material-tailwind/react';
import {LockClosedIcon} from '@heroicons/react/24/solid';
import { createIncome, updateIncome, getIncomeByIdCached, invalidateIncomeByIdCache, getCompaniesCached, getProductsSelect, getProductsSelectCachedFirstPage, checkMarkingsBatch, getApiErrorMessage } from '../api/api';
import AddCompanyModal from './AddCompanyModal';
import AddProductModal from './AddProductModal';
import * as XLSX from 'xlsx';

const emptyForm = () => ({
    from_company: { id: '', name: '', phone: '', inn: '' },
    contract_date: '',
    contract_number: '',
    invoice_date: '',
    invoice_number: '',
    unit_of_measure: '',
    total: 0,
    products: [{ id: '', name: '', kpi: '', price: '', quantity: '', markings: [] }],
});

const AddIncomeModal = ({isOpen, onClose, onAddIncome, income: editIncome, onUpdateIncome}) => {
    const isEditMode = Boolean(editIncome?.id);
    const [formData, setFormData] = useState(emptyForm());
    const initialMarkingValuesRef = useRef(new Set());

    const [companyOptions, setCompanyOptions] = useState([]);
    const [productOptions, setProductOptions] = useState([]);
    const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [manualTotal, setManualTotal] = useState(false);
    const [error, setError] = useState('');
    const [markingErrors, setMarkingErrors] = useState({});
    const [validationErrors, setValidationErrors] = useState({});
    const [fileInputKey, setFileInputKey] = useState(Date.now());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const fetchCompanies = async () => {
            try {
                const response = await getCompaniesCached();
                const options = (response.data ?? []).map(company => ({
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

        const fetchProducts = async () => {
            try {
                const response = await getProductsSelectCachedFirstPage();
                const list = response.data?.results ?? response.data ?? [];
                const options = (Array.isArray(list) ? list : []).map(product => ({
                    value: product.id,
                    label: product.name,
                    kpi: product.kpi,
                    price: product.price,
                }));
                setProductOptions((prev) => {
                    const combined = [...options];
                    prev.forEach((o) => {
                        if (!combined.some((c) => Number(c.value) === Number(o.value))) combined.push(o);
                    });
                    return combined;
                });
            } catch (err) {
                console.error('Error fetching products:', err);
            }
        };

        const run = async () => {
            await Promise.all([fetchCompanies(), fetchProducts()]);
            if (isEditMode && editIncome?.id) {
                try {
                    const res = await getIncomeByIdCached(editIncome.id);
                    const inc = res.data;
                    const productMarkings = inc.product_markings ?? [];
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
                        const writtenOff = Boolean(m.outcome);
                        byProduct[pid].markings.push({
                            marking: m.marking ?? '',
                            counter: m.counter ?? false,
                            writtenOff,
                        });
                        initialMarkingValuesRef.current.add(String(m.marking).trim());
                        byProduct[pid].quantity = byProduct[pid].markings.length;
                    });
                    const products = Object.values(byProduct);
                    const company = inc.from_company;
                    const companyOption = company && {
                        value: company.id,
                        label: company.name,
                        phone: company.phone ?? '',
                        inn: company.inn ?? '',
                    };
                    setCompanyOptions((prev) => {
                        if (!companyOption) return prev;
                        if (prev.some((o) => o.value === companyOption.value)) return prev;
                        return [...prev, companyOption];
                    });
                    setProductOptions((prev) => {
                        const next = [...prev];
                        products.forEach((p) => {
                            if (!p.id || next.some((o) => o.value === p.id)) return;
                            next.push({
                                value: p.id,
                                label: p.name,
                                kpi: p.kpi,
                                price: p.price,
                                quantity: p.quantity ?? 0,
                            });
                        });
                        return next;
                    });
                    setFormData({
                        from_company: {
                            id: company?.id ?? '',
                            name: company?.name ?? '',
                            phone: company?.phone ?? '',
                            inn: company?.inn ?? '',
                        },
                        contract_date: inc.contract_date ?? '',
                        contract_number: inc.contract_number ?? '',
                        invoice_date: inc.invoice_date ?? '',
                        invoice_number: inc.invoice_number ?? '',
                        unit_of_measure: inc.unit_of_measure ?? '',
                        total: Number(inc.total) ?? 0,
                        products: products.length ? products : [{ id: '', name: '', kpi: '', price: '', quantity: '', markings: [] }],
                    });
                    setError('');
                } catch (err) {
                    if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
                        setError(getApiErrorMessage(err));
                    }
                }
            }

            if (!isEditMode) {
                setFormData(emptyForm());
                initialMarkingValuesRef.current = new Set();
                setError('');
                setManualTotal(false);
                setFileInputKey(Date.now());
            }
        };

        run();
    }, [isOpen, isEditMode, editIncome?.id]);

    const handleCompanyChange = (selectedOption) => {
        if (!selectedOption) return;
        const selectedCompany = companyOptions.find(company => company.value === selectedOption.value);
        setFormData((prevData) => ({
            ...prevData,
            from_company: {
                id: selectedOption.value,
                name: selectedCompany?.label ?? selectedOption.label ?? '',
                phone: selectedCompany?.phone ?? '',
                inn: selectedCompany?.inn ?? '',
            },
        }));
    };

    const handleTotalChange = (e) => {
        const {value} = e.target;
        setFormData((prevData) => ({
            ...prevData,
            total: parseFloat(value),
        }));
        setManualTotal(true);
    };

    const handleProductSelect = (index, selectedOption) => {
        if (!selectedOption?.value) return;
        const newProducts = [...formData.products];
        newProducts[index] = {
            id: selectedOption.value,
            name: selectedOption.label,
            kpi: selectedOption.kpi ?? '',
            price: selectedOption.price ?? '',
            quantity: '',
            markings: [],
        };
        setFormData((prevData) => ({
            ...prevData,
            products: newProducts,
            total: manualTotal ? prevData.total : calculateTotal(newProducts),
        }));
        setFileInputKey(Date.now()); // Сброс ключа для обновления инпута файла
    };

    const handleLoadProductOptions = async (inputValue) => {
        const q = String(inputValue ?? '').trim();
        // Минимум 1 символ — чтобы не долбить API на каждый фокус.
        if (q.length < 1) return productOptions;
        try {
            const response = await getProductsSelect({ q, page: 1 });
            const list = response.data?.results ?? response.data ?? [];
            const options = (Array.isArray(list) ? list : []).map((product) => ({
                value: product.id,
                label: product.name,
                kpi: product.kpi,
                price: product.price,
            }));
            setProductOptions((prev) => {
                const combined = [...prev];
                options.forEach((o) => {
                    if (!combined.some((c) => Number(c.value) === Number(o.value))) combined.push(o);
                });
                return combined;
            });
            return options;
        } catch (err) {
            console.error('Error searching products:', err);
            return [];
        }
    };

    const handleAddProduct = () => {
        setFormData((prevData) => ({
            ...prevData,
            products: [
                ...prevData.products,
                {
                    id: '',
                    name: '',
                    kpi: '',
                    price: '',
                    quantity: '',
                    markings: [],
                },
            ],
        }));
    };

    const handleChange = (e) => {
        const {name, value} = e.target;
        if (name.startsWith('from_company.')) {
            const field = name.split('.')[1];
            setFormData((prevData) => ({
                ...prevData,
                from_company: {
                    ...prevData.from_company,
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

    const calculateTotal = (products) => {
        return products.reduce((total, product) => {
            const price = parseFloat(product.price) || 0;
            const quantity = parseInt(product.quantity, 10) || 0;
            return total + (price * quantity);
        }, 0);
    };

    const handleProductChange = (index, e) => {
        const {name, value} = e.target;
        const newProducts = [...formData.products];
        newProducts[index][name] = value;

        // Валидация поля ИКПУ (должно быть числовым)
        if (name === 'kpi') {
            if (!/^\d+$/.test(value)) {
                setValidationErrors((prevErrors) => ({
                    ...prevErrors,
                    [`kpi-${index}`]: 'ИКПУ должно содержать только цифры.',
                }));
            } else {
                setValidationErrors((prevErrors) => {
                    const {[`kpi-${index}`]: _, ...restErrors} = prevErrors;
                    return restErrors;
                });
            }
        }

        if (name === 'quantity') {
            const quantity = parseInt(value, 10) || 0;
            const current = newProducts[index].markings;
            if (isEditMode && current.length) {
                if (quantity > current.length) {
                    newProducts[index].markings = [...current, ...Array(quantity - current.length).fill(null).map(() => ({ marking: '', counter: false }))];
                } else if (quantity < current.length) {
                    let canRemove = 0;
                    for (let i = current.length - 1; i >= 0 && !current[i].writtenOff; i--) canRemove++;
                    const toRemove = Math.min(current.length - quantity, canRemove);
                    if (toRemove > 0) {
                        newProducts[index].markings = current.slice(0, current.length - toRemove);
                    }
                }
            } else {
                newProducts[index].markings = Array.from({ length: quantity }, () => ({ marking: '' }));
            }
            newProducts[index].quantity = newProducts[index].markings.length;
        }

        setFormData((prevData) => {
            const updatedData = {
                ...prevData,
                products: newProducts,
                total: manualTotal ? prevData.total : calculateTotal(newProducts),
            };
            return updatedData;
        });

        setManualTotal(false);
    };

    const handleRemoveProduct = (index) => {
        const newProducts = [...formData.products];
        newProducts.splice(index, 1);
        setFormData((prevData) => ({
            ...prevData,
            products: newProducts,
            total: manualTotal ? prevData.total : calculateTotal(newProducts),
        }));
    };


    const handleMarkingChange = (productIndex, markingIndex, e) => {
        const {value} = e.target;
        const newProducts = [...formData.products];
        if (newProducts[productIndex].markings[markingIndex].writtenOff) return;
        newProducts[productIndex].markings[markingIndex].marking = value;
        setFormData((prevData) => ({ ...prevData, products: newProducts }));
    };

    const handleRemoveMarking = (productIndex, markingIndex) => {
        const product = formData.products[productIndex];
        if (product.markings[markingIndex].writtenOff) return;
        const newProducts = [...formData.products];
        newProducts[productIndex].markings = product.markings.filter((_, i) => i !== markingIndex);
        newProducts[productIndex].quantity = newProducts[productIndex].markings.length;
        setFormData((prev) => ({ ...prev, products: newProducts, total: manualTotal ? prev.total : calculateTotal(newProducts) }));
    };

    const handleFileUpload = (event, productIndex) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, {type: 'binary'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
            const markings = jsonData.map(row => row[0]).filter(marking => marking);
            const markingCount = markings.length;

            autoFillMarkings(markings, productIndex, markingCount);
        };
        reader.readAsBinaryString(file);
    };

    const autoFillMarkings = (markingsArray, productIndex, markingCount) => {
        const newProducts = [...formData.products];
        const product = newProducts[productIndex];

        product.quantity = markingCount;

        for (let j = 0; j < product.markings.length && j < markingCount; j++) {
            product.markings[j].marking = markingsArray[j];
        }

        while (product.markings.length < markingCount) {
            product.markings.push({marking: markingsArray[product.markings.length]});
        }

        product.totalPrice = parseFloat(product.price) * markingCount;

        setFormData((prevData) => {
            const updatedData = {
                ...prevData,
                products: newProducts,
                total: calculateTotal(newProducts),
            };
            return updatedData;
        });
    };

    const checkInternalDuplicateMarkings = () => {
        const errors = {};
        const seenMarkings = new Set();

        formData.products.forEach((product, productIndex) => {
            product.markings.forEach((marking, markingIndex) => {
                if (seenMarkings.has(marking.marking)) {
                    errors[`${productIndex}-${markingIndex}`] = `Маркировка "${marking.marking}" уже добавлена в форме.`;
                } else {
                    seenMarkings.add(marking.marking);
                }
            });
        });

        setMarkingErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const checkDuplicateMarkings = async () => {
        const existingOnThisDoc = initialMarkingValuesRef.current;
        const items = [];
        formData.products.forEach((product, productIndex) => {
            product.markings.forEach((markingObj, markingIndex) => {
                const m = String(markingObj?.marking ?? '').trim();
                if (!m) return;
                if (isEditMode && existingOnThisDoc.has(m)) return;
                items.push({ marking: m, productIndex, markingIndex });
            });
        });
        if (items.length === 0) {
            setMarkingErrors({});
            return true;
        }
        try {
            const response = await checkMarkingsBatch(items.map((i) => i.marking));
            const { exists = [], duplicates = [] } = response.data ?? {};
            const errors = {};
            exists.forEach((m) => {
                items.filter((it) => it.marking === m).forEach(({ productIndex, markingIndex }) => {
                    errors[`${productIndex}-${markingIndex}`] = `Маркировка "${m}" уже существует в базе данных.`;
                });
            });
            duplicates.forEach((m) => {
                items.filter((it) => it.marking === m).forEach(({ productIndex, markingIndex }) => {
                    errors[`${productIndex}-${markingIndex}`] = `Маркировка "${m}" повторяется в форме.`;
                });
            });
            setMarkingErrors(errors);
            return Object.keys(errors).length === 0;
        } catch (error) {
            console.error('Ошибка проверки маркировок:', error);
            setError(getApiErrorMessage(error));
            return false;
        }
    };

    const filterProducts = (products) => {
        const productMap = {};

        products.forEach(product => {
            const {name, quantity} = product;

            if (!productMap[name]) {
                productMap[name] = product;
            } else if (quantity === 0) {
                productMap[name] = product;
            }
        });

        return Object.values(productMap);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Проверка на ошибки валидации
        if (Object.keys(validationErrors).length > 0) {
            setError('Исправьте ошибки в форме перед отправкой.');
            return;
        }

        // Проверка на внутренние дубликаты маркировок
        const isValidInternal = checkInternalDuplicateMarkings();
        if (!isValidInternal) {
            setError('Найдены дубликаты маркировок в форме.');
            return; // Прекращение выполнения, если есть ошибки
        }

        // Проверка на дубликаты маркировок в базе данных
        const isValid = await checkDuplicateMarkings();
        if (!isValid) {
            setError('Найдены ошибки в маркировках.');
            return; // Прекращение выполнения, если есть ошибки
        }

        const filteredProducts = filterProducts(formData.products);

        const payload = {
            ...formData,
            total: parseFloat(formData.total),
            products: filteredProducts.map(product => ({
                name: product.name,
                kpi: parseFloat(product.kpi),
                price: parseFloat(product.price),
                quantity: parseInt(product.quantity, 10),
                markings: product.markings.map(({ marking, counter }) => ({ marking, counter })),
            })),
        };

        if (!payload.from_company.name) {
            setError('Не выбрана компания.');
            return;
        }

        setIsSaving(true);
        try {
            if (isEditMode) {
                const updated = await updateIncome(editIncome.id, payload);
                invalidateIncomeByIdCache(editIncome.id);
                onUpdateIncome?.(updated);
                onClose();
            } else {
                const response = await createIncome(payload);
                onAddIncome?.(response.data);
                onClose();
            }
        } catch (error) {
            setError(getApiErrorMessage(error));
            console.error(isEditMode ? 'Error updating income:' : 'Error adding income:', error.response?.data ?? error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onClose={onClose}>
                <DialogHeader className='flex justify-between'>
                    <p>{isEditMode ? 'Редактировать приход' : 'Добавить товар'}</p>
                    <svg onClick={onClose} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                         strokeWidth={1.5} stroke="currentColor" className="size-6 cursor-pointer">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                    </svg>
                </DialogHeader>
                <DialogBody className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                    <form id='income-form' onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-center mb-4 gap-2">
                            <div className="w-full">
                                <Select
                                    className='w-[100%]'
                                    options={companyOptions}
                                    onChange={handleCompanyChange}
                                    placeholder="Выберите компанию"
                                    value={
                                        companyOptions.find((o) => Number(o.value) === Number(formData.from_company.id)) ||
                                        (formData.from_company.id && formData.from_company.name
                                            ? { value: formData.from_company.id, label: formData.from_company.name }
                                            : null)
                                    }
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 10000 }) }}
                                />
                            </div>
                            <Button
                                size='md'
                                type="button"
                                onClick={() => setIsAddCompanyModalOpen(true)}
                                color="green"
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
                                    name="from_company.phone"
                                    value={formData.from_company.phone}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="w-full">
                                <Input
                                    disabled
                                    type="text"
                                    label="ИНН компании"
                                    name="from_company.inn"
                                    value={formData.from_company.inn}
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

                        {formData.products.map((product, index) => (
                            <div key={index} className="mb-4 p-4 border rounded-lg">
                                <h1 className=' text-lg font-bold mb-4 text-blue-500 '>Продукт {index + 1}</h1>
                                <div className="flex items-center mb-2 space-x-2">
                                    <div className="w-full">
                                        <AsyncSelect
                                            className="w-[100%]"
                                            cacheOptions
                                            defaultOptions={productOptions}
                                            loadOptions={handleLoadProductOptions}
                                            onChange={(option) => handleProductSelect(index, option)}
                                            placeholder="Выберите продукт"
                                            value={
                                                productOptions.find((o) => Number(o.value) === Number(formData.products[index]?.id)) ||
                                                (formData.products[index]?.id && formData.products[index]?.name
                                                    ? { value: formData.products[index].id, label: formData.products[index].name }
                                                    : null)
                                            }
                                            menuPortalTarget={document.body}
                                            menuPosition="fixed"
                                            styles={{ menuPortal: (base) => ({ ...base, zIndex: 10000 }) }}
                                        />
                                    </div>
                                    <Button
                                        size='md'
                                        type="button"
                                        onClick={() => setIsAddProductModalOpen(true)}
                                        color="green"
                                        className=""
                                    >
                                        Добавить
                                    </Button>
                                </div>
                                <div className="flex items-center mb-2 space-x-4">
                                    <div className="w-full">
                                        <Input
                                            disabled
                                            type="text"
                                            label="ИКПУ продукта"
                                            name="kpi"
                                            value={product.kpi}
                                            onChange={(e) => handleProductChange(index, e)}
                                            required
                                        />
                                        {validationErrors[`kpi-${index}`] && (
                                            <div className="text-red-500 mt-1">
                                                {validationErrors[`kpi-${index}`]}
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-full">
                                        <Input
                                            type="text"
                                            label="Цена продукта"
                                            name="price"
                                            value={product.price}
                                            onChange={(e) => handleProductChange(index, e)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center mb-2 space-x-4">
                                    <div className="w-full">
                                        <Input
                                            type="number"
                                            label="Количество продукта"
                                            name="quantity"
                                            value={product.quantity}
                                            onChange={(e) => handleProductChange(index, e)}
                                            required
                                        />
                                    </div>
                                </div>

                                {product.markings.map((marking, markingIndex) => (
                                    <div key={markingIndex} className="mb-2">
                                        <div className="flex items-center gap-2">
                                            {marking.writtenOff && (
                                                <span className="shrink-0 text-amber-600" title="Списана, изменение запрещено">
                                                    <LockClosedIcon className="w-5 h-5" aria-hidden />
                                                </span>
                                            )}
                                            <Input
                                                type="text"
                                                label={`Маркировка ${markingIndex + 1}`}
                                                value={marking.marking}
                                                onChange={(e) => handleMarkingChange(index, markingIndex, e)}
                                                disabled={marking.writtenOff}
                                                required
                                                className="flex-1 min-w-0"
                                            />
                                            {!marking.writtenOff && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    color="red"
                                                    onClick={() => handleRemoveMarking(index, markingIndex)}
                                                    className="shrink-0"
                                                    aria-label="Удалить маркировку"
                                                >
                                                    ×
                                                </Button>
                                            )}
                                        </div>
                                        {markingErrors[`${index}-${markingIndex}`] && (
                                            <div className="text-red-500 mt-1">
                                                {markingErrors[`${index}-${markingIndex}`]}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div className="mt-2">
                                    <Input
                                        key={fileInputKey}
                                        type="file"
                                        label="Загрузить маркировки из Excel"
                                        name={`excelFile-${index}`}
                                        accept=".xlsx, .xls"
                                        onChange={(e) => handleFileUpload(e, index)}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => handleRemoveProduct(index)}
                                    color="red"
                                    size="sm"
                                    className="mt-4"
                                >
                                    Удалить
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            onClick={handleAddProduct}
                            color="blue"
                        >
                            Добавить продукт
                        </Button>
                        <div className="w-full mt-4">
                            <Input
                                type="text"
                                label="Общая сумма"
                                name="total"
                                value={formData.total.toFixed(2)}
                                onChange={handleTotalChange}
                            />
                        </div>
                    </form>
                    {error && <div className="text-red-500 mt-2 text-center">{error}</div>}
                </DialogBody>
                <DialogFooter className='flex justify-end space-x-4'>
                        <Button
                        form="income-form"
                        type="submit"
                        color="green"
                        disabled={isSaving} // Блокируем кнопку при сохранении
                    >
                        {isSaving ? (
                            <svg
                                className="animate-spin h-5 w-5 mr-3 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8z"
                                />
                            </svg>
                        ) : (
                            'Сохранить'
                        )}
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
            <AddCompanyModal
                isOpen={isAddCompanyModalOpen}
                onClose={() => setIsAddCompanyModalOpen(false)}
                onAddCompany={(newCompany) => {
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
                        from_company: {
                            id: newCompany.id,
                            name: newCompany.name,
                            phone: newCompany.phone,
                            inn: newCompany.inn,
                        },
                    }));
                }}
            />
            <AddProductModal
                isOpen={isAddProductModalOpen}
                onClose={() => setIsAddProductModalOpen(false)}
                onAddProduct={(newProduct) => {
                    setProductOptions((prevOptions) => [
                        ...prevOptions,
                        {
                            value: newProduct.id,
                            label: newProduct.name,
                            kpi: newProduct.kpi,
                            price: newProduct.price,
                        },
                    ]);
                    setFormData((prevData) => {
                        const newProducts = [...prevData.products];
                        newProducts[newProducts.length - 1] = {
                            id: newProduct.id,
                            name: newProduct.name,
                            kpi: newProduct.kpi,
                            price: newProduct.price,
                            quantity: '',
                            markings: [],
                        };
                        return {
                            ...prevData,
                            products: newProducts,
                        };
                    });
                }}
            />
        </>
    );
};

export default AddIncomeModal;
