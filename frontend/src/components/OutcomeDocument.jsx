import React, {useState, useEffect} from 'react';
import {getOutcomes} from '../api/api';
import OutcomeDetails from './OutcomeDetails';
import {Button, Input} from '@material-tailwind/react';
import EditOutcomeModal from './EditOutcomeModal';

const OutcomeDocument = ({currentUser}) => {
    const [outcomes, setOutcomes] = useState([]);
    const [filteredOutcomes, setFilteredOutcomes] = useState([]);
    const [selectedOutcome, setSelectedOutcome] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const fetchOutcomes = async () => {
            try {
                const response = await getOutcomes();
                if (response.data && Array.isArray(response.data)) {
                    setOutcomes(response.data.reverse());
                    setFilteredOutcomes(response.data.reverse());
                } else {
                    console.error('Invalid response data:', response.data);
                }
            } catch (error) {
                console.error('Error fetching outcomes:', error);
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
        console.log('Selected outcome:', outcome);
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
        console.log(updatedOutcome)
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
                            <td className="py-2 px-4 border">{outcome.total}</td>
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
                            </td>
                        </tr>
                    ) : null
                ))}
                </tbody>
            </table>
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
