import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIncomes, getOutcomes, deleteIncome, deleteOutcome, unarchiveIncome, unarchiveOutcome, canEdit } from '../api/api';
import IncomeDetails from '../components/IncomeDetails';
import OutcomeDetails from '../components/OutcomeDetails';
import { Button } from '@material-tailwind/react';

const ArchivePage = ({ currentUser }) => {
    const navigate = useNavigate();
    const [archivedIncomes, setArchivedIncomes] = useState([]);
    const [archivedOutcomes, setArchivedOutcomes] = useState([]);
    const [loadingIncomes, setLoadingIncomes] = useState(true);
    const [loadingOutcomes, setLoadingOutcomes] = useState(true);
    const [selectedIncome, setSelectedIncome] = useState(null);
    const [selectedOutcome, setSelectedOutcome] = useState(null);
    const [incomeModalOpen, setIncomeModalOpen] = useState(false);
    const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);

    const fetchArchivedIncomes = async () => {
        try {
            setLoadingIncomes(true);
            const response = await getIncomes(undefined, { is_archive: true });
            const data = response.data?.results ?? response.data;
            setArchivedIncomes(Array.isArray(data) ? [...data].reverse() : []);
        } catch (error) {
            console.error('Error fetching archived incomes:', error);
        } finally {
            setLoadingIncomes(false);
        }
    };

    const fetchArchivedOutcomes = async () => {
        try {
            setLoadingOutcomes(true);
            const response = await getOutcomes({ is_archive: true });
            const data = response.data?.results ?? response.data;
            setArchivedOutcomes(Array.isArray(data) ? [...data].reverse() : []);
        } catch (error) {
            console.error('Error fetching archived outcomes:', error);
        } finally {
            setLoadingOutcomes(false);
        }
    };

    useEffect(() => {
        fetchArchivedIncomes();
        fetchArchivedOutcomes();
    }, []);

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
        } catch (error) {
            console.error('Error unarchiving income:', error);
        }
    };

    const handleUnarchiveOutcome = async (outcomeId) => {
        try {
            await unarchiveOutcome(outcomeId);
            setArchivedOutcomes((prev) => prev.filter((o) => o.id !== outcomeId));
        } catch (error) {
            console.error('Error unarchiving outcome:', error);
        }
    };

    const handleDeleteIncome = async (incomeId) => {
        try {
            await deleteIncome(incomeId);
            setArchivedIncomes((prev) => prev.filter((i) => i.id !== incomeId));
        } catch (error) {
            console.error('Error deleting income:', error);
        }
    };

    const handleDeleteOutcome = async (outcomeId) => {
        try {
            await deleteOutcome(outcomeId);
            setArchivedOutcomes((prev) => prev.filter((o) => o.id !== outcomeId));
        } catch (error) {
            console.error('Error deleting outcome:', error);
        }
    };

    const canEditUser = canEdit();

    return (
        <div className="p-3 sm:p-4 w-full min-w-0 overflow-auto">
            <h1 className="text-xl sm:text-2xl font-bold mb-6">Архив</h1>
            <p className="text-sm text-gray-600 mb-6">
                Здесь только архивные документы. Редактирование запрещено. Доступны просмотр, разархивирование и удаление.
            </p>

            {/* Архив приходов */}
            <section className="mb-10">
                <h2 className="text-lg font-semibold mb-4">Архив приходов</h2>
                {loadingIncomes ? (
                    <div className="flex justify-center py-8">
                        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-10 w-10" />
                    </div>
                ) : archivedIncomes.length === 0 ? (
                    <p className="text-gray-500 py-4">Нет архивных приходов.</p>
                ) : (
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
                                            <Button size="sm" color="blue" onClick={() => handleViewIncome(income)}>
                                                Просмотр
                                            </Button>
                                            {canEditUser && (
                                                <>
                                                    <Button size="sm" variant="outlined" color="gray" onClick={() => handleUnarchiveIncome(income.id)}>
                                                        Разархивировать
                                                    </Button>
                                                    <Button size="sm" color="red" onClick={() => handleDeleteIncome(income.id)}>
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
                )}
            </section>

            {/* Архив расходов */}
            <section>
                <h2 className="text-lg font-semibold mb-4">Архив расходов</h2>
                {loadingOutcomes ? (
                    <div className="flex justify-center py-8">
                        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-10 w-10" />
                    </div>
                ) : archivedOutcomes.length === 0 ? (
                    <p className="text-gray-500 py-4">Нет архивных расходов.</p>
                ) : (
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
                                            <Button size="sm" color="blue" onClick={() => handleViewOutcome(outcome)}>
                                                Просмотр
                                            </Button>
                                            {canEditUser && (
                                                <>
                                                    <Button size="sm" variant="outlined" color="gray" onClick={() => handleUnarchiveOutcome(outcome.id)}>
                                                        Разархивировать
                                                    </Button>
                                                    <Button size="sm" color="red" onClick={() => handleDeleteOutcome(outcome.id)}>
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
                )}
            </section>

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
