# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copy Solution structure
COPY SiBangku.slnx ./
COPY src/SiBangku.Shared/SiBangku.Shared.csproj src/SiBangku.Shared/
COPY src/SiBangku.Db/SiBangku.Db.csproj src/SiBangku.Db/
COPY src/SiBangku.Worker/SiBangku.Worker.csproj src/SiBangku.Worker/

# Restore dependencies
RUN dotnet restore src/SiBangku.Worker/SiBangku.Worker.csproj

# Copy source code files
COPY src/SiBangku.Shared/ src/SiBangku.Shared/
COPY src/SiBangku.Db/ src/SiBangku.Db/
COPY src/SiBangku.Worker/ src/SiBangku.Worker/

# Compile and Publish
RUN dotnet publish src/SiBangku.Worker/SiBangku.Worker.csproj -c Release -o out

# Runtime Stage
FROM mcr.microsoft.com/dotnet/runtime:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/out ./

ENTRYPOINT ["dotnet", "SiBangku.Worker.dll"]
