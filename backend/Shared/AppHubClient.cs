using System.Collections.Generic;
using System.Threading.Tasks;
using backend.Shared.Models;

namespace backend.Shared;

public interface IAppHubClient
{
    Task ReceiveMessage(Message message);
    Task ReceiveClassThread(ClassThread thread);
    Task ReceiveClassThreadComment(ClassThreadComment comment);
    Task UserOnline(string userId);
    Task UserOffline(string userId);
}
