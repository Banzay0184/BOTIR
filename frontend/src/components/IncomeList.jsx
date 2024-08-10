import React, {useState, useEffect} from 'react';
import {Card, Typography, Button} from "@material-tailwind/react";
import IncomeItemList from "./IncomeItemList.jsx";
import AddIncomeModal from './AddIncomeModal.jsx';
import OutcomeCreateModal from './OutcomeCreateModal.jsx';
import {getIncomes} from '../api/api';

const TABLE_HEAD = ["ID", "Название товара", "Единица измерения", "ИКПУ", "Маркировка", "Действия"];

export default function IncomeList({currentUser}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setModalOpen] = useState(false);
    const [isOutcomeModalOpen, setOutcomeModalOpen] = useState(false);
    const [totalMarkings, setTotalMarkings] = useState(0);
    const [selectedMarkings, setSelectedMarkings] = useState([]);
    const [incomes, setIncomes] = useState([]);

    useEffect(() => {
        const fetchIncomes = async () => {
            try {
                const response = await getIncomes();
                setIncomes(response.data);
            } catch (error) {
                console.error('Failed to fetch incomes:', error);
            }
        };

        fetchIncomes();
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
            <Card className="snap-y h-[100vh] w-full overflow-scroll">
                <div className="p-4">
                    <div className="space-x-4">
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="p-2 border rounded"
                        />
                        <Button
                            disabled={currentUser.position === 'Директор' || currentUser.position === 'Учредитель'}
                            color='blue'
                            onClick={toggleModal}
                        >
                            Приход
                        </Button>
                        <Button
                            color='red'
                            onClick={() => setOutcomeModalOpen(true)}
                            disabled={selectedMarkings.length === 0 || currentUser.position === 'Директор' || currentUser.position === 'Учредитель'}
                        >
                            Расход
                        </Button>
                    </div>
                    <Typography variant="small" color="blue-gray" className="font-normal mt-4">
                        Общее количество приходов: {totalMarkings || 0}
                    </Typography>
                </div>
                <table className="w-full min-w-max table-auto text-left">
                    <thead>
                    <tr>
                        {TABLE_HEAD.map((head) => (
                            <th key={head} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
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
