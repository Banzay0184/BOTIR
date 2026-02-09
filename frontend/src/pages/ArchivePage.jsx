import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getIncomes, getOutcomes, deleteIncome, deleteOutcome, unarchiveIncome, unarchiveOutcome, canEdit, getApiErrorMessage } from '../api/api';
import IncomeDetails from '../components/IncomeDetails';
import OutcomeDetails from '../components/OutcomeDetails';
import SimpleDialog from '../components/SimpleDialog';
import Pagination from '../components/Pagination';
import { Button, Input } from '@material-tailwind/react';

/** { type: 'income' | 'outcome', item } или null */
const initialDeleteConfirm = null;
const PAGE_SIZE = 50;

const ArchivePage = () => {
    const navigate = useNavigate();
    const [archivedIncomes, setArchivedIncomes] = useState([]);
    const [archivedOutcomes, setArchivedOutcomes] = useState([]);
    const [loadingIncomes, setLoadingIncomes] = useState(true);
    const [loadingOutcomes, setLoadingOutcomes] = useState(true);
    const [totalCountIncomes, setTotalCountIncomes] = useState(0);
    const [totalCountOutcomes, setTotalCountOutcomes] = useState(0);
    const [currentPageIncomes, setCurrentPageIncomes] = useState(1);
    const [currentPageOutcomes, setCurrentPageOutcomes] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedIncome, setSelectedIncome] = useState(null);
    const [selectedOutcome, setSelectedOutcome] = useState(null);
    const [incomeModalOpen, setIncomeModalOpen] = useState(false);
    const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(initialDeleteConfirm);

    const buildFilterParams = () => {
        const params = {
            is_archive: true,
            // Порядок задаётся на бэкенде: последний добавленный в архив — первым (order_by('-archived_at', '-id'))
        };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        return params;
    };

    const fetchArchivedIncomes = async () => {
        try {
            setLoadingIncomes(true);
            const params = { ...buildFilterParams(), page: currentPageIncomes };
            const response = await getIncomes(params);
            const data = response.data;
            const results = data?.results ?? data;
            const list = Array.isArray(results) ? results : [];
            // Последний добавленный в архив — первым (новые сверху)
            const sorted = [...list].sort((a, b) => {
                const aVal = a.archived_at ? new Date(a.archived_at).getTime() : 0;
                const bVal = b.archived_at ? new Date(b.archived_at).getTime() : 0;
                return bVal - aVal || (b.id ?? 0) - (a.id ?? 0);
            });
            setArchivedIncomes(sorted);
            setTotalCountIncomes(data?.count ?? list.length);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setLoadingIncomes(false);
        }
    };

    const fetchArchivedOutcomes = async () => {
        try {
            setLoadingOutcomes(true);
            const params = { ...buildFilterParams(), page: currentPageOutcomes };
            const response = await getOutcomes(params);
            const data = response.data;
            const results = data?.results ?? data;
            const list = Array.isArray(results) ? results : [];
            // Последний добавленный в архив — первым (новые сверху)
            const sorted = [...list].sort((a, b) => {
                const aVal = a.archived_at ? new Date(a.archived_at).getTime() : 0;
                const bVal = b.archived_at ? new Date(b.archived_at).getTime() : 0;
                return bVal - aVal || (b.id ?? 0) - (a.id ?? 0);
            });
            setArchivedOutcomes(sorted);
            setTotalCountOutcomes(data?.count ?? list.length);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setLoadingOutcomes(false);
        }
    };

    useEffect(() => {
        fetchArchivedIncomes();
    }, [currentPageIncomes, searchTerm, dateFrom, dateTo]);

    useEffect(() => {
        fetchArchivedOutcomes();
    }, [currentPageOutcomes, searchTerm, dateFrom, dateTo]);

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        setCurrentPageIncomes(1);
        setCurrentPageOutcomes(1);
    };

    const handleDateFromChange = (value) => {
        setDateFrom(value);
        setCurrentPageIncomes(1);
        setCurrentPageOutcomes(1);
    };

    const handleDateToChange = (value) => {
        setDateTo(value);
        setCurrentPageIncomes(1);
        setCurrentPageOutcomes(1);
    };

    const handleViewIncome = (income) => {
        setSelectedIncome(income);
        setIncomeModalOpen(true);
    };

    const handleViewOutcome = (outcome) => {
        setSelectedOutcome(outcome);
        setOutcomeModalOpen(true);
    };

    const handleUnarchiveIncome = async (incomeId) => {
        try {
            await unarchiveIncome(incomeId);
            setArchivedIncomes((prev) => prev.filter((i) => i.id !== incomeId));
            setTotalCountIncomes((c) => Math.max(0, c - 1));
            const newLen = archivedIncomes.length - 1;
            if (newLen === 0 && currentPageIncomes > 1) {
                setCurrentPageIncomes((p) => p - 1);
            }
            toast.success('Документ разархивирован');
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleUnarchiveOutcome = async (outcomeId) => {
        try {
            await unarchiveOutcome(outcomeId);
            setArchivedOutcomes((prev) => prev.filter((o) => o.id !== outcomeId));
            setTotalCountOutcomes((c) => Math.max(0, c - 1));
            const newLen = archivedOutcomes.length - 1;
            if (newLen === 0 && currentPageOutcomes > 1) {
                setCurrentPageOutcomes((p) => p - 1);
            }
            toast.success('Документ разархивирован');
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleOpenDeleteIncome = (income) => {
        setDeleteConfirm({ type: 'income', item: income });
    };

    const handleOpenDeleteOutcome = (outcome) => {
        setDeleteConfirm({ type: 'outcome', item: outcome });
    };

    const handleCloseDeleteConfirm = () => {
        setDeleteConfirm(initialDeleteConfirm);
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirm) return;
        const { type, item } = deleteConfirm;
        try {
            if (type === 'income') {
                await deleteIncome(item.id);
                setArchivedIncomes((prev) => prev.filter((i) => i.id !== item.id));
                setTotalCountIncomes((c) => Math.max(0, c - 1));
                if (archivedIncomes.length <= 1 && currentPageIncomes > 1) {
                    setCurrentPageIncomes((p) => p - 1);
                }
            } else {
                await deleteOutcome(item.id);
                setArchivedOutcomes((prev) => prev.filter((o) => o.id !== item.id));
                setTotalCountOutcomes((c) => Math.max(0, c - 1));
                if (archivedOutcomes.length <= 1 && currentPageOutcomes > 1) {
                    setCurrentPageOutcomes((p) => p - 1);
                }
            }
            handleCloseDeleteConfirm();
            toast.success('Документ удалён');
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleIncomePageChange = (page) => setCurrentPageIncomes(page);
    const handleOutcomePageChange = (page) => setCurrentPageOutcomes(page);

    const canEditUser = canEdit();

    return (
        <div className="p-3 sm:p-4 w-full min-w-0 overflow-auto">
            <h1 className="text-xl sm:text-2xl font-bold mb-6">Архив</h1>
            <p className="text-sm text-gray-600 mb-4">
                Здесь только архивные документы. Редактирование запрещено. Доступны просмотр, разархивирование и удаление.
            </p>

            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="min-w-0 w-full">
                    <Input
                        type="text"
                        label="Поиск"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Компания, номер договора, номер счёта..."
                        className="!min-w-0"
                        containerProps={{ className: 'min-w-0' }}
                        aria-label="Поиск по компании, номеру договора или счёта"
                    />
                </div>
                <div className="min-w-0 w-full">
                    <Input
                        type="date"
                        label="Дата от"
                        value={dateFrom}
                        onChange={(e) => handleDateFromChange(e.target.value)}
                        className="!min-w-0"
                        containerProps={{ className: 'min-w-0' }}
                        aria-label="Фильтр по дате контракта от"
                    />
                </div>
                <div className="min-w-0 w-full">
                    <Input
                        type="date"
                        label="Дата до"
                        value={dateTo}
                        onChange={(e) => handleDateToChange(e.target.value)}
                        className="!min-w-0"
                        containerProps={{ className: 'min-w-0' }}
                        aria-label="Фильтр по дате контракта до"
                    />
                </div>
            </div>

            {/* Архив приходов */}
            <section className="mb-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Архив приходов</h2>
                    {!loadingIncomes && <span className="text-sm text-gray-600">Всего: {totalCountIncomes}</span>}
                </div>
                {loadingIncomes ? (
                    <div className="flex justify-center py-8">
                        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-10 w-10" />
                    </div>
                ) : archivedIncomes.length === 0 ? (
                    <p className="text-gray-500 py-4">Нет архивных приходов.</p>
                ) : (
                    <>
                    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <table className="min-w-[640px] w-full bg-white border">
                            <thead>
                                <tr>
                                    <th className="py-2 px-2 sm:px-4 border text-left text-sm">Компания</th>
                                    <th className="py-2 px-2 sm:px-4 border text-left text-sm">Дата контракта</th>
                                    <th className="py-2 px-2 sm:px-4 border text-left text-sm">Номер контракта</th>
                                    <th className="py-2 px-2 sm:px-4 border text-left text-sm">Общая сумма</th>
                                    <th className="py-2 px-2 sm:px-4 border text-left text-sm whitespace-nowrap">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {archivedIncomes.map((income) => (
                                    <tr key={income.id} className="border-b">
                                        <td className="py-2 px-2 sm:px-4 border text-sm">{income.from_company?.name}</td>
                                        <td className="py-2 px-2 sm:px-4 border text-sm whitespace-nowrap">{income.contract_date}</td>
                                        <td className="py-2 px-2 sm:px-4 border text-sm">{income.contract_number}</td>
                                        <td className="py-2 px-2 sm:px-4 border text-sm">{income.total?.toLocaleString()} сум.</td>
                                        <td className="py-2 px-2 sm:px-4 border flex flex-wrap gap-1 sm:gap-2">
                                            <Button size="sm" color="blue" onClick={() => handleViewIncome(income)} aria-label="Просмотр прихода">
                                                Просмотр
                                            </Button>
                                            {canEditUser && (
                                                <>
                                                    <Button size="sm" variant="outlined" color="gray" onClick={() => handleUnarchiveIncome(income.id)} aria-label="Разархивировать приход">
                                                        Разархивировать
                                                    </Button>
                                                    <Button size="sm" color="red" onClick={() => handleOpenDeleteIncome(income)} aria-label="Удалить приход">
                                                        Удалить
                                                    </Button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalCountIncomes > PAGE_SIZE && (
                        <Pagination
                            count={totalCountIncomes}
                            pageSize={PAGE_SIZE}
                            currentPage={currentPageIncomes}
                            onPageChange={handleIncomePageChange}
                        />
                    )}
                    </>
                )}
            </section>

            {/* Архив расходов */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Архив расходов</h2>
                    {!loadingOutcomes && <span className="text-sm text-gray-600">Всего: {totalCountOutcomes}</span>}
                </div>
                {loadingOutcomes ? (
                    <div className="flex justify-center py-8">
                        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-10 w-10" />
                    </div>
                ) : archivedOutcomes.length === 0 ? (
                    <p className="text-gray-500 py-4">Нет архивных расходов.</p>
                ) : (
                    <>
                    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <table className="min-w-[640px] w-full bg-white border">
                            <thead>
                                <tr>
                                    <th className="py-2 px-2 sm:px-4 border text-left text-sm">Компания</th>
                                    <th className="py-2 px-2 sm:px-4 border text-left text-sm">Дата контракта</th>
                                    <th className="py-2 px-2 sm:px-4 border text-left text-sm">Номер контракта</th>
                                    <th className="py-2 px-2 sm:px-4 border text-left text-sm">Общая сумма</th>
                                    <th className="py-2 px-2 sm:px-4 border text-left text-sm whitespace-nowrap">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {archivedOutcomes.map((outcome) => (
                                    <tr key={outcome.id} className="border-b">
                                        <td className="py-2 px-2 sm:px-4 border text-sm">{outcome.to_company?.name}</td>
                                        <td className="py-2 px-2 sm:px-4 border text-sm whitespace-nowrap">{outcome.contract_date}</td>
                                        <td className="py-2 px-2 sm:px-4 border text-sm">{outcome.contract_number}</td>
                                        <td className="py-2 px-2 sm:px-4 border text-sm">{outcome.total?.toLocaleString()} сум.</td>
                                        <td className="py-2 px-2 sm:px-4 border flex flex-wrap gap-1 sm:gap-2">
                                            <Button size="sm" color="blue" onClick={() => handleViewOutcome(outcome)} aria-label="Просмотр расхода">
                                                Просмотр
                                            </Button>
                                            {canEditUser && (
                                                <>
                                                    <Button size="sm" variant="outlined" color="gray" onClick={() => handleUnarchiveOutcome(outcome.id)} aria-label="Разархивировать расход">
                                                        Разархивировать
                                                    </Button>
                                                    <Button size="sm" color="red" onClick={() => handleOpenDeleteOutcome(outcome)} aria-label="Удалить расход">
                                                        Удалить
                                                    </Button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalCountOutcomes > PAGE_SIZE && (
                        <Pagination
                            count={totalCountOutcomes}
                            pageSize={PAGE_SIZE}
                            currentPage={currentPageOutcomes}
                            onPageChange={handleOutcomePageChange}
                        />
                    )}
                    </>
                )}
            </section>

            {/* Модалка подтверждения удаления */}
            <SimpleDialog
                open={Boolean(deleteConfirm)}
                onClose={handleCloseDeleteConfirm}
                size="md"
            >
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-red-700 mb-4">Удалить документ?</h3>
                    {deleteConfirm && (
                        <div className="space-y-2 text-sm text-gray-700 mb-6">
                            <p><span className="font-medium">Тип:</span> {deleteConfirm.type === 'income' ? 'Приход' : 'Расход'}</p>
                            <p><span className="font-medium">Компания:</span> {deleteConfirm.type === 'income' ? deleteConfirm.item.from_company?.name : deleteConfirm.item.to_company?.name}</p>
                            <p><span className="font-medium">Номер контракта:</span> {deleteConfirm.item.contract_number ?? '—'}</p>
                            <p><span className="font-medium">Дата контракта:</span> {deleteConfirm.item.contract_date ?? '—'}</p>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button size="md" variant="outlined" color="gray" onClick={handleCloseDeleteConfirm} aria-label="Отмена удаления">
                            Отмена
                        </Button>
                        <Button size="md" color="red" onClick={handleConfirmDelete} aria-label="Подтвердить удаление">
                            Удалить
                        </Button>
                    </div>
                </div>
            </SimpleDialog>

            {/* Модалки просмотра */}
            {selectedIncome && (
                <IncomeDetails
                    isOpen={incomeModalOpen}
                    onClose={() => { setIncomeModalOpen(false); setSelectedIncome(null); }}
                    income={selectedIncome}
                    onShowDocument={(income) => {
                        setIncomeModalOpen(false);
                        setSelectedIncome(null);
                        navigate(`/incomedocument/${income.id}`);
                    }}
                />
            )}
            {selectedOutcome && (
                <OutcomeDetails
                    isOpen={outcomeModalOpen}
                    onClose={() => { setOutcomeModalOpen(false); setSelectedOutcome(null); }}
                    outcome={selectedOutcome}
                    onShowDocument={(outcome) => {
                        setOutcomeModalOpen(false);
                        setSelectedOutcome(null);
                        navigate(`/outcomedocument/${outcome.id}`);
                    }}
                />
            )}
        </div>
    );
};

export default ArchivePage;
