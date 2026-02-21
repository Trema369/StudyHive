using System.Collections.Generic;
using System.Threading.Tasks;
using studbud.Shared.Models;

namespace studbud.Shared;

public interface IAppHubClient
{
    Task ReceiveMessage(Message message);
}
