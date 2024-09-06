import React, {useState, useEffect} from 'react';
import {Card, Typography, Button} from "@material-tailwind/react";
import OutcomeItemList from "./OutcomeItemList.jsx";
import OutcomeCreateModal from './OutcomeCreateModal.jsx';
import {getOutcomes} from '../api/api';

const TABLE_HEAD = ["ID", "Название товара", "Единица измерения", "ИКПУ", "Маркировка", "Компания"];

export default function OutcomeList() {
    const [searchTerm, setSearchTerm] = useState('');
    const [totalMarkings, setTotalMarkings] = useState(0);
    const [selectedMarkings, setSelectedMarkings] = useState([]);
    const [outcomes, setOutcomes] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Добавляем состояние для отслеживания загрузки

    useEffect(() => {
        const fetchOutcomes = async () => {
            try {
                setIsLoading(true); // Устанавливаем состояние загрузки в true перед запросом
                const response = await getOutcomes();
                setOutcomes(response.data);
            } catch (error) {
                console.error('Failed to fetch outcomes:', error);
            } finally {
                setIsLoading(false); // Устанавливаем состояние загрузки в false после завершения запроса
            }
        };

        fetchOutcomes();
    }, []);

    const handleUpdateMarkingCount = (count) => {
        setTotalMarkings(count);
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
                            className="p-2 border rounded w-1/3"
                        />
                    </div>
                    <Typography variant="small" color="blue-gray" className="font-normal mt-4">
                        Общее количество расходов: {totalMarkings || 0}
                    </Typography>
                </div>

                {isLoading ? (  // Отображаем индикатор загрузки, пока данные загружаются
                    <div className="flex justify-center items-center h-96">
                        <div
                            className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                    </div>
                ) : (  // Отображаем данные, когда загрузка завершена
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
                        <OutcomeItemList
                            searchTerm={searchTerm}
                            onUpdateMarkingCount={handleUpdateMarkingCount}
                            selectedMarkings={selectedMarkings}
                            setSelectedMarkings={setSelectedMarkings}
                            outcomes={outcomes}
                            setOutcomes={setOutcomes}
                        />
                        </tbody>
                    </table>
                )}
            </Card>
        </>
    );
}
