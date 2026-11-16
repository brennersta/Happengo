FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Happengo.sln ./
COPY src/Happengo.Api/Happengo.Api.csproj src/Happengo.Api/
RUN dotnet restore src/Happengo.Api/Happengo.Api.csproj
COPY src/Happengo.Api/ src/Happengo.Api/
RUN dotnet publish src/Happengo.Api/Happengo.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "Happengo.Api.dll"]
