import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, Typography } from '@material-tailwind/react';
import { Bar } from 'react-chartjs-2';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import 'react-datepicker/dist/react-datepicker.css';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { getIncomes, getOutcomes } from '../api/api';
import { FaBoxes, FaMoneyBillWave } from 'react-icons/fa';  // Импорт иконок из React Icons

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const DashboardPage = () => {
    const [incomeChartData, setIncomeChartData] = useState({
        labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
        datasets: [
            {
                label: 'Количество полученных товаров',
                backgroundColor: '#42A5F5',
                borderColor: '#1E88E5',
                borderWidth: 1,
                data: Array(12).fill(0),
                totalAmounts: Array(12).fill(0),
            },
        ],
    });

    const [outcomeChartData, setOutcomeChartData] = useState({
        labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
        datasets: [
            {
                label: 'Количество отгруженных товаров',
                backgroundColor: '#FFA726',
                borderColor: '#FB8C00',
                borderWidth: 1,
                data: Array(12).fill(0),
                totalAmounts: Array(12).fill(0),
            },
        ],
    });

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState([]);
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalIncomeItems, setTotalIncomeItems] = useState(0);
    const [totalOutcome, setTotalOutcome] = useState(0);
    const [totalOutcomeItems, setTotalOutcomeItems] = useState(0);
    const [currentStockItems, setCurrentStockItems] = useState(0);
    const [currentStockValue, setCurrentStockValue] = useState(0);

    useEffect(() => {
        const fetchIncomes = async () => {
            try {
                const response = await getIncomes();
                const incomes = response.data;

                const years = [...new Set(incomes.map(income => new Date(income.contract_date).getFullYear()))];
                setAvailableYears(years.sort((a, b) => b - a));

                const monthlyData = Array(12).fill(0);
                const monthlyAmounts = Array(12).fill(0);
                let incomeSum = 0;
                let incomeItemSum = 0;

                incomes.forEach(income => {
                    const incomeYear = new Date(income.contract_date).getFullYear();
                    if (incomeYear === selectedYear) {
                        const month = new Date(income.contract_date).getMonth();
                        incomeSum += income.total;
                        monthlyAmounts[month] += income.total;
                        if (income.product_markings && Array.isArray(income.product_markings)) {
                            monthlyData[month] += income.product_markings.length;
                            incomeItemSum += income.product_markings.length;
                        }
                    }
                });

                setIncomeChartData(prevData => ({
                    ...prevData,
                    datasets: [{
                        ...prevData.datasets[0],
                        data: monthlyData,
                        totalAmounts: monthlyAmounts
                    }]
                }));

                setTotalIncome(incomeSum);
                setTotalIncomeItems(incomeItemSum);
            } catch (error) {
                console.error('Ошибка при получении доходов:', error);
            }
        };

        const fetchOutcomes = async () => {
            try {
                const response = await getOutcomes();
                const outcomes = response.data;

                const monthlyData = Array(12).fill(0);
                const monthlyAmounts = Array(12).fill(0);
                let outcomeSum = 0;
                let outcomeItemSum = 0;

                outcomes.forEach(outcome => {
                    const outcomeYear = new Date(outcome.contract_date).getFullYear();
                    if (outcomeYear === selectedYear) {
                        const month = new Date(outcome.contract_date).getMonth();
                        outcomeSum += outcome.total;
                        monthlyAmounts[month] += outcome.total;
                        if (outcome.product_markings && Array.isArray(outcome.product_markings)) {
                            monthlyData[month] += outcome.product_markings.length;
                            outcomeItemSum += outcome.product_markings.length;
                        }
                    }
                });

                setOutcomeChartData(prevData => ({
                    ...prevData,
                    datasets: [{
                        ...prevData.datasets[0],
                        data: monthlyData,
                        totalAmounts: monthlyAmounts
                    }]
                }));

                setTotalOutcome(outcomeSum);
                setTotalOutcomeItems(outcomeItemSum);
            } catch (error) {
                console.error('Ошибка при получении расходов:', error);
            }
        };

        const calculateCurrentStock = async () => {
            try {
                const incomeResponse = await getIncomes();
                const outcomeResponse = await getOutcomes();
                const incomes = incomeResponse.data;
                const outcomes = outcomeResponse.data;

                let incomeItemSum = 0;
                let outcomeItemSum = 0;
                let incomeSum = 0;
                let outcomeSum = 0;

                incomes.forEach(income => {
                    incomeSum += income.total;
                    if (income.product_markings && Array.isArray(income.product_markings)) {
                        incomeItemSum += income.product_markings.length;
                    }
                });

                outcomes.forEach(outcome => {
                    outcomeSum += outcome.total;
                    if (outcome.product_markings && Array.isArray(outcome.product_markings)) {
                        outcomeItemSum += outcome.product_markings.length;
                    }
                });

                setCurrentStockItems(incomeItemSum - outcomeItemSum);
                setCurrentStockValue(incomeSum - outcomeSum);

            } catch (error) {
                console.error('Ошибка при вычислении текущего состояния склада:', error);
            }
        };

        fetchIncomes();
        fetchOutcomes();
        calculateCurrentStock();
    }, [selectedYear]);

    const barChartOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    font: {
                        size: 14
                    },
                    color: '#6B7280'
                }
            },
            title: {
                display: true,
                text: `Годовой график по месяцам (${selectedYear})`,
                font: {
                    size: 16
                },
                color: '#374151'
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const label = context.dataset.label || '';
                        const value = context.raw || 0;
                        const totalAmount = context.dataset.totalAmounts[context.dataIndex] || 0;

                        const formattedValue = value.toLocaleString();
                        const formattedTotal = totalAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        });

                        return `${label}: ${formattedValue} товаров, Общая сумма: ${formattedTotal} сум`;
                    }
                },
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                titleFont: { size: 14 },
                bodyFont: { size: 12 },
                padding: 12,
                cornerRadius: 4,
                displayColors: false
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Месяцы',
                    font: {
                        size: 14
                    },
                    color: '#6B7280'
                },
                grid: {
                    display: false
                }
            },
            y: {
                display: false,
            },
        },
    };

    const handleYearChange = (date) => {
        setSelectedYear(moment(date).year());
    };

    return (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-100">
            {/* Текущие данные о товарах и общей сумме на складе */}
            <Card className="col-span-2 shadow-xl rounded-lg border border-gray-300 p-6 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white">
                <CardBody>
                    <Typography variant="h5" className="text-center font-bold mb-4">Текущие данные о складе</Typography>
                    <div className="flex justify-around">
                        <div className="flex flex-col items-center">
                            <div className="bg-white p-3 rounded-full shadow-lg mb-2">
                                <FaBoxes className="w-6 h-6 text-indigo-700" />
                            </div>
                            <Typography variant="h6" className="text-sm">Текущее количество товаров:</Typography>
                            <Typography variant="h4" className="mt-1 text-2xl font-bold">{currentStockItems}</Typography>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="bg-white p-3 rounded-full shadow-lg mb-2">
                                <FaMoneyBillWave className="w-6 h-6 text-indigo-700" />
                            </div>
                            <Typography variant="h6" className="text-sm">Текущая общая сумма:</Typography>
                            <Typography variant="h4" className="mt-1 text-2xl font-bold">{currentStockValue.toLocaleString()} сум</Typography>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Фильтр по году */}
            <div className="col-span-2 flex justify-center mb-4">
                <div className="relative w-48">
                    <DatePicker
                        selected={new Date(selectedYear, 0, 1)}
                        onChange={handleYearChange}
                        showYearPicker
                        dateFormat="yyyy"
                        className="w-full border border-gray-300 rounded-lg py-2 px-4 text-center text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholderText="Выберите год"
                    />
                </div>
            </div>

            {/* График доходов по месяцам */}
            <Card className="col-span-1 shadow-lg rounded-lg border border-gray-200 p-4">
                <CardHeader className='text-center bg-teal-500 rounded-t-lg'>
                    <Typography variant="h6" color="white">Годовой график получения товаров по месяцам</Typography>
                </CardHeader>
                <CardBody>
                    <div style={{ height: '400px' }}>
                        <Bar data={incomeChartData} options={barChartOptions} />
                        <Typography variant="h6" color="gray" className="mt-4 text-sm">Общая сумма доходов</Typography>
                        <Typography variant="h4" color="green" className="mt-2 text-xl font-medium">{totalIncome.toLocaleString()} сум</Typography>
                        <Typography variant="h6" color="gray" className="mt-4 text-sm">Общее количество товаров</Typography>
                        <Typography variant="h4" color="green" className="mt-2 text-xl font-medium">{totalIncomeItems}</Typography>
                    </div>
                </CardBody>
            </Card>

            {/* График расходов по месяцам */}
            <Card className="col-span-1 shadow-lg rounded-lg border border-gray-200 p-4">
                <CardHeader className='text-center bg-orange-500 rounded-t-lg'>
                    <Typography variant="h6" color="white">Годовой график отгрузки товаров по месяцам</Typography>
                </CardHeader>
                <CardBody>
                    <div style={{ height: '400px' }}>
                        <Bar data={outcomeChartData} options={barChartOptions} />
                        <Typography variant="h6" color="gray" className="mt-4 text-sm">Общая сумма расходов</Typography>
                        <Typography variant="h4" color="red" className="mt-2 text-xl font-medium">{totalOutcome.toLocaleString()} сум</Typography>
                        <Typography variant="h6" color="gray" className="mt-4 text-sm">Общее количество товаров</Typography>
                        <Typography variant="h4" color="red" className="mt-2 text-xl font-medium">{totalOutcomeItems}</Typography>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};

export default DashboardPage;
