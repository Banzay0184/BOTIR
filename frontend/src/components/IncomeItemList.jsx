import React, {useState, useEffect} from 'react';
import {Typography} from '@material-tailwind/react';
import { updateMarking, deleteMarking, getProductsAllPages, canEdit } from '../api/api';
import MarkingEditModal from './MarkingEditModal.jsx';

const IncomeItemList = ({
                            searchTerm,
                            onUpdateMarkingCount,
                            selectedMarkings,
                            setSelectedMarkings,
                            incomes,
                            setIncomes,
                            currentUser,
                        }) => {
    const [selectedMarking, setSelectedMarking] = useState(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [products, setProducts] = useState({});
    const [markingToDelete, setMarkingToDelete] = useState(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const list = await getProductsAllPages();
                const productMap = (Array.isArray(list) ? list : []).reduce((map, product) => {
                    map[product.id] = { name: product.name, kpi: product.kpi };
                    return map;
                }, {});
                setProducts(productMap);
            } catch (error) {
                console.error('Failed to fetch products:', error);
            }
        };

        fetchProducts();
    }, []);

    const filteredIncomes = incomes.flatMap((income) =>
        (income.product_markings || []).filter(
            (marking) =>
                !marking.outcome &&
                (marking.marking.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (products[marking.product]?.name || '')
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()))
        ).map((marking) => ({
            ...marking,
            productName: products[marking.product]
                ? products[marking.product].name
                : `Product ID ${marking.product}`,
            kpi: products[marking.product]
                ? products[marking.product].kpi
                : 'No KPI',
            unitOfMeasure: income.unit_of_measure,
            incomeId: income.id,
            productId: marking.product,
        }))
    );

    useEffect(() => {
        onUpdateMarkingCount(filteredIncomes.length);
    }, [filteredIncomes, onUpdateMarkingCount]);

    const handleMarkingChange = async (markingId, newMarking, newMarkingCounter) => {
        if (!selectedMarking) return;


        try {
            await updateMarking(
                selectedMarking.incomeId,
                selectedMarking.productId,
                markingId,
                newMarking,
                newMarkingCounter
            );
            setIncomes((prevIncomes) =>
                prevIncomes.map((income) => ({
                    ...income,
                    product_markings: (income.product_markings || []).map((marking) =>
                        marking.id === markingId
                            ? {...marking, marking: newMarking, counter: newMarkingCounter}
                            : marking
                    ),
                }))
            );
        } catch (error) {
            console.error('Failed to update marking:', error);
            throw error;
        }
    };

    const openModal = (marking) => {
        setSelectedMarking({
            ...marking,
            incomeId: marking.incomeId,
            productId: marking.productId,
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setSelectedMarking(null);
        setModalOpen(false);
    };

    const openDeleteModal = (marking) => {
        setMarkingToDelete(marking);
        setDeleteModalOpen(true);
    };

    const confirmDeleteMarking = async () => {
        if (!markingToDelete) return;

        try {
            await deleteMarking(markingToDelete.incomeId, markingToDelete.productId, markingToDelete.id);
            setIncomes((prevIncomes) =>
                prevIncomes.map((income) => ({
                    ...income,
                    product_markings: (income.product_markings || []).filter(
                        (item) => item.id !== markingToDelete.id
                    ),
                }))
            );
        } catch (error) {
            console.error('Failed to delete marking:', error);
        } finally {
            setDeleteModalOpen(false);
            setMarkingToDelete(null);
        }
    };

    const handleCheckboxChange = (marking) => {
        setSelectedMarkings((prevSelected) => {
            if (prevSelected.some((item) => item.id === marking.id)) {
                return prevSelected.filter((item) => item.id !== marking.id);
            } else {
                return [...prevSelected, marking];
            }
        });
    };

    return (
        <>
            <MarkingEditModal
                isOpen={isModalOpen}
                onClose={closeModal}
                marking={selectedMarking}
                onSave={handleMarkingChange}
            />

            {/* Модальное окно подтверждения удаления */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg p-6 shadow-lg">
                        <Typography variant="h6" className="mb-4">
                            Вы уверены, что хотите удалить эту маркировку?
                        </Typography>
                        <div className="flex justify-end space-x-4">
                            <button
                                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                                onClick={() => setDeleteModalOpen(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                                onClick={confirmDeleteMarking}
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Отображение списка маркировок */}
            {filteredIncomes.map((marking) => (
                <tr key={`${marking.incomeId}-${marking.productId}-${marking.id}`}
                    className={`${marking.counter ? 'bg-green-100' : 'even:bg-blue-gray-50/50'}`}>
                    <td className="p-4">
                        <div className="inline-flex items-center">
                            <label
                                className="relative flex items-center p-3 rounded-full cursor-pointer"
                                htmlFor={`checkbox-${marking.id}`}
                            >
                                <input
                                    type="checkbox"
                                    className="before:content[''] peer relative h-5 w-5 cursor-pointer appearance-none rounded-md border border-blue-gray-200 transition-all before:absolute before:top-2/4 before:left-2/4 before:block before:h-12 before:w-12 before:-translate-y-2/4 before:-translate-x-2/4 before:rounded-full before:bg-blue-gray-500 before:opacity-0 before:transition-opacity checked:border-gray-900 checked:bg-gray-900 checked:before:bg-gray-900 hover:before:opacity-10"
                                    id={`checkbox-${marking.id}`}
                                    checked={selectedMarkings.some((item) => item.id === marking.id)}
                                    onChange={() => handleCheckboxChange(marking)}
                                />
                                <span
                                    className="absolute text-white transition-opacity opacity-0 pointer-events-none top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 peer-checked:opacity-100">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-3.5 w-3.5"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                                stroke="currentColor"
                                                strokeWidth="1"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                ></path>
                                            </svg>
                                        </span>
                            </label>
                        </div>
                    </td>
                    <td className="p-4">
                        <Typography variant="small" color="blue-gray" className="font-normal">
                            {marking.productName ? marking.productName : 'Unknown Product'}
                        </Typography>
                    </td>
                    <td className="p-4">
                        <Typography variant="small" color="blue-gray" className="font-normal">
                            {marking.unitOfMeasure ? marking.unitOfMeasure : 'Unknown Unit'}
                        </Typography>
                    </td>
                    <td className="p-4">
                        <Typography variant="small" color="blue-gray" className="font-normal">
                            {marking.kpi ? marking.kpi : 'No KPI'}
                        </Typography>
                    </td>
                    <td className="p-4">
                        <Typography variant="small" color="blue-gray" className="font-normal">
                            {marking.marking ? marking.marking : 'Unknown Marking'}
                        </Typography>
                    </td>
                    <td className="p-4">
                        <button
                            disabled={!canEdit()}
                            onClick={() => openModal(marking)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="black"
                                className="w-6 h-6 hover:stroke-green-800"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                />
                            </svg>
                        </button>
                        <button
                            disabled={!canEdit()}
                            onClick={() => openDeleteModal(marking)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                 strokeWidth={1.5}
                                 stroke="currentColor" className="size-6 hover:stroke-red-800">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
                            </svg>
                        </button>
                    </td>
                </tr>
            ))}
        </>
    );
};

export default IncomeItemList;
