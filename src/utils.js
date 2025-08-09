export function calculatePagination(totalItems, currentPage, itemsPerPage = 8) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const safePage = Math.max(1, Math.min(currentPage, totalPages));
    const offset = (safePage - 1) * itemsPerPage;
    
    return {
        page: safePage,
        totalPages,
        offset,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1
    };
}