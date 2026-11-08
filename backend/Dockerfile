FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Admission.slnx global.json Directory.Build.props ./
COPY src/Admission.Api/*.csproj src/Admission.Api/
COPY tests/Admission.Tests/*.csproj tests/Admission.Tests/
RUN dotnet restore
COPY . .
RUN dotnet publish src/Admission.Api -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Admission.Api.dll"]
