# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copy Solution structure
COPY SiBangku.slnx ./
COPY src/SiBangku.Shared/SiBangku.Shared.csproj src/SiBangku.Shared/
COPY src/SiBangku.Db/SiBangku.Db.csproj src/SiBangku.Db/
COPY src/SiBangku.ControlApi/SiBangku.ControlApi.csproj src/SiBangku.ControlApi/

# Restore dependencies
RUN dotnet restore src/SiBangku.ControlApi/SiBangku.ControlApi.csproj

# Copy source code files
COPY src/SiBangku.Shared/ src/SiBangku.Shared/
COPY src/SiBangku.Db/ src/SiBangku.Db/
COPY src/SiBangku.ControlApi/ src/SiBangku.ControlApi/

# Compile and Publish
RUN dotnet publish src/SiBangku.ControlApi/SiBangku.ControlApi.csproj -c Release -o out

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/out ./

EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENTRYPOINT ["dotnet", "SiBangku.ControlApi.dll"]
