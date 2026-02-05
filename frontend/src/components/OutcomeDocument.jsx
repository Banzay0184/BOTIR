import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOutcomes, deleteOutcome, archiveOutcome, unarchiveOutcome, canEdit } from '../api/api';
import OutcomeDetails from './OutcomeDetails';
import { Button, Input, Dialog, DialogHeader, DialogBody, DialogFooter } from '@material-tailwind/react';
import EditOutcomeModal from './EditOutcomeModal';
import {
    EyeIcon,
    PencilSquareIcon,
    TrashIcon,
    ArchiveBoxIcon,
    ArchiveBoxArrowDownIcon,
} from '@heroicons/react/24/outline';

const OutcomeDocument = ({ currentUser }) => {
    const navigate = useNavigate();
    const [outcomes, setOutcomes] = useState([]);
    const [filteredOutcomes, setFilteredOutcomes] = useState([]);
    const [selectedOutcome, setSelectedOutcome] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [outcomeToDelete, setOutcomeToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(true); // Добавляем состояние загрузки

    useEffect(() => {
        const controller = new AbortController();
        const fetchOutcomes = async () => {
            try {
                setIsLoading(true);
                const response = await getOutcomes({ is_archive: false }, controller.signal);
                if (controller.signal.aborted) return;
                const data = response.data?.results ?? response.data;
                if (Array.isArray(data)) {
                    const sortedData = [...data].reverse();
                    setOutcomes(sortedData);
                    setFilteredOutcomes(sortedData);
                } else {
                    console.error('Invalid response data:', response.data);
                }
            } catch (error) {
                if (!controller.signal.aborted) console.error('Error fetching outcomes:', error);
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };

        fetchOutcomes();
        return () => controller.abort();
    }, []);

    useEffect(() => {
        filterOutcomes();
    }, [searchTerm, startDate, endDate, outcomes]);

    const filterOutcomes = () => {
        let filteredData = outcomes;

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredData = filteredData.filter(item =>
                item.to_company?.name.toLowerCase().includes(lowercasedFilter) ||
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

        setFilteredOutcomes(filteredData);
    };

    const handleViewDetails = (outcome) => {
        setSelectedOutcome(outcome);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedOutcome(null);
        setIsModalOpen(false);
    };

    const handleEditOutcome = (outcome) => {
        setSelectedOutcome(outcome);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setSelectedOutcome(null);
        setIsEditModalOpen(false);
    };

    const handleUpdateOutcome = (updatedOutcome) => {
        setOutcomes(prevOutcomes =>
            prevOutcomes.map(outcome =>
                outcome.id === updatedOutcome?.id ? updatedOutcome : outcome
            )
        );
        setFilteredOutcomes(prevOutcomes =>
            prevOutcomes.map(outcome =>
                outcome.id === updatedOutcome?.id ? updatedOutcome : outcome
            )
        );
    };

    const openConfirmDeleteModal = (outcomeId) => {
        setOutcomeToDelete(outcomeId);
        setIsConfirmDeleteOpen(true);
    };

    const handleArchiveOutcome = async (outcomeId) => {
        try {
            await archiveOutcome(outcomeId);
            setOutcomes(prev => prev.filter(o => o.id !== outcomeId));
            setFilteredOutcomes(prev => prev.filter(o => o.id !== outcomeId));
        } catch (error) {
            console.error('Ошибка при архивации:', error);
        }
    };

    const handleUnarchiveOutcome = async (outcomeId) => {
        try {
            await unarchiveOutcome(outcomeId);
            setOutcomes(prev => prev.filter(o => o.id !== outcomeId));
            setFilteredOutcomes(prev => prev.filter(o => o.id !== outcomeId));
        } catch (error) {
            console.error('Ошибка при разархивации:', error);
        }
    };

    const handleDeleteOutcome = async () => {
        try {
            await deleteOutcome(outcomeToDelete); // Удаляем расход
            setOutcomes(prevOutcomes => prevOutcomes.filter(outcome => outcome.id !== outcomeToDelete));
            setFilteredOutcomes(prevOutcomes => prevOutcomes.filter(outcome => outcome.id !== outcomeToDelete));
            setIsConfirmDeleteOpen(false); // Закрываем модальное окно
        } catch (error) {
            console.error('Ошибка при удалении расхода:', error);
        }
    };

    return (
        <div className="p-3 sm:p-4 w-full min-w-0 overflow-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Список расходов</h2>
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="min-w-0 w-full">
                    <Input
                        type="text"
                        label="Поиск"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                        onChange={(e) => setStartDate(e.target.value)}
                        className="!min-w-0"
                        containerProps={{ className: 'min-w-0' }}
                    />
                </div>
                <div className="min-w-0 w-full">
                    <Input
                        type="date"
                        label="Дата окончания"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="!min-w-0"
                        containerProps={{ className: 'min-w-0' }}
                    />
                </div>
            </div>

            {isLoading ? (  // Отображаем анимацию загрузки, если данные загружаются
                <div className="flex justify-center items-center h-96">
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                </div>
            ) : (  // Отображаем данные, если загрузка завершена
                <div className="overflow-x-auto -mx-3 sm:-mx-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="min-w-[640px] w-full bg-white border">
                    <thead>
                    <tr>
                        <th className="py-2 px-2 sm:px-4 border text-left text-sm">Компания</th>
                        <th className="py-2 px-2 sm:px-4 border text-left text-sm">Дата контракта</th>
                        <th className="py-2 px-2 sm:px-4 border text-left text-sm">Номер контракта</th>
                        <th className="py-2 px-2 sm:px-4 border text-left text-sm">Дата счета</th>
                        <th className="py-2 px-2 sm:px-4 border text-left text-sm">Номер счета</th>
                        <th className="py-2 px-2 sm:px-4 border text-left text-sm">Общая сумма</th>
                        <th className="py-2 px-2 sm:px-4 border text-left text-sm whitespace-nowrap">Действия</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredOutcomes.map((outcome) => (
                        outcome && outcome.id ? (
                            <tr key={outcome.id} className="border-b">
                                <td className="py-2 px-2 sm:px-4 border text-sm truncate max-w-[120px] sm:max-w-none">{outcome.to_company?.name}</td>
                                <td className="py-2 px-2 sm:px-4 border text-sm whitespace-nowrap">{outcome.contract_date}</td>
                                <td className="py-2 px-2 sm:px-4 border text-sm truncate max-w-[100px] sm:max-w-none">{outcome.contract_number}</td>
                                <td className="py-2 px-2 sm:px-4 border text-sm whitespace-nowrap">{outcome.invoice_date}</td>
                                <td className="py-2 px-2 sm:px-4 border text-sm truncate max-w-[100px] sm:max-w-none">{outcome.invoice_number}</td>
                                <td className="py-2 px-2 sm:px-4 border text-sm whitespace-nowrap">{outcome.total.toLocaleString()} сум.</td>
                                <td className="py-2 px-2 sm:px-4 border">
                                    <div className="flex flex-col sm:flex-row flex-wrap gap-1 sm:gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleViewDetails(outcome)}
                                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            title="Просмотр"
                                            aria-label="Просмотр"
                                        >
                                            <EyeIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!canEdit()}
                                            onClick={() => handleEditOutcome(outcome)}
                                            className="p-2 rounded-lg text-green-600 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:pointer-events-none"
                                            title="Редактировать"
                                            aria-label="Редактировать"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                        {outcome.is_archive ? (
                                            <button
                                                type="button"
                                                disabled={!canEdit()}
                                                onClick={() => openConfirmDeleteModal(outcome.id)}
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
                                                onClick={() => handleArchiveOutcome(outcome.id)}
                                                className="p-2 rounded-lg text-orange-600 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:pointer-events-none"
                                                title="Архивировать"
                                                aria-label="Архивировать"
                                            >
                                                <ArchiveBoxIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                        {outcome.is_archive && canEdit() && (
                                            <button
                                                type="button"
                                                onClick={() => handleUnarchiveOutcome(outcome.id)}
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
                    ))}
                    </tbody>
                </table>
                </div>
            )}

            {/* Модальное окно подтверждения удаления */}
            <Dialog open={isConfirmDeleteOpen} handler={setIsConfirmDeleteOpen}>
                <DialogHeader>Подтверждение удаления</DialogHeader>
                <DialogBody divider>
                    Вы уверены, что хотите удалить этот расход? Маркировки останутся.
                </DialogBody>
                <DialogFooter>
                    <Button
                        variant="text"
                        color="red"
                        onClick={handleDeleteOutcome}
                        className="mr-1"
                    >
                        Да, удалить
                    </Button>
                    <Button
                        variant="text"
                        color="blue"
                        onClick={() => setIsConfirmDeleteOpen(false)}
                    >
                        Отмена
                    </Button>
                </DialogFooter>
            </Dialog>

            {selectedOutcome && (
                <OutcomeDetails
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    outcome={selectedOutcome}
                    onShowDocument={(outcome) => {
                        handleCloseModal();
                        navigate(`/outcomedocument/${outcome.id}`);
                    }}
                />
            )}
            {selectedOutcome && (
                <EditOutcomeModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    outcome={selectedOutcome}
                    onUpdateOutcome={handleUpdateOutcome}
                />
            )}
        </div>
    );
};

export default OutcomeDocument;
