using Happengo.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHappengo(builder.Configuration);

var app = builder.Build();

app.UseHappengo();

app.Run();

public partial class Program;
