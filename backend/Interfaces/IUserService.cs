using backend.Common;
using backend.DTO.Users;

namespace backend.Interfaces;

public interface IUserService
{
    Task<ServiceResult<UserResponse>> GetByIdAsync(Guid userId);
}
