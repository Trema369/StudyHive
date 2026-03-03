using backend.Hubs;
using backend.Shared.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppHub _appHub;

        public AuthController(AppHub appHub)
        {
            _appHub = appHub;
        }

        [HttpPost("signin")]
        public async Task<IActionResult> SignIn([FromBody] SignInRequest request)
        {
            var user = await _appHub.SignIn(request.Username, request.Password);
            if (user is null)
                return Unauthorized(new { message = "Invalid credentials" });

            return Ok(user);
        }

        [HttpPost("signup")]
        public async Task<IActionResult> SignUp([FromBody] SignUpRequest request)
        {
            var user = await _appHub.SignUp(
                new UserInfo
                {
                    username = request.Username,
                    email = request.Email,
                    password = request.Password,
                    money = 0.0f,
                }
            );

            if (user is null)
                return BadRequest(new { message = "Username already exists" });

            return Ok(user);
        }
    }

    // Request DTOs
    public class SignInRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class SignUpRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
