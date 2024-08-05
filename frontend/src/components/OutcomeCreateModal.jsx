import React, {useState, useEffect} from 'react';
import Select from 'react-select';
import {Dialog, DialogHeader, DialogBody, DialogFooter, Button, Input} from '@material-tailwind/react';
import {createOutcome, getCompanies, getProducts} from '../api/api';
import AddCompanyModal from './AddCompanyModal';

const OutcomeCreateModal = ({isOpen, onClose, selectedMarkings, setSelectedMarkings, setIncomes}) => {
    const [formData, setFormData] = useState({
        to_company: {
            id: '',
            name: '',
            phone: '',
            inn: '',
        },
        contract_date: '',
        contract_number: '',
        invoice_date: '',
        invoice_number: '',
        unit_of_measure: '',
        total: 0,
    });

    const [companyOptions, setCompanyOptions] = useState([]);
    const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [products, setProducts] = useState({});
    const [manualTotal, setManualTotal] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchCompanies = async () => {
                try {
                    const response = await getCompanies();
                    const options = response.data.map(company => ({
                        value: company.id,
                        label: company.name,
                        phone: company.phone,
                        inn: company.inn,
                    }));
                    setCompanyOptions(options);
                } catch (error) {
                    console.error('Error fetching companies:', error);
                }
            };

            fetchCompanies();
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await getProducts();
                const productMap = response.data.reduce((map, product) => {
                    map[product.id] = product;
                    return map;
                }, {});
                setProducts(productMap);
            } catch (error) {
                console.error('Failed to fetch products:', error);
            }
        };

        fetchProducts();
    }, []);

    useEffect(() => {
        if (!manualTotal) {
            calculateTotal();
        }
    }, [selectedMarkings]);

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

    const calculateTotal = () => {
        const total = selectedMarkings.reduce((sum, marking) => {
            const product = products[marking.product];
            return sum + (product ? product.price : 0);
        }, 0);
        setFormData((prevData) => ({
            ...prevData,
            total: total,
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        const outcomeData = {
            ...formData,
            product_markings: selectedMarkings.map((marking) => marking.id),
        };

        console.log('Отправка данных:', outcomeData);

        if (outcomeData.product_markings.length === 0) {
            setError('Не выбрана ни одна маркировка.');
            return;
        }

        try {
            const response = await createOutcome(outcomeData);
            console.log('Outcome created successfully:', response.data);

            // Удаляем выбранные markings из списка доходов
            setIncomes((prevIncomes) =>
                prevIncomes.map((income) => ({
                    ...income,
                    product_markings: income.product_markings.filter(
                        (marking) => !selectedMarkings.some((selected) => selected.id === marking.id)
                    ),
                }))
            );

            setSelectedMarkings([]); // Сбрасываем выбранные markings
            onClose(); // Закрываем модальное окно
        } catch (error) {
            console.error('Error creating outcome:', error.response?.data || error.message);
            setError('Произошла ошибка при добавлении расхода.');
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
            <Dialog open={isOpen} handler={onClose} onClose={onClose}>
                <DialogHeader>Создать Outcome</DialogHeader>
                <DialogBody>
                    <form id="outcome-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-center mb-4">
                            <div className="w-full">
                                <Select
                                    className='w-[50%]'
                                    options={companyOptions}
                                    onChange={handleCompanyChange}
                                    placeholder="Выберите компанию"
                                    value={companyOptions.find(option => option.value === formData.to_company.id) || null}
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
                                type="number"
                                label="Общая сумма"
                                name="total"
                                value={formData.total}
                                onChange={handleTotalChange}
                            />
                        </div>
                    </form>
                    {error && <div className="text-red-500 mt-2 text-center">{error}</div>}
                </DialogBody>
                <DialogFooter>
                    <Button
                        form="outcome-form"
                        type="submit"
                        color="green"
                    >
                        Сохранить
                    </Button>
                </DialogFooter>
            </Dialog>
            <AddCompanyModal
                isOpen={isAddCompanyModalOpen}
                onClose={handleCloseAddCompanyModal}
                onAddCompany={handleAddCompany}
            />
        </>
    );
};

export default OutcomeCreateModal;
