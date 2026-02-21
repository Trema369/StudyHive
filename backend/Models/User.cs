using SurrealDb.Net.Models;

namespace studbud.Shared.Models;

public class DbUserInfo : Record
{
    public string? username { get; set; }
    public float? money {get; set;}
    public string? email { get; set; }
    public string? password { get; set; }

    public DbUserInfo() { }

    public DbUserInfo(UserInfo user)
    {
        this.username = user.username;
        this.email = user.email;
        this.password = user.password;
        this.money = user.money;
        if (user.id is not null)
        {
            this.Id = new RecordIdOfString("user", user.id);
        }
    }

    public UserInfo ToBase()
    {
        return new UserInfo
        {
            username = this.username,
            email = this.email,
            password = this.password,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

public class DbUser : Record
{
    public string? username { get; set; }
    public float? money {get; set;}
    public string? email { get; set; }

    public DbUser() { }

    public DbUser(User user)
    {
        this.username = user.username;
        this.email = user.email;
        this.money = user.money;
        if (user.id is not null)
        {
            this.Id = new RecordIdOfString("user", user.id);
        }
    }

    public User ToBase()
    {
        return new User
        {
            username = this.username,
            email = this.email,
            money = this.money,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}
