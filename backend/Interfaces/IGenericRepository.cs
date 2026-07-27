using backend.Common;

namespace backend.Interfaces;

public interface IGenericRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id);
    Task<List<T>> GetAllAsync();
    Task<PagedResult<T>> GetPagedAsync(PaginationParams pagination);
    Task AddAsync(T entity);
    void Update(T entity);
    void Remove(T entity);
}