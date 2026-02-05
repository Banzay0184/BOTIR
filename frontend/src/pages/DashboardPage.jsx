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
import { getDashboardStats } from '../api/api';
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
        const controller = new AbortController();
        const fetchStats = async () => {
            try {
                const response = await getDashboardStats(selectedYear, controller.signal);
                const data = response.data;
                if (controller.signal.aborted) return;

                setAvailableYears(data.available_years ?? []);

                const incomeByMonth = data.incomes?.by_month ?? Array.from({ length: 12 }, () => ({ items: 0, total: 0 }));
                const outcomeByMonth = data.outcomes?.by_month ?? Array.from({ length: 12 }, () => ({ items: 0, total: 0 }));

                setIncomeChartData(prev => ({
                    ...prev,
                    datasets: [{
                        ...prev.datasets[0],
                        data: incomeByMonth.map(m => m.items ?? 0),
                        totalAmounts: incomeByMonth.map(m => m.total ?? 0),
                    }],
                }));
                setOutcomeChartData(prev => ({
                    ...prev,
                    datasets: [{
                        ...prev.datasets[0],
                        data: outcomeByMonth.map(m => m.items ?? 0),
                        totalAmounts: outcomeByMonth.map(m => m.total ?? 0),
                    }],
                }));

                setTotalIncome(data.incomes?.total_sum ?? 0);
                setTotalIncomeItems(data.incomes?.total_items ?? 0);
                setTotalOutcome(data.outcomes?.total_sum ?? 0);
                setTotalOutcomeItems(data.outcomes?.total_items ?? 0);
                setCurrentStockItems(data.stock?.items_count ?? 0);
                setCurrentStockValue(data.stock?.value ?? 0);
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error('Ошибка при получении статистики дашборда:', error);
            }
        };

        fetchStats();
        return () => controller.abort();
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
        <div className="p-3 sm:p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 bg-gray-100 min-w-0">
            {/* Текущие данные о товарах и общей сумме на складе */}
            <Card className="col-span-2 shadow-xl rounded-lg border border-gray-300 p-6 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white">
                <CardBody>
                    <Typography variant="h5" className="text-center font-bold mb-4">Текущие данные о складе</Typography>
                    <div className="flex flex-col sm:flex-row justify-around gap-4 sm:gap-0">
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
                    <div className="h-[280px] sm:h-[320px] md:h-[400px] min-h-0">
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
                    <div className="h-[280px] sm:h-[320px] md:h-[400px] min-h-0">
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
