import React, {useState, useEffect} from 'react';
import {Card, Typography, Button} from "@material-tailwind/react";
import IncomeItemList from "./IncomeItemList.jsx";
import AddIncomeModal from './AddIncomeModal.jsx';
import OutcomeCreateModal from './OutcomeCreateModal.jsx';
import Pagination from './Pagination.jsx';
import { getAvailableMarkings, canEdit, getApiErrorMessage } from '../api/api';

const TABLE_HEAD = ["ID", "Название товара", "Единица измерения", "ИКПУ", "Маркировка", "Действия"];
const PAGE_SIZE = 50;

export default function IncomeList({currentUser}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setModalOpen] = useState(false);
    const [isOutcomeModalOpen, setOutcomeModalOpen] = useState(false);
    const [selectedMarkings, setSelectedMarkings] = useState([]);
    const [markings, setMarkings] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const fetchMarkings = async () => {
            try {
                setIsLoading(true);
                const response = await getAvailableMarkings(
                    { search: searchTerm, page: currentPage }, 
                    controller.signal
                );
                if (controller.signal.aborted) return;
                
                const data = response.data;
                setMarkings(data?.results ?? []);
                setTotalCount(data?.count ?? 0);
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error('Failed to fetch markings:', getApiErrorMessage(error), error);
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };
        
        fetchMarkings();
        return () => controller.abort();
    }, [currentPage, searchTerm]);

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
        setModalOpen(false);
        // Refresh the list to show the new income
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
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
                        Общее количество товаров на складе: {totalCount || 0}
                    </Typography>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-96">
                        <div
                            className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                    </div>
                ) : (
                    <>
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
                                    markings={markings}
                                    setMarkings={setMarkings}
                                    selectedMarkings={selectedMarkings}
                                    setSelectedMarkings={setSelectedMarkings}
                                    currentUser={currentUser}
                                />
                                </tbody>
                            </table>
                        </div>
                        {totalCount > PAGE_SIZE && (
                            <Pagination
                                count={totalCount}
                                pageSize={PAGE_SIZE}
                                currentPage={currentPage}
                                onPageChange={handlePageChange}
                            />
                        )}
                    </>
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
                setMarkings={setMarkings}
            />
        </>
    );
}
