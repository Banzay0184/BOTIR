import React, { useState, useEffect } from 'react';
import { Card, Typography } from '@material-tailwind/react';
import { getProductsPaginated, getApiErrorMessage } from '../api/api';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 50;
const TABLE_HEAD = ['ID', 'Название', 'Цена', 'ИКПУ', 'Остаток (склад)'];

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [count, setCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const fetchPage = async () => {
            try {
                setIsLoading(true);
                const response = await getProductsPaginated({ page: currentPage }, controller.signal);
                if (controller.signal?.aborted) return;
                const data = response.data;
                const results = data?.results ?? (Array.isArray(data) ? data : []);
                setProducts(results);
                setCount(typeof data?.count === 'number' ? data.count : results.length);
            } catch (error) {
                if (!controller.signal?.aborted) {
                    console.error('Error fetching products:', getApiErrorMessage(error), error);
                }
            } finally {
                if (!controller.signal?.aborted) setIsLoading(false);
            }
        };

        fetchPage();
        return () => controller.abort();
    }, [currentPage]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    return (
        <div className="p-4">
            <Typography variant="h5" color="blue-gray" className="mb-4">
                Товары
            </Typography>
            <Card className="overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center py-24">
                        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[500px] table-auto text-left">
                                <thead>
                                    <tr>
                                        {TABLE_HEAD.map((head) => (
                                            <th
                                                key={head}
                                                className="border-b border-blue-gray-100 bg-blue-gray-50 p-3"
                                            >
                                                <Typography
                                                    variant="small"
                                                    color="blue-gray"
                                                    className="font-semibold"
                                                >
                                                    {head}
                                                </Typography>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.length === 0 ? (
                                        <tr>
                                            <td colSpan={TABLE_HEAD.length} className="p-4 text-center text-blue-gray-500">
                                                Нет товаров
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map((product) => (
                                            <tr key={product.id} className="border-b border-blue-gray-50 hover:bg-blue-gray-50/50">
                                                <td className="p-3">
                                                    <Typography variant="small" color="blue-gray">
                                                        {product.id}
                                                    </Typography>
                                                </td>
                                                <td className="p-3">
                                                    <Typography variant="small" color="blue-gray" className="font-medium">
                                                        {product.name ?? '—'}
                                                    </Typography>
                                                </td>
                                                <td className="p-3">
                                                    <Typography variant="small" color="blue-gray">
                                                        {product.price != null ? Number(product.price).toLocaleString('ru-RU') : '—'}
                                                    </Typography>
                                                </td>
                                                <td className="p-3">
                                                    <Typography variant="small" color="blue-gray">
                                                        {product.kpi ?? '—'}
                                                    </Typography>
                                                </td>
                                                <td className="p-3">
                                                    <Typography variant="small" color="blue-gray">
                                                        {product.stock != null ? product.stock : '—'}
                                                    </Typography>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {count > PAGE_SIZE && (
                            <Pagination
                                count={count}
                                pageSize={PAGE_SIZE}
                                currentPage={currentPage}
                                onPageChange={handlePageChange}
                            />
                        )}
                    </>
                )}
            </Card>
        </div>
    );
};

export default ProductsPage;
