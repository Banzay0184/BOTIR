import React, {useState, useEffect} from 'react';
import Select from 'react-select';
import {Dialog, DialogHeader, DialogBody, DialogFooter, Button, Input} from '@material-tailwind/react';
import {createIncome, getCompanies, getProducts, checkMarkingExists} from '../api/api'; // Добавьте функцию проверки маркировок
import AddCompanyModal from './AddCompanyModal';
import AddProductModal from './AddProductModal';

const AddIncomeModal = ({isOpen, onClose, onAddIncome}) => {
    const [formData, setFormData] = useState({
        from_company: {
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
        products: [
            {
                id: '',
                name: '',
                kpi: '',
                price: '',
                quantity: '',
                markings: [],
            },
        ],
    });

    const [companyOptions, setCompanyOptions] = useState([]);
    const [productOptions, setProductOptions] = useState([]);
    const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [manualTotal, setManualTotal] = useState(false);
    const [error, setError] = useState('');
    const [markingErrors, setMarkingErrors] = useState({});

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

            const fetchProducts = async () => {
                try {
                    const response = await getProducts();
                    const filteredProducts = response.data.filter(product => product.quantity === 0);
                    const options = filteredProducts.map(product => ({
                        value: product.id,
                        label: product.name,
                        kpi: product.kpi,
                        price: product.price,
                        quantity: product.quantity,
                    }));
                    setProductOptions(options);
                } catch (error) {
                    console.error('Error fetching products:', error);
                }
            };

            fetchCompanies();
            fetchProducts();
        }
    }, [isOpen]);

    const handleCompanyChange = (selectedOption) => {
        const selectedCompany = companyOptions.find(company => company.value === selectedOption.value);
        setFormData((prevData) => ({
            ...prevData,
            from_company: {
                id: selectedOption.value,
                name: selectedCompany.label,
                phone: selectedCompany.phone,
                inn: selectedCompany.inn,
            },
        }));
    };

    const handleProductSelect = async (index, selectedProductId) => {
        const selectedProduct = productOptions.find(product => product.value === selectedProductId);

        if (selectedProduct) {
            const newProducts = [...formData.products];
            newProducts[index] = {
                id: selectedProduct.value,
                name: selectedProduct.label,
                kpi: selectedProduct.kpi,
                price: selectedProduct.price,
                quantity: '',
                markings: [],
            };
            setFormData((prevData) => ({
                ...prevData,
                products: newProducts,
                total: manualTotal ? prevData.total : calculateTotal(newProducts),
            }));
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

    const handleAddNewProduct = (newProduct) => {
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
        setIsAddProductModalOpen(false);
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

        if (name === 'quantity') {
            const quantity = parseInt(value, 10);
            newProducts[index].markings = Array.from({length: quantity}, (_, i) => ({
                marking: '',
            }));
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

    const handleMarkingChange = (productIndex, markingIndex, e) => {
        const {value} = e.target;
        const newProducts = [...formData.products];
        newProducts[productIndex].markings[markingIndex].marking = value;
        setFormData((prevData) => ({
            ...prevData,
            products: newProducts,
        }));
    };

    const handleRemoveProduct = (index) => {
        setFormData((prevData) => {
            const updatedProducts = prevData.products.filter((_, i) => i !== index);
            return {
                ...prevData,
                products: updatedProducts,
                total: calculateTotal(updatedProducts),
            };
        });

        setManualTotal(false);
    };

    const handleTotalChange = (e) => {
        const {value} = e.target;
        setFormData((prevData) => ({
            ...prevData,
            total: parseFloat(value),
        }));
        setManualTotal(true);
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

    // Функция проверки дубликатов маркировок
    const checkDuplicateMarkings = async () => {
        const errors = {};
        for (let i = 0; i < formData.products.length; i++) {
            for (let j = 0; j < formData.products[i].markings.length; j++) {
                const marking = formData.products[i].markings[j].marking;
                if (marking) { // Проверяем, что поле маркировки не пустое
                    try {
                        const response = await checkMarkingExists(marking); // Ваша функция для проверки маркировки
                        if (response.data.exists) {
                            errors[`${i}-${j}`] = `Маркировка "${marking}" уже существует.`;
                        }
                    } catch (error) {
                        console.error('Ошибка проверки маркировки:', error);
                    }
                }
            }
        }
        setMarkingErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Проверяем дубликаты маркировок
        const isValid = await checkDuplicateMarkings();
        if (!isValid) {
            setError('Найдены ошибки в маркировках.');
            return;
        }

        // Фильтруем продукты перед отправкой на сервер
        const filteredProducts = filterProducts(formData.products);

        const dataToSubmit = {
            ...formData,
            total: parseFloat(formData.total),
            products: filteredProducts.map(product => ({
                name: product.name,
                kpi: parseFloat(product.kpi),
                price: parseFloat(product.price),
                quantity: parseInt(product.quantity, 10),
                markings: product.markings,
            })),
        };

        if (!dataToSubmit.from_company.name) {
            setError('Не выбрана компания.');
            return;
        }

        try {
            const response = await createIncome(dataToSubmit);
            console.log('Income created successfully:', response.data);
            onAddIncome(response.data);  // Уведомляем родительский компонент
            onClose();
        } catch (error) {
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                if (errorData.non_field_errors) {
                    setError(errorData.non_field_errors[0]);
                } else {
                    setError('Произошла ошибка при добавлении дохода.');
                }
            } else {
                setError('Произошла ошибка при добавлении дохода.');
            }
            console.error('Error adding income:', error.response?.data || error.message);
        }
    };

    const handleOpenAddCompanyModal = (e) => {
        e.stopPropagation();
        setIsAddCompanyModalOpen(true);
    };

    const handleCloseAddCompanyModal = () => {
        setIsAddCompanyModalOpen(false);
    };

    const handleOpenAddProductModal = (e) => {
        e.stopPropagation();
        setIsAddProductModalOpen(true);
    };

    const handleCloseAddProductModal = () => {
        setIsAddProductModalOpen(false);
    };

    return (
        <>
            <Dialog open={isOpen} onClose={onClose}>
                <DialogHeader className='flex justify-between'>
                    <p>Добавить товар</p>
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
                                    value={companyOptions.find(option => option.value === formData.from_company.id) || null}
                                />
                            </div>
                            <Button
                                size='md'
                                type="button"
                                onClick={handleOpenAddCompanyModal}
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
                                <div className="flex items-center mb-2 space-x-2">
                                    <div className="w-full">
                                        <Select
                                            className="w-[100%]"
                                            options={productOptions}
                                            onChange={(option) => handleProductSelect(index, option.value)}
                                            placeholder="Выберите продукт"
                                            value={productOptions.find(option => option.value === formData.products[index].id) || null}
                                        />
                                    </div>
                                    <Button
                                        size='md'
                                        type="button"
                                        onClick={handleOpenAddProductModal}
                                        color="green"
                                        className=""
                                    >
                                        Добавить
                                    </Button>
                                </div>
                                <div className="flex items-center mb-2 space-x-4">
                                    <div className="w-full">
                                        <Input
                                            type="text"
                                            label="ИКПУ продукта"
                                            name="kpi"
                                            value={product.kpi}
                                            onChange={(e) => handleProductChange(index, e)}
                                            required
                                        />
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
                                        <Input
                                            type="text"
                                            label={`Маркировка ${markingIndex + 1}`}
                                            value={marking.marking}
                                            onChange={(e) => handleMarkingChange(index, markingIndex, e)}
                                            required
                                        />
                                        {markingErrors[`${index}-${markingIndex}`] && (
                                            <div className="text-red-500 mt-1">
                                                {markingErrors[`${index}-${markingIndex}`]}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    onClick={() => handleRemoveProduct(index)}
                                    color="red"
                                    size="sm"
                                    className=""
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
                    {error && <div className="text-red-500 mt-2 text-center">{error}</div>} {/* Error display */}
                </DialogBody>
                <DialogFooter className=' flex justify-end space-x-4 '>
                    <Button
                        form="income-form"
                        type="submit"
                        color="green"
                    >
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
            <AddCompanyModal
                isOpen={isAddCompanyModalOpen}
                onClose={handleCloseAddCompanyModal}
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
                onClose={handleCloseAddProductModal}
                onAddProduct={handleAddNewProduct}
            />
        </>
    );
};

export default AddIncomeModal;
