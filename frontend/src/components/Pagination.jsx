import React from 'react';
import { Button } from '@material-tailwind/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * Пагинация: предыдущая / следующая страница и текст "Страница X из Y".
 * @param {number} count - общее количество записей
 * @param {number} pageSize - записей на странице
 * @param {number} currentPage - текущая страница (1-based)
 * @param {function(number): void} onPageChange - вызывается с номером страницы (1-based)
 */
const Pagination = ({ count, pageSize, currentPage, onPageChange }) => {
    const totalPages = Math.max(1, Math.ceil(count / pageSize));
    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    const handlePrev = () => {
        if (hasPrev) onPageChange(currentPage - 1);
    };

    const handleNext = () => {
        if (hasNext) onPageChange(currentPage + 1);
    };

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, count);

    return (
        <nav
            className="flex flex-wrap items-center justify-between gap-2 py-3 px-2 border-t border-blue-gray-100"
            aria-label="Пагинация"
        >
            <div className="text-sm text-blue-gray-600">
                Показано {start}–{end} из {count}
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outlined"
                    size="sm"
                    onClick={handlePrev}
                    disabled={!hasPrev}
                    className="flex items-center gap-1"
                    aria-label="Предыдущая страница"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                    Назад
                </Button>
                <span className="text-sm text-blue-gray-700 px-2">
                    Страница {currentPage} из {totalPages}
                </span>
                <Button
                    variant="outlined"
                    size="sm"
                    onClick={handleNext}
                    disabled={!hasNext}
                    className="flex items-center gap-1"
                    aria-label="Следующая страница"
                >
                    Вперёд
                    <ChevronRightIcon className="w-4 h-4" />
                </Button>
            </div>
        </nav>
    );
};

export default Pagination;
