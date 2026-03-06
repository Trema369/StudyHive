// Controllers/UsersController.cs
using backend.Shared.Models;
using Microsoft.AspNetCore.Mvc;
using SurrealDb.Net;

namespace backend.Controllers;

[ApiController]
public class UsersController : ControllerBase
{
    private readonly SurrealDbClient _db;

    public UsersController(SurrealDbClient db)
    {
        _db = db;
    }

    [HttpGet("api/users/search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(new List<object>());

        var result = await _db.Query(
            $"SELECT id, username, email FROM user WHERE string::lowercase(username) CONTAINS string::lowercase({q}) OR string::lowercase(email) CONTAINS string::lowercase({q}) LIMIT 10;"
        );

        var users = result.GetValue<List<DbUser>>(0) ?? [];
        return Ok(users.Select(u => u.ToBase()));
    }
}
