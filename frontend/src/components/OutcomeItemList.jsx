import React, { useState, useEffect } from 'react';
import { Typography } from '@material-tailwind/react';
import { getProducts } from '../api/api';

const OutcomeItemList = ({
                             searchTerm,
                             onUpdateMarkingCount,
                             selectedMarkings,
                             setSelectedMarkings,
                             outcomes,
                             setOutcomes
                         }) => {
    const [filteredOutcomes, setFilteredOutcomes] = useState([]);
    const [products, setProducts] = useState({});

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await getProducts();
                const productMap = response.data.reduce((map, product) => {
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

    useEffect(() => {
        const filtered = outcomes.flatMap((outcome) =>
            outcome.product_markings
                ? outcome.product_markings.filter(
                    (marking) =>
                        marking.marking.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((marking) => ({
                    ...marking,
                    productName: products[marking.product] ? products[marking.product].name : `Product ID ${marking.product}`,
                    kpi: products[marking.product] ? products[marking.product].kpi : 'No KPI',
                    unitOfMeasure: outcome.unit_of_measure,
                    outcomeId: outcome.id,
                    productId: marking.product,
                    companyName: outcome.to_company?.name || 'Unknown Company',
                    companyPhone: outcome.to_company?.phone || 'Unknown Phone',
                    companyInn: outcome.to_company?.inn || 'Unknown INN',
                }))
                : []
        );
        setFilteredOutcomes(filtered);
        onUpdateMarkingCount(filtered.length);
    }, [searchTerm, outcomes, onUpdateMarkingCount, products]);




    return (
        <>
            {filteredOutcomes.map((marking) => (
                <tr key={`${marking.outcomeId}-${marking.productId}-${marking.id}`} className="even:bg-blue-gray-50/50">
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
                                    className="absolute text-white transition-opacity opacity-0 pointer-events-none top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 peer-checked:opacity-100"
                                >
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
                        <Typography variant="small" color="blue-gray" className="font-normal">
                            {marking.companyName ? marking.companyName : 'Unknown Company'}
                        </Typography>
                        <Typography variant="small" color="blue" className="font-normal">
                            {marking.companyInn ? marking.companyInn : 'Unknown INN'}
                        </Typography>
                    </td>
                </tr>
            ))}
        </>
    );
};

export default OutcomeItemList;
