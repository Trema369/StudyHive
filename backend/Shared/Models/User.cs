namespace backend.Shared.Models;

public class UserInfo
{
    public string? username { get; set; }
    public float? money { get; set; }
    public string? email { get; set; }
    public string? password { get; set; }
    public string? id { get; set; }

    public UserInfo() { }

    public User ToBase()
    {
        return new User
        {
            username = this.username,
            email = this.email,
            money = this.money,
            id = this.id,
        };
    }
}

public class User
{
    public string? username { get; set; }
    public float? money { get; set; }
    public string? email { get; set; }
    public string? id { get; set; }

    public User() { }
}
