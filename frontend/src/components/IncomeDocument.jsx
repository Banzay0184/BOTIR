import React, {useState, useEffect} from 'react';
import {getIncomes} from '../api/api';
import IncomeDetails from './IncomeDetails';
import {Button, Input} from '@material-tailwind/react';
import EditIncomeModal from './EditIncomeModal';

const IncomeDocument = ({currentUser}) => {
    const [incomes, setIncomes] = useState([]);
    const [filteredIncomes, setFilteredIncomes] = useState([]);
    const [selectedIncome, setSelectedIncome] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const fetchIncomes = async () => {
            try {
                const response = await getIncomes();
                if (response.data && Array.isArray(response.data)) {
                    setIncomes(response.data);
                    setFilteredIncomes(response.data);
                    console.log(response.data)
                } else {
                    console.error('Invalid response data:', response.data);
                }
            } catch (error) {
                console.error('Error fetching incomes:', error);
            }
        };

        fetchIncomes();
    }, []);

    useEffect(() => {
        filterIncomes();
    }, [searchTerm, startDate, endDate, incomes]);

    const filterIncomes = () => {
        let filteredData = incomes;

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredData = filteredData.filter(item =>
                item.from_company?.name.toLowerCase().includes(lowercasedFilter) ||
                item.contract_date.toLowerCase().includes(lowercasedFilter) ||
                item.contract_number.toLowerCase().includes(lowercasedFilter) ||
                item.invoice_date.toLowerCase().includes(lowercasedFilter) ||
                item.invoice_number.toLowerCase().includes(lowercasedFilter) ||
                item.total.toString().toLowerCase().includes(lowercasedFilter)
            );
        }

        if (startDate) {
            filteredData = filteredData.filter(item => item.contract_date >= startDate);
        }

        if (endDate) {
            filteredData = filteredData.filter(item => item.contract_date <= endDate);
        }

        setFilteredIncomes(filteredData);
    };

    const handleViewDetails = (income) => {
        console.log('Selected income:', income);
        setSelectedIncome(income);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedIncome(null);
        setIsModalOpen(false);
    };

    const handleEditIncome = (income) => {
        setSelectedIncome(income);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setSelectedIncome(null);
        setIsEditModalOpen(false);
    };

    const handleUpdateIncome = (updatedIncome) => {
        console.log(updatedIncome)
        setIncomes(prevIncomes =>
            prevIncomes.map(income =>
                income.id === updatedIncome?.id ? updatedIncome : income
            )
        );
        setFilteredIncomes(prevIncomes =>
            prevIncomes.map(income =>
                income.id === updatedIncome?.id ? updatedIncome : income
            )
        );
    };

    return (
        <div className="p-4 h-[100vh] w-full overflow-scroll">
            <h2 className="text-xl font-bold mb-4">Список приходов</h2>
            <div className="mb-4 flex space-x-4">
                <Input
                    type="text"
                    label="Поиск"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Поиск по компании, дате контракта, номеру контракта и т.д."
                />
                <Input
                    type="date"
                    label="Дата начала"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                    type="date"
                    label="Дата окончания"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
            </div>
            <table className="min-w-full bg-white border">
                <thead>
                <tr>
                    <th className="py-2 px-4 border">Компания</th>
                    <th className="py-2 px-4 border">Дата контракта</th>
                    <th className="py-2 px-4 border">Номер контракта</th>
                    <th className="py-2 px-4 border">Дата счета</th>
                    <th className="py-2 px-4 border">Номер счета</th>
                    <th className="py-2 px-4 border">Общая сумма</th>
                    <th className="py-2 px-4 border">Действия</th>
                </tr>
                </thead>
                <tbody>
                {filteredIncomes.map((income) => (
                    income && income.id ? (
                        <tr key={income.id} className="border-b">
                            <td className="py-2 px-4 border">{income.from_company?.name}</td>
                            <td className="py-2 px-4 border">{income.contract_date}</td>
                            <td className="py-2 px-4 border">{income.contract_number}</td>
                            <td className="py-2 px-4 border">{income.invoice_date}</td>
                            <td className="py-2 px-4 border">{income.invoice_number}</td>
                            <td className="py-2 px-4 border">{income.total}</td>
                            <td className="py-2 px-4 border flex flex-col gap-2">
                                <Button size="sm" color="blue" onClick={() => handleViewDetails(income)}>
                                    Просмотр
                                </Button>
                                <Button
                                    disabled={currentUser.position === 'Бухгалтер' || currentUser.position === 'Директор' ? true : false}
                                    size="sm"
                                    color="green"
                                    onClick={() => handleEditIncome(income)}>
                                    Редактировать
                                </Button>
                            </td>
                        </tr>
                    ) : null
                ))}
                </tbody>
            </table>
            {selectedIncome && (
                <IncomeDetails
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    income={selectedIncome}
                />
            )}
            {selectedIncome && (
                <EditIncomeModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    income={selectedIncome}
                    onUpdateIncome={handleUpdateIncome}
                />
            )}
        </div>
    );
};

export default IncomeDocument;
