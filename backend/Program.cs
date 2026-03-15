using backend.Hubs;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.FileProviders;
using OllamaSharp;
using SurrealDb.Net;

// SurrealDB setup
var surrealUrl = Environment.GetEnvironmentVariable("SURREAL_URL") ?? "http://127.0.0.1:8000";

var surreal = SurrealDbOptions
    .Create()
    .WithEndpoint(surrealUrl)
    .WithNamespace("main")
    .WithDatabase("main")
    .Build();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<AppHub>();
builder.Services.AddControllers();
builder.Services.AddSignalR();

builder.Services.AddResponseCompression(opts =>
{
    opts.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(
        new[] { "application/octet-stream" }
    );
});

builder.Services.AddSurreal(surreal);
builder.Services.AddSingleton(surreal);

string? origins = "http://localhost:3000"; // your Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "AllowFrontend",
        policy =>
        {
            policy.AllowAnyHeader();
            policy.AllowAnyMethod();
            policy.WithOrigins(origins);
            policy.AllowCredentials();
        }
    );
});

var app = builder.Build();

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors("AllowFrontend");
app.UseResponseCompression();
var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(
    new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(uploadsPath),
        RequestPath = "/uploads",
    }
);

app.MapControllers();
app.MapHub<AppHub>("/apphub");

await InitializeDbAsync();

app.Run();

async Task InitializeDbAsync()
{
    var surrealDbClient = new SurrealDbClient(surreal);
    await DefineSchemaAsync(surrealDbClient);
}

async Task DefineSchemaAsync(ISurrealDbClient surrealDbClient)
{
    await surrealDbClient.RawQuery(
        """
        DEFINE TABLE IF NOT EXISTS user SCHEMALESS;
        DEFINE FIELD IF NOT EXISTS username ON TABLE user TYPE string;
        DEFINE FIELD IF NOT EXISTS money ON TABLE user TYPE float;
        DEFINE FIELD IF NOT EXISTS email ON TABLE user TYPE string;
        DEFINE FIELD IF NOT EXISTS password ON TABLE user TYPE string;
        DEFINE TABLE user SCHEMALESS
            PERMISSIONS
                FOR select WHERE id = $auth.id,
                FOR create WHERE $access = 'account',
                FOR update WHERE id = $auth.id,
                FOR delete WHERE id = $auth.id;
        DEFINE INDEX IF NOT EXISTS user_username_unique ON TABLE user COLUMNS username UNIQUE;
        DEFINE INDEX IF NOT EXISTS user_email_unique ON TABLE user COLUMNS email UNIQUE;
        DEFINE ACCESS IF NOT EXISTS account ON DATABASE TYPE RECORD
            SIGNUP ( CREATE user CONTENT {
                username: $username,
                email: string::lowercase($email),
                password: crypto::argon2::generate($password),
                money: 0.0f
            } )
            SIGNIN ( SELECT * FROM user
                WHERE string::lowercase(username) = string::lowercase($username)
                AND crypto::argon2::compare(password, $password)
            );

        DEFINE ANALYZER user_analyzer TOKENIZERS class, blank FILTERS lowercase, ascii;
        DEFINE INDEX username_index ON TABLE user COLUMNS username SEARCH ANALYZER user_analyzer BM25;
        DEFINE INDEX email_index ON TABLE user COLUMNS email SEARCH ANALYZER user_analyzer BM25;

        DEFINE TABLE IF NOT EXISTS class SCHEMALESS;
        DEFINE TABLE class SCHEMALESS PERMISSIONS FULL;
        DEFINE FIELD IF NOT EXISTS name ON TABLE class TYPE string;
        DEFINE FIELD IF NOT EXISTS description ON TABLE class TYPE string;
        DEFINE FIELD IF NOT EXISTS code ON TABLE class TYPE string;
        DEFINE FIELD IF NOT EXISTS userIds ON TABLE class TYPE array<string>;
        DEFINE FIELD IF NOT EXISTS teacherIds ON TABLE class TYPE array<string>;
        DEFINE FIELD IF NOT EXISTS isPublic ON TABLE class TYPE bool DEFAULT false;
        DEFINE FIELD IF NOT EXISTS accentColor ON TABLE class TYPE string DEFAULT '#3b82f6';
        DEFINE FIELD IF NOT EXISTS pinnedLinks ON TABLE class TYPE array<object>;
        DEFINE FIELD pinnedLinks ON TABLE class TYPE array<object>;

        DEFINE TABLE IF NOT EXISTS class_thread_post SCHEMALESS;
        DEFINE TABLE class_thread_post SCHEMALESS PERMISSIONS FULL;
        DEFINE FIELD IF NOT EXISTS classId ON TABLE class_thread_post TYPE string;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE class_thread_post TYPE string;
        DEFINE FIELD IF NOT EXISTS title ON TABLE class_thread_post TYPE string;
        DEFINE FIELD IF NOT EXISTS text ON TABLE class_thread_post TYPE string;
        DEFINE FIELD IF NOT EXISTS parentPostId ON TABLE class_thread_post TYPE option<string>;
        DEFINE FIELD IF NOT EXISTS date ON TABLE class_thread_post TYPE datetime DEFAULT time::now();

        DEFINE TABLE IF NOT EXISTS class_thread SCHEMALESS;
        DEFINE TABLE class_thread SCHEMALESS PERMISSIONS FULL;
        DEFINE FIELD IF NOT EXISTS classId ON TABLE class_thread TYPE string;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE class_thread TYPE string;
        DEFINE FIELD IF NOT EXISTS title ON TABLE class_thread TYPE string;
        DEFINE FIELD IF NOT EXISTS text ON TABLE class_thread TYPE string;
        DEFINE FIELD IF NOT EXISTS attachments ON TABLE class_thread TYPE array<object>;
        DEFINE FIELD IF NOT EXISTS date ON TABLE class_thread TYPE datetime DEFAULT time::now();

        DEFINE TABLE IF NOT EXISTS class_thread_comment SCHEMALESS;
        DEFINE TABLE class_thread_comment SCHEMALESS PERMISSIONS FULL;
        DEFINE FIELD IF NOT EXISTS threadId ON TABLE class_thread_comment TYPE string;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE class_thread_comment TYPE string;
        DEFINE FIELD parentCommentId ON TABLE class_thread_comment TYPE option<string>;
        DEFINE FIELD IF NOT EXISTS text ON TABLE class_thread_comment TYPE string;
        DEFINE FIELD IF NOT EXISTS attachments ON TABLE class_thread_comment TYPE array<object>;
        DEFINE FIELD IF NOT EXISTS date ON TABLE class_thread_comment TYPE datetime DEFAULT time::now();
        UPDATE class_thread_comment UNSET parentCommentId WHERE parentCommentId = NULL OR parentCommentId = NONE;

        DEFINE TABLE IF NOT EXISTS chat SCHEMALESS;
        DEFINE TABLE chat SCHEMALESS PERMISSIONS FULL;
        DEFINE FIELD IF NOT EXISTS name ON TABLE chat TYPE option<string>;
        DEFINE FIELD IF NOT EXISTS userIds ON TABLE chat TYPE array<string>;
        DEFINE FIELD IF NOT EXISTS adminIds ON TABLE chat TYPE array<string>;
        DEFINE FIELD IF NOT EXISTS accentColor ON TABLE chat TYPE string DEFAULT '#3b82f6';
        DEFINE FIELD IF NOT EXISTS adminOnly ON TABLE chat TYPE bool DEFAULT false;
        DEFINE FIELD IF NOT EXISTS isDirect ON TABLE chat TYPE bool DEFAULT false;
        UPDATE chat UNSET name WHERE name = NULL OR name = NONE;

        DEFINE ANALYZER chat_analyzer TOKENIZERS class, blank FILTERS lowercase, ascii;
        DEFINE INDEX name_index ON TABLE chat COLUMNS name SEARCH ANALYZER chat_analyzer BM25;

        DEFINE TABLE IF NOT EXISTS message SCHEMALESS;
        DEFINE TABLE message SCHEMALESS PERMISSIONS FULL;
        DEFINE FIELD IF NOT EXISTS date ON TABLE message TYPE datetime DEFAULT time::now();
        DEFINE FIELD IF NOT EXISTS parentId ON TABLE message TYPE string;
        DEFINE FIELD IF NOT EXISTS parentMessageId ON TABLE message TYPE option<string>;
        DEFINE FIELD IF NOT EXISTS text ON TABLE message TYPE string;
        DEFINE FIELD IF NOT EXISTS attachments ON TABLE message TYPE array<object>;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE message TYPE string;
        UPDATE message UNSET parentMessageId WHERE parentMessageId = NULL OR parentMessageId = NONE;

        DEFINE TABLE IF NOT EXISTS assignment SCHEMALESS;
        DEFINE TABLE assignment SCHEMALESS PERMISSIONS FULL;
        DEFINE FIELD IF NOT EXISTS name ON TABLE assignment TYPE string;
        DEFINE FIELD due ON TABLE assignment TYPE option<datetime>;
        DEFINE FIELD IF NOT EXISTS classId ON TABLE assignment TYPE string;
        DEFINE FIELD IF NOT EXISTS text ON TABLE assignment TYPE string;
        DEFINE FIELD maxMark ON TABLE assignment TYPE option<int>;
        DEFINE FIELD IF NOT EXISTS attachments ON TABLE assignment TYPE array<object>;
        UPDATE assignment UNSET due WHERE due = NULL OR due = NONE;
        UPDATE assignment UNSET maxMark WHERE maxMark = NULL OR maxMark = NONE;

        DEFINE TABLE IF NOT EXISTS submission SCHEMALESS;
        DEFINE TABLE submission SCHEMALESS PERMISSIONS FULL;
        DEFINE FIELD IF NOT EXISTS date ON TABLE submission TYPE datetime DEFAULT time::now();
        DEFINE FIELD IF NOT EXISTS assignmentId ON TABLE submission TYPE string;
        DEFINE FIELD IF NOT EXISTS text ON TABLE submission TYPE string;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE submission TYPE string;
        DEFINE FIELD IF NOT EXISTS attachments ON TABLE submission TYPE array<object>;

        DEFINE TABLE IF NOT EXISTS contribution SCHEMALESS;
        DEFINE TABLE contribution SCHEMALESS PERMISSIONS FULL;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE contribution TYPE string;
        DEFINE FIELD IF NOT EXISTS title ON TABLE contribution TYPE string;
        DEFINE FIELD IF NOT EXISTS description ON TABLE contribution TYPE string;
        DEFINE FIELD IF NOT EXISTS category ON TABLE contribution TYPE string;
        DEFINE FIELD IF NOT EXISTS attachments ON TABLE contribution TYPE array<object>;
        DEFINE FIELD IF NOT EXISTS createdAt ON TABLE contribution TYPE datetime DEFAULT time::now();

        DEFINE TABLE IF NOT EXISTS note_group SCHEMALESS;
        DEFINE TABLE note_group SCHEMALESS PERMISSIONS FULL;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE note_group TYPE string;
        DEFINE FIELD IF NOT EXISTS name ON TABLE note_group TYPE string;
        DEFINE FIELD IF NOT EXISTS description ON TABLE note_group TYPE string;
        DEFINE FIELD IF NOT EXISTS labels ON TABLE note_group TYPE array<string>;
        DEFINE FIELD IF NOT EXISTS accentColor ON TABLE note_group TYPE string DEFAULT '#3b82f6';
        DEFINE FIELD IF NOT EXISTS isPublic ON TABLE note_group TYPE bool DEFAULT false;
        DEFINE FIELD IF NOT EXISTS code ON TABLE note_group TYPE string;
        DEFINE FIELD sourceGroupId ON TABLE note_group TYPE option<string>;
        DEFINE FIELD fetchedAt ON TABLE note_group TYPE option<datetime>;
        DEFINE FIELD IF NOT EXISTS createdAt ON TABLE note_group TYPE datetime DEFAULT time::now();
        UPDATE note_group SET isPublic = false WHERE isPublic = NONE OR isPublic = NULL;

        DEFINE TABLE IF NOT EXISTS note SCHEMALESS;
        DEFINE TABLE note SCHEMALESS PERMISSIONS FULL;
        DEFINE FIELD IF NOT EXISTS groupId ON TABLE note TYPE string;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE note TYPE string;
        DEFINE FIELD IF NOT EXISTS title ON TABLE note TYPE string;
        DEFINE FIELD IF NOT EXISTS content ON TABLE note TYPE string;
        DEFINE FIELD IF NOT EXISTS attachments ON TABLE note TYPE array<object>;
        DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE note TYPE datetime DEFAULT time::now();

        DEFINE TABLE IF NOT EXISTS todo_item SCHEMALESS;
        DEFINE TABLE todo_item SCHEMALESS PERMISSIONS FULL;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE todo_item TYPE string;
        DEFINE FIELD IF NOT EXISTS title ON TABLE todo_item TYPE string;
        DEFINE FIELD IF NOT EXISTS description ON TABLE todo_item TYPE string;
        DEFINE FIELD IF NOT EXISTS status ON TABLE todo_item TYPE string DEFAULT 'todo';
        DEFINE FIELD IF NOT EXISTS priority ON TABLE todo_item TYPE string DEFAULT 'medium';
        DEFINE FIELD dueAt ON TABLE todo_item TYPE option<datetime>;
        DEFINE FIELD IF NOT EXISTS labels ON TABLE todo_item TYPE array<string>;
        DEFINE FIELD IF NOT EXISTS checklist ON TABLE todo_item TYPE array<object>;
        DEFINE FIELD linkedGroupId ON TABLE todo_item TYPE option<string>;
        DEFINE FIELD linkedNoteId ON TABLE todo_item TYPE option<string>;
        DEFINE FIELD IF NOT EXISTS createdAt ON TABLE todo_item TYPE datetime DEFAULT time::now();
        DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE todo_item TYPE datetime DEFAULT time::now();
        UPDATE todo_item UNSET dueAt WHERE dueAt = NULL OR dueAt = NONE;
        UPDATE todo_item UNSET linkedGroupId WHERE linkedGroupId = NULL OR linkedGroupId = NONE;
        UPDATE todo_item UNSET linkedNoteId WHERE linkedNoteId = NULL OR linkedNoteId = NONE;

        DEFINE TABLE IF NOT EXISTS quiz SCHEMALESS;
        DEFINE FIELD IF NOT EXISTS name ON TABLE quiz TYPE string;
        DEFINE FIELD IF NOT EXISTS cost ON TABLE quiz TYPE float DEFAULT 0.0;
        DEFINE FIELD IF NOT EXISTS published ON TABLE quiz TYPE bool DEFAULT false;
        DEFINE FIELD timerMinutes ON TABLE quiz TYPE option<int>;
        DEFINE FIELD IF NOT EXISTS description ON TABLE quiz TYPE string;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE quiz TYPE string;
        DEFINE FIELD IF NOT EXISTS code ON TABLE quiz TYPE string;
        UPDATE quiz UNSET timerMinutes WHERE timerMinutes = NULL OR timerMinutes = NONE;

        DEFINE TABLE IF NOT EXISTS question SCHEMALESS;
        DEFINE FIELD IF NOT EXISTS quizId ON TABLE question TYPE string;
        DEFINE FIELD IF NOT EXISTS text ON TABLE question TYPE string;
        DEFINE FIELD IF NOT EXISTS type ON TABLE question TYPE string DEFAULT 'multiple_choice';
        DEFINE FIELD IF NOT EXISTS attachments ON TABLE question TYPE array<object>;
        DEFINE FIELD IF NOT EXISTS answers ON TABLE question TYPE array<object>;

        DEFINE TABLE IF NOT EXISTS quizsubmission SCHEMALESS;
        DEFINE FIELD IF NOT EXISTS quizId ON TABLE quizsubmission TYPE string;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE quizsubmission TYPE string;
        DEFINE FIELD IF NOT EXISTS answers ON TABLE quizsubmission TYPE array<int>;
        DEFINE FIELD multiAnswers ON TABLE quizsubmission TYPE option<array<array<int>>>;
        DEFINE FIELD textAnswers ON TABLE quizsubmission TYPE option<array<string>>;
        DEFINE FIELD IF NOT EXISTS date ON TABLE quizsubmission TYPE datetime DEFAULT time::now();
        DEFINE FIELD IF NOT EXISTS score ON TABLE quizsubmission TYPE float DEFAULT 0.0;
        UPDATE quizsubmission UNSET multiAnswers WHERE multiAnswers = NULL OR multiAnswers = NONE;
        UPDATE quizsubmission UNSET textAnswers WHERE textAnswers = NULL OR textAnswers = NONE;

        DEFINE TABLE IF NOT EXISTS question_bank SCHEMALESS;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE question_bank TYPE string;
        DEFINE FIELD IF NOT EXISTS name ON TABLE question_bank TYPE string;
        DEFINE FIELD IF NOT EXISTS description ON TABLE question_bank TYPE string;

        DEFINE TABLE IF NOT EXISTS question_bank_item SCHEMALESS;
        DEFINE FIELD IF NOT EXISTS bankId ON TABLE question_bank_item TYPE string;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE question_bank_item TYPE string;
        DEFINE FIELD IF NOT EXISTS text ON TABLE question_bank_item TYPE string;
        DEFINE FIELD IF NOT EXISTS type ON TABLE question_bank_item TYPE string DEFAULT 'multiple_choice';
        DEFINE FIELD IF NOT EXISTS attachments ON TABLE question_bank_item TYPE array<object>;
        DEFINE FIELD IF NOT EXISTS answers ON TABLE question_bank_item TYPE array<object>;

        DEFINE ANALYZER quiz_analyzer TOKENIZERS class, blank FILTERS lowercase, ascii;
        DEFINE INDEX name_index ON TABLE quiz COLUMNS name SEARCH ANALYZER quiz_analyzer BM25;
        DEFINE INDEX desc_index ON TABLE quiz COLUMNS description SEARCH ANALYZER quiz_analyzer BM25;
        DEFINE INDEX code_index ON TABLE quiz COLUMNS code SEARCH ANALYZER quiz_analyzer BM25;

        DEFINE TABLE IF NOT EXISTS flashcard SCHEMALESS;
        DEFINE FIELD IF NOT EXISTS name ON TABLE flashcard TYPE string;
        DEFINE FIELD IF NOT EXISTS cost ON TABLE flashcard TYPE float DEFAULT 0.0;
        DEFINE FIELD IF NOT EXISTS published ON TABLE flashcard TYPE bool DEFAULT false;
        DEFINE FIELD IF NOT EXISTS description ON TABLE flashcard TYPE string;
        DEFINE FIELD IF NOT EXISTS userId ON TABLE flashcard TYPE string;
        DEFINE FIELD IF NOT EXISTS code ON TABLE flashcard TYPE string;

        DEFINE TABLE IF NOT EXISTS flashcard_card SCHEMALESS;
        DEFINE FIELD IF NOT EXISTS front ON TABLE flashcard_card TYPE string;
        DEFINE FIELD IF NOT EXISTS back ON TABLE flashcard_card TYPE string;
        DEFINE FIELD IF NOT EXISTS flashcardId ON TABLE flashcard_card TYPE string;
        DEFINE FIELD IF NOT EXISTS frontAttachments ON TABLE flashcard_card TYPE array<object>;
        DEFINE FIELD IF NOT EXISTS backAttachments ON TABLE flashcard_card TYPE array<object>;
        UPDATE flashcard_card UNSET frontAttachments WHERE frontAttachments = NULL OR frontAttachments = NONE;
        UPDATE flashcard_card UNSET backAttachments WHERE backAttachments = NULL OR backAttachments = NONE;

        DEFINE ANALYZER flashcard_analyzer TOKENIZERS class, blank FILTERS lowercase, ascii;
        DEFINE INDEX name_index ON TABLE flashcard COLUMNS name SEARCH ANALYZER flashcard_analyzer BM25;
        DEFINE INDEX desc_index ON TABLE flashcard COLUMNS description SEARCH ANALYZER flashcard_analyzer BM25;
        DEFINE INDEX code_index ON TABLE flashcard COLUMNS code SEARCH ANALYZER flashcard_analyzer BM25;

        DEFINE TABLE IF NOT EXISTS payment SCHEMALESS;
        DEFINE FIELD IF NOT EXISTS fromId ON TABLE payment TYPE string;
        DEFINE FIELD IF NOT EXISTS toId ON TABLE payment TYPE string;
        DEFINE FIELD IF NOT EXISTS amount ON TABLE payment TYPE float;
        DEFINE FIELD IF NOT EXISTS reason ON TABLE payment TYPE string;
        DEFINE FIELD IF NOT EXISTS reasonType ON TABLE payment TYPE string;
        """
    );
}
