import React, {useState, useEffect} from 'react';
import Chart from "react-apexcharts";
import {getOutcomes, getProducts} from '../api/api'; // Импорт функции getOutcomes и getProducts из вашего API

const OutcomeChart = () => {
    const [chartData, setChartData] = useState({
        series: [],
        categories: [],
        totalValue: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [outcomesResponse, productsResponse] = await Promise.all([getOutcomes(), getProducts()]);
                const outcomes = outcomesResponse.data;
                const products = productsResponse.data;

                if (!Array.isArray(outcomes)) {
                    throw new Error("Invalid response format");
                }

                const productMap = products.reduce((map, product) => {
                    map[product.id] = product;
                    return map;
                }, {});

                const productTotals = {};
                let totalValue = 0;

                outcomes.forEach((outcome, outcomeIndex) => {
                    if (!Array.isArray(outcome.product_markings)) {
                        console.error(`Invalid product_markings format for outcome at index ${outcomeIndex}:`, outcome);
                        throw new Error("Invalid product_markings format");
                    }

                    outcome.product_markings.forEach((product_marking, productIndex) => {
                        const product = productMap[product_marking.product];
                        if (!product) {
                            console.error(`Invalid product ID at index ${productIndex} for outcome at index ${outcomeIndex}:`, product_marking);
                            throw new Error("Invalid product ID");
                        }

                        if (!productTotals[product.name]) {
                            productTotals[product.name] = 0;
                        }
                        productTotals[product.name] += 1; // Assuming each marking represents one unit
                        totalValue += product.price; // Увеличиваем общую стоимость на цену продукта
                    });
                });

                const categories = Object.keys(productTotals);
                const series = [{
                    name: "Total Outcome",
                    data: Object.values(productTotals)
                }];

                setChartData({series, categories, totalValue});
            } catch (error) {
                console.error("Error fetching outcomes data:", error);
            }
        };

        fetchData();
    }, []);

    const generateColors = (count) => {
        const colors = [];
        for (let i = 0; i < count; i++) {
            const color = `hsl(${i * (360 / count)}, 70%, 50%)`;
            colors.push(color);
        }
        return colors;
    };

    const colors = generateColors(chartData.categories.length);

    const chartConfig = {
        type: "bar",
        height: 200, // Уменьшенная высота графика
        width: "100%",
        series: chartData.series,
        options: {
            chart: {
                toolbar: {
                    show: false,
                },
            },
            title: {
                text: `Общая стоимость всех товаров: ${chartData.totalValue.toFixed(2)}`,
                align: 'left',
                style: {
                    fontSize: '16px',
                    color: '#333'
                }
            },
            dataLabels: {
                enabled: true,
                formatter: function (val) {
                    return Math.round(val);
                },
                style: {
                    fontSize: '12px',
                    colors: ["#ffffff"]
                }
            },
            colors: colors,
            plotOptions: {
                bar: {
                    columnWidth: "50%",
                    borderRadius: 4,
                    distributed: true, // Распределяем цвета по каждому столбику
                },
            },
            xaxis: {
                axisTicks: {
                    show: false,
                },
                axisBorder: {
                    show: false,
                },
                labels: {
                    style: {
                        colors: "#6B7280",
                        fontSize: "12px",
                        fontFamily: "Helvetica, Arial, sans-serif",
                        fontWeight: 500,
                    },
                },
                categories: chartData.categories,
            },
            yaxis: {
                title: {
                    text: 'Всего товаров',
                    style: {
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#333'
                    }
                },
                labels: {
                    style: {
                        colors: "#6B7280",
                        fontSize: "12px",
                        fontFamily: "Helvetica, Arial, sans-serif",
                        fontWeight: 500,
                    },
                    formatter: function (val) {
                        return Math.round(val);
                    },
                },
            },
            grid: {
                show: true,
                borderColor: "#E5E7EB",
                strokeDashArray: 5,
                xaxis: {
                    lines: {
                        show: true,
                    },
                },
                padding: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10
                },
            },
            fill: {
                opacity: 0.8,
            },
            tooltip: {
                theme: "light",
                x: {
                    show: true
                },
                y: {
                    title: {
                        formatter: (seriesName) => 'Всего товаров:',
                    },
                    formatter: function (val) {
                        return Math.round(val);
                    }
                }
            },
        },
    };

    return (
        <div>
            <h2 className='text-xl font-bold mb-4'>Расход</h2>
            <Chart {...chartConfig} />
        </div>
    );
};

export default OutcomeChart;
