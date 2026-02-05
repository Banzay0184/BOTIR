import React, {useState, useEffect} from 'react';
import {Card, Typography, Button} from "@material-tailwind/react";
import IncomeItemList from "./IncomeItemList.jsx";
import AddIncomeModal from './AddIncomeModal.jsx';
import OutcomeCreateModal from './OutcomeCreateModal.jsx';
import {getIncomes, canEdit} from '../api/api';

const TABLE_HEAD = ["ID", "Название товара", "Единица измерения", "ИКПУ", "Маркировка", "Действия"];

export default function IncomeList({currentUser}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setModalOpen] = useState(false);
    const [isOutcomeModalOpen, setOutcomeModalOpen] = useState(false);
    const [totalMarkings, setTotalMarkings] = useState(0);
    const [selectedMarkings, setSelectedMarkings] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Состояние загрузки

    useEffect(() => {
        const controller = new AbortController();
        const fetchIncomes = async () => {
            try {
                setIsLoading(true);
                const response = await getIncomes(controller.signal);
                if (controller.signal.aborted) return;
                const data = response.data?.results ?? response.data;
                setIncomes(Array.isArray(data) ? data : []);
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error('Failed to fetch incomes:', error);
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };

        fetchIncomes();
        return () => controller.abort();
    }, []);

    const handleUpdateMarkingCount = (count) => {
        setTotalMarkings(count);
    };

    const toggleModal = () => {
        setModalOpen(!isModalOpen);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const handleCloseOutcomeModal = () => {
        setOutcomeModalOpen(false);
    };

    const handleAddIncome = (income) => {
        setIncomes((prevIncomes) => [...prevIncomes, income]);
        setModalOpen(false);
    };

    return (
        <>
            <Card className="w-full min-h-0 overflow-hidden flex flex-col">
                <div className="p-3 sm:p-4 shrink-0">
                    <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="p-2 border rounded w-full sm:w-48 md:w-64 min-w-0"
                        />
                        <Button
                            disabled={!canEdit()}
                            color='blue'
                            onClick={toggleModal}
                        >
                            Приход
                        </Button>
                        <Button
                            color='red'
                            onClick={() => setOutcomeModalOpen(true)}
                            disabled={selectedMarkings.length === 0 || !canEdit()}
                        >
                            Расход ({selectedMarkings.length})
                        </Button>
                    </div>
                    <Typography variant="small" color="blue-gray" className="font-normal mt-4">
                        Общее количество приходов: {totalMarkings || 0}
                    </Typography>
                </div>

                {isLoading ? (  // Показываем индикатор загрузки, пока isLoading = true
                    <div className="flex justify-center items-center h-96">
                        <div
                            className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                    </div>
                ) : (  // Показываем данные после загрузки
                    <div className="overflow-x-auto flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <table className="w-full min-w-[600px] table-auto text-left">
                        <thead>
                        <tr>
                            {TABLE_HEAD.map((head) => (
                                <th key={head} className="border-b border-blue-gray-100 bg-blue-gray-50 p-2 sm:p-4">
                                    <Typography
                                        variant="small"
                                        color="blue-gray"
                                        className="font-normal leading-none opacity-70"
                                    >
                                        {head}
                                    </Typography>
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        <IncomeItemList
                            searchTerm={searchTerm}
                            onUpdateMarkingCount={handleUpdateMarkingCount}
                            selectedMarkings={selectedMarkings}
                            setSelectedMarkings={setSelectedMarkings}
                            incomes={incomes}
                            setIncomes={setIncomes}
                            currentUser={currentUser}
                        />
                        </tbody>
                    </table>
                    </div>
                )}
            </Card>

            <AddIncomeModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onAddIncome={handleAddIncome}
            />
            <OutcomeCreateModal
                isOpen={isOutcomeModalOpen}
                onClose={handleCloseOutcomeModal}
                selectedMarkings={selectedMarkings}
                setSelectedMarkings={setSelectedMarkings}
                setIncomes={setIncomes}
            />
        </>
    );
}
