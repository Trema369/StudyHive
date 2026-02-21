using System.Collections.Generic;
using System.Threading.Tasks;
using studbud.Shared.Models;

namespace studbud.Shared;

public interface IAppHubServer
{
    Task<Message> SendMessage(Message msg);
    Task<Chat> CreateChat(Chat chat);
    Task<User?> AddMoneyToUser(string userId, float amount);
    Task<Payment?> ProcessPayment(Payment payment);
    Task<Message?> GetAIResponse(string model, List<Message> messages);
    Task<List<FlashcardCard>> GetAIFlashcards(string prompt);
    Task<Message?> AddAIResponseToChat(string model, string parent);
    Task<List<string>?> GetAIModels();
    Task<bool> IsAIAvailable();
    Task<Chat> UpdateChat(Chat chat);
    Task ResetChat(string parent);
    Task<Class> CreateClass(Class clss);
    Task<Class?> JoinClass(string userId, string code);
    Task ConnectToChat(string parent);
    Task<List<Message>> GetMessages(string parent);
    Task<List<Payment>> GetDisplayPayments(string userId);
    Task<User?> GetUserFromUsername(string username);
    Task<Chat> GetChat(string id);
    Task<Class> UpdateClassInfo(string classId, string? name, string? description);
    Task<Class> AddStudentToClass(string classId, string userId);
    Task<Class> RemoveStudentFromClass(string classId, string userId);
    Task<Class> AddPinnedLink(string classId, PinnedLink link);
    Task<Class> RemovePinnedLink(string classId, string linkId);
    Task<Chat> AddUserToChat(string chatId, string userId);
    Task<Chat> SetChatName(string chatId, string name);
    Task<Class> GetClass(string id);
    Task<Assignment> CreateAssignment(Assignment ass);
    Task<List<Assignment>> GetAssignments(string classId);
    Task<Submission> SubmitAssignment(Submission sub);
    Task<List<Submission>> GetSubmissions(string assignmentId);

    Task<Flashcard> CreateFlashcard(Flashcard flash);
    Task<Flashcard> UpdateFlashcard(Flashcard flash);
    Task<Flashcard> GetFlashcard(string flashId);
    Task<FlashcardCard> CreateFlashcardCard(FlashcardCard card);
    Task<FlashcardCard> UpdateFlashcardCard(FlashcardCard card);
    Task RemoveFlashcardCard(string cardId);
    Task<List<FlashcardCard>> GetFlashcardCards(string flashId);


    Task<Quiz> CreateQuiz(Quiz quiz);
    Task<Quiz> UpdateQuiz(Quiz quiz);
    Task<Quiz> GetQuiz(string quizId);
    Task<Question> CreateQuestion(Question q);
    Task<Question> UpdateQuestion(Question q);
    Task RemoveQuestion(string questionId);
    Task<List<Question>> GetQuestions(string quizId);
    
    Task<QuizSubmission> SubmitQuiz(QuizSubmission sub);
    Task<List<QuizSubmission>> GetQuizSubmissions(string quizId);
    Task<Submission> SetSubmissionMark(string submissionId, int mark);
    Task<List<Class>> GetClassesFromUser(string id);
    Task<List<Chat>> GetChatsFromUser(string id);
    Task<List<Quiz>> GetQuizzesFromUser(string id);
    Task<List<Flashcard>> GetFlashcardsFromUser(string id);

    Task<List<Quiz>> SearchQuizzes(string search);
    Task<List<Flashcard>> SearchFlashcards(string search);
    Task<List<User>> SearchUsers(string search);

    Task<Chat> GetChatWithName(string chatId, string userId);
    Task<User> GetUser(string id);
    Task<User?> CheckUser(string id);
    Task<List<User>> GetUsers(List<string> ids);
    Task<string> GetChatName(Chat chat, string userId);
    Task<User?> SignIn(string username, string password);
    Task<User?> SignUp(UserInfo user);
}
