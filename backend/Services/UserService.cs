using backend.Common;
using backend.DTO.Users;
using backend.Interfaces;

namespace backend.Services;

public class UserService : IUserService
{
    private readonly IUnitOfWork _unitOfWork;

    public UserService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ServiceResult<UserResponse>> GetByIdAsync(Guid userId)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);

        if (user is null)
            return ServiceResult<UserResponse>.Fail(ServiceErrorType.NotFound, "User not found.");

        return ServiceResult<UserResponse>.Ok(
            new UserResponse(user.Id, user.FirstName, user.LastName, user.Email, user.EmailVerified, user.CreatedAt));
    }
}
