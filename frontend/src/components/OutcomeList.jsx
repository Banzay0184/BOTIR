import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Typography } from '@material-tailwind/react';
import OutcomeItemList from './OutcomeItemList.jsx';
import { getOutcomes } from '../api/api';

const TABLE_HEAD = ['ID', 'Название товара', 'Единица измерения', 'ИКПУ', 'Маркировка', 'Компания'];

const SEARCH_DEBOUNCE_MS = 350;

export default function OutcomeList() {
    const [searchTerm, setSearchTerm] = useState('');
    const [totalMarkings, setTotalMarkings] = useState(0);
    const [selectedMarkings, setSelectedMarkings] = useState([]);
    const [outcomes, setOutcomes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const debounceRef = useRef(null);

    const fetchOutcomes = useCallback(async (params = {}) => {
        try {
            setIsLoading(true);
            const response = await getOutcomes(params);
            const data = response.data?.results ?? response.data;
            setOutcomes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch outcomes:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Загрузка списка: без поиска — первая страница; при вводе маркировки — поиск на сервере (показывает и последние расходы)
    useEffect(() => {
        const term = searchTerm.trim();
        if (!term) {
            fetchOutcomes();
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchOutcomes({ marking: term });
            debounceRef.current = null;
        }, SEARCH_DEBOUNCE_MS);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchTerm, fetchOutcomes]);

    const handleUpdateMarkingCount = (count) => {
        setTotalMarkings(count);
    };

    return (
        <>
            <Card className="w-full min-h-0 overflow-hidden flex flex-col">
                <div className="p-3 sm:p-4 shrink-0">
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="p-2 border rounded w-full sm:w-48 md:w-64 min-w-0"
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
                    <div className="overflow-x-auto flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <table className="w-full min-w-[600px] table-auto text-left">
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
                    </div>
                )}
            </Card>
        </>
    );
}
