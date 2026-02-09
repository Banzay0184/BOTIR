import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getIncomes, deleteIncome, archiveIncome, unarchiveIncome, canEdit, getApiErrorMessage } from '../api/api';
import IncomeDetails from './IncomeDetails';
import { Button, Input } from '@material-tailwind/react';
import AddIncomeModal from './AddIncomeModal';
import Pagination from './Pagination';
import {
    EyeIcon,
    PencilSquareIcon,
    TrashIcon,
    ArchiveBoxIcon,
    ArchiveBoxArrowDownIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE = 50;

const IncomeDocument = ({ currentUser }) => {
    const navigate = useNavigate();
    const [incomes, setIncomes] = useState([]);
    const [selectedIncome, setSelectedIncome] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const fetchIncomes = async () => {
            try {
                setIsLoading(true);
                const params = {
                    is_archive: false,
                    page: currentPage,
                };
                
                if (searchTerm) params.search = searchTerm;
                if (startDate) params.date_from = startDate;
                if (endDate) params.date_to = endDate;

                const response = await getIncomes(params, controller.signal);
                if (controller.signal.aborted) return;
                
                const data = response.data;
                const results = data?.results ?? [];
                const list = Array.isArray(results) ? results : [];
                setIncomes(list);
                setTotalCount(data?.count ?? list.length);
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error('Error fetching incomes:', getApiErrorMessage(error), error);
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };

        fetchIncomes();
        return () => controller.abort();
    }, [currentPage, searchTerm, startDate, endDate]);

    const handleViewDetails = (income) => {
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
        if (!updatedIncome?.id) return;
        setIncomes(prev => prev.map(income =>
            income.id === updatedIncome.id ? updatedIncome : income
        ));
    };

    const handleArchiveIncome = async (incomeId) => {
        try {
            await archiveIncome(incomeId);
            // Убираем из списка, т.к. он стал архивным
            setIncomes(prev => prev.filter(i => i.id !== incomeId));
            setTotalCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Ошибка при архивации:', error);
        }
    };

    const handleUnarchiveIncome = async (incomeId) => {
        try {
            await unarchiveIncome(incomeId);
            setIncomes(prev => prev.filter(i => i.id !== incomeId));
            setTotalCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Ошибка при разархивации:', error);
        }
    };

    const handleDeleteIncome = async (incomeId) => {
        try {
            await deleteIncome(incomeId);
            setIncomes(prev => prev.filter(income => income.id !== incomeId));
            setTotalCount(prev => Math.max(0, prev - 1));
            toast.success('Приход удалён');
        } catch (error) {
            console.error('Ошибка при удалении дохода:', error);
            toast.error(getApiErrorMessage(error));
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        setCurrentPage(1); // Сброс на первую страницу при поиске
    };

    const handleStartDateChange = (value) => {
        setStartDate(value);
        setCurrentPage(1);
    };

    const handleEndDateChange = (value) => {
        setEndDate(value);
        setCurrentPage(1);
    };

    return (
        <div className="p-3 sm:p-4 w-full min-w-0 overflow-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold">Список приходов</h2>
                <span className="text-sm text-gray-600">Всего: {totalCount}</span>
            </div>
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="min-w-0 w-full">
                    <Input
                        type="text"
                        label="Поиск"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Компания, контракт, счёт..."
                        className="!min-w-0"
                        containerProps={{ className: 'min-w-0' }}
                    />
                </div>
                <div className="min-w-0 w-full">
                    <Input
                        type="date"
                        label="Дата начала"
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="!min-w-0"
                        containerProps={{ className: 'min-w-0' }}
                    />
                </div>
                <div className="min-w-0 w-full">
                    <Input
                        type="date"
                        label="Дата окончания"
                        value={endDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        className="!min-w-0"
                        containerProps={{ className: 'min-w-0' }}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-96">
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto -mx-3 sm:-mx-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <table className="min-w-[640px] w-full bg-white border">
                            <thead>
                            <tr>
                                <th className="py-2 px-2 sm:px-4 border text-left text-sm">Компания</th>
                                <th className="py-2 px-2 sm:px-4 border text-left text-sm">Дата контракта</th>
                                <th className="py-2 px-2 sm:px-4 border text-left text-sm">Номер контракта</th>
                                <th className="py-2 px-2 sm:px-4 border text-left text-sm whitespace-nowrap">Создан</th>
                                <th className="py-2 px-2 sm:px-4 border text-left text-sm">Дата счета</th>
                                <th className="py-2 px-2 sm:px-4 border text-left text-sm">Номер счета</th>
                                <th className="py-2 px-2 sm:px-4 border text-left text-sm">Общая сумма</th>
                                <th className="py-2 px-2 sm:px-4 border text-left text-sm whitespace-nowrap">Действия</th>
                            </tr>
                            </thead>
                            <tbody>
                            {incomes.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-4 text-center text-gray-500">
                                        Нет приходов
                                    </td>
                                </tr>
                            ) : (
                                incomes.map((income) => (
                                    income && income.id ? (
                                        <tr key={income.id} className="border-b">
                                            <td className="py-2 px-2 sm:px-4 border text-sm truncate max-w-[120px] sm:max-w-none">{income.from_company?.name}</td>
                                            <td className="py-2 px-2 sm:px-4 border text-sm whitespace-nowrap">{income.contract_date}</td>
                                            <td className="py-2 px-2 sm:px-4 border text-sm truncate max-w-[100px] sm:max-w-none">{income.contract_number}</td>
                                            <td className="py-2 px-2 sm:px-4 border text-sm whitespace-nowrap">
                                                {income.created_at ? new Date(income.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                                            </td>
                                            <td className="py-2 px-2 sm:px-4 border text-sm whitespace-nowrap">{income.invoice_date}</td>
                                            <td className="py-2 px-2 sm:px-4 border text-sm truncate max-w-[100px] sm:max-w-none">{income.invoice_number}</td>
                                            <td className="py-2 px-2 sm:px-4 border text-sm whitespace-nowrap">{income.total.toLocaleString()} сум.</td>
                                            <td className="py-2 px-2 sm:px-4 border">
                                                <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewDetails(income)}
                                                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        title="Просмотр"
                                                        aria-label="Просмотр"
                                                    >
                                                        <EyeIcon className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!canEdit()}
                                                        onClick={() => handleEditIncome(income)}
                                                        className="p-2 rounded-lg text-green-600 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:pointer-events-none"
                                                        title="Редактировать"
                                                        aria-label="Редактировать"
                                                    >
                                                        <PencilSquareIcon className="w-5 h-5" />
                                                    </button>
                                                    {income.is_archive ? (
                                                        <button
                                                            type="button"
                                                            disabled={!canEdit()}
                                                            onClick={() => handleDeleteIncome(income.id)}
                                                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:pointer-events-none"
                                                            title="Удалить"
                                                            aria-label="Удалить"
                                                        >
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={!canEdit()}
                                                            onClick={() => handleArchiveIncome(income.id)}
                                                            className="p-2 rounded-lg text-orange-600 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:pointer-events-none"
                                                            title="Архивировать"
                                                            aria-label="Архивировать"
                                                        >
                                                            <ArchiveBoxIcon className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                    {income.is_archive && canEdit() && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUnarchiveIncome(income.id)}
                                                            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                                            title="Разархивировать"
                                                            aria-label="Разархивировать"
                                                        >
                                                            <ArchiveBoxArrowDownIcon className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : null
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                    {totalCount > 0 && (
                        <Pagination
                            count={totalCount}
                            pageSize={PAGE_SIZE}
                            currentPage={currentPage}
                            onPageChange={handlePageChange}
                        />
                    )}
                </>
            )}

            {selectedIncome && (
                <IncomeDetails
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    income={selectedIncome}
                    onShowDocument={(income) => {
                        handleCloseModal();
                        navigate(`/incomedocument/${income.id}`);
                    }}
                />
            )}
            {selectedIncome && (
                <AddIncomeModal
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
