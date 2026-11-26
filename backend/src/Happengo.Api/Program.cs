using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Persistence;

var migrate = args is ["--migrate-azure"];
var builder = WebApplication.CreateBuilder(migrate ? [] : args);

builder.Services.AddHappengo(builder.Configuration, builder.Environment);

var app = builder.Build();

if (migrate)
{
    await using (app)
    {
        await AzurePostgres.MigrateAsync(app.Services);
    }
    return;
}

app.UseHappengo();

app.Run();

public partial class Program;
