import React, {useState, useEffect} from 'react';
import {getOutcomes, deleteOutcome} from '../api/api'; // Убедитесь, что функция deleteOutcome правильно определена в вашем API файле
import OutcomeDetails from './OutcomeDetails';
import {Button, Input, Dialog, DialogHeader, DialogBody, DialogFooter} from '@material-tailwind/react';
import EditOutcomeModal from './EditOutcomeModal';

const OutcomeDocument = ({currentUser}) => {
    const [outcomes, setOutcomes] = useState([]);
    const [filteredOutcomes, setFilteredOutcomes] = useState([]);
    const [selectedOutcome, setSelectedOutcome] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false); // Состояние для управления модальным окном подтверждения удаления
    const [outcomeToDelete, setOutcomeToDelete] = useState(null); // Состояние для хранения удаляемого расхода
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(true); // Добавляем состояние загрузки

    useEffect(() => {
        const fetchOutcomes = async () => {
            try {
                setIsLoading(true); // Устанавливаем состояние загрузки
                const response = await getOutcomes();
                if (response.data && Array.isArray(response.data)) {
                    const sortedData = response.data.reverse();
                    setOutcomes(sortedData);
                    setFilteredOutcomes(sortedData);
                } else {
                    console.error('Invalid response data:', response.data);
                }
            } catch (error) {
                console.error('Error fetching outcomes:', error);
            } finally {
                setIsLoading(false); // Завершаем состояние загрузки
            }
        };

        fetchOutcomes();
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
        <div className="p-4 h-[100vh] w-full overflow-scroll">
            <h2 className="text-xl font-bold mb-4">Список расходов</h2>
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

            {isLoading ? (  // Отображаем анимацию загрузки, если данные загружаются
                <div className="flex justify-center items-center h-96">
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                </div>
            ) : (  // Отображаем данные, если загрузка завершена
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
                    {filteredOutcomes.map((outcome) => (
                        outcome && outcome.id ? (
                            <tr key={outcome.id} className="border-b">
                                <td className="py-2 px-4 border">{outcome.to_company?.name}</td>
                                <td className="py-2 px-4 border">{outcome.contract_date}</td>
                                <td className="py-2 px-4 border">{outcome.contract_number}</td>
                                <td className="py-2 px-4 border">{outcome.invoice_date}</td>
                                <td className="py-2 px-4 border">{outcome.invoice_number}</td>
                                <td className="py-2 px-4 border">{outcome.total.toLocaleString()} сум.</td>
                                <td className="py-2 px-4 border flex flex-col gap-2">
                                    <Button size="sm" color="blue" onClick={() => handleViewDetails(outcome)}>
                                        Просмотр
                                    </Button>
                                    <Button
                                        disabled={currentUser.position === 'Бухгалтер' || currentUser.position === 'Директор' || currentUser.position === 'Учредитель'}
                                        size="sm"
                                        color="green"
                                        onClick={() => handleEditOutcome(outcome)}>
                                        Редактировать
                                    </Button>
                                    <Button
                                        disabled={currentUser.position === 'Бухгалтер' || currentUser.position === 'Директор' || currentUser.position === 'Учредитель'}
                                        size="sm"
                                        color="red"
                                        onClick={() => openConfirmDeleteModal(outcome.id)} // Открываем модальное окно подтверждения удаления
                                    >
                                        Удалить
                                    </Button>
                                </td>
                            </tr>
                        ) : null
                    ))}
                    </tbody>
                </table>
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
