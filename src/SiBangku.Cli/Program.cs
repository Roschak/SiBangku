using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

namespace SiBangku.Cli
{
    class Program
    {
        private static string ConfigPath => Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), 
            ".sibangku-cli-config.json"
        );

        private static string ControlApiUrl = Environment.GetEnvironmentVariable("CONTROL_API_URL") ?? "http://localhost:3001";
        private static readonly HttpClient Client = new HttpClient();

        static async Task<int> Main(string[] args)
        {
            if (args.Length == 0)
            {
                PrintHelp();
                return 0;
            }

            var command = args[0].ToLowerInvariant();

            try
            {
                // Ensure auth token is loaded for commands other than login/help
                if (command != "login" && command != "help")
                {
                    var token = LoadToken();
                    if (string.IsNullOrEmpty(token))
                    {
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine("Error: Anda belum login. Silakan jalankan perintah: sibangku-cli login <email> <password>");
                        Console.ResetColor();
                        return 1;
                    }
                    Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
                }

                switch (command)
                {
                    case "login":
                        if (args.Length < 3)
                        {
                            Console.WriteLine("Penggunaan: sibangku-cli login <email> <password>");
                            return 1;
                        }
                        return await HandleLoginAsync(args[1], args[2]);

                    case "tenant":
                        if (args.Length < 2)
                        {
                            Console.WriteLine("Penggunaan: sibangku-cli tenant <list|create|extend|delete>");
                            return 1;
                        }
                        var subCommand = args[1].ToLowerInvariant();
                        return subCommand switch
                        {
                            "list" => await HandleTenantListAsync(),
                            "create" => await HandleTenantCreateAsync(args),
                            "extend" => await HandleTenantExtendAsync(args),
                            "delete" => await HandleTenantDeleteAsync(args),
                            _ => UnknownCommand()
                        };

                    case "audit":
                        return await HandleAuditListAsync();

                    case "help":
                        PrintHelp();
                        return 0;

                    default:
                        return UnknownCommand();
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"Error: Gagal menjalankan operasi. {ex.Message}");
                Console.ResetColor();
                return 1;
            }
        }

        private static int UnknownCommand()
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("Error: Perintah tidak dikenali.");
            Console.ResetColor();
            PrintHelp();
            return 1;
        }

        private static void PrintHelp()
        {
            Console.WriteLine("====================================================");
            Console.WriteLine(" SiBangku Administrative CLI Tool (C# v2.0.0)");
            Console.WriteLine("====================================================");
            Console.WriteLine("Daftar Perintah:");
            Console.WriteLine("  login <email> <password>           Autentikasi sesi administratif.");
            Console.WriteLine("  tenant list                       Menampilkan seluruh penyewa/tenant.");
            Console.WriteLine("  tenant create <name> <resto> <email> [days]");
            Console.WriteLine("                                    Membuat/provisioning tenant baru.");
            Console.WriteLine("  tenant extend <tenantId> <days>   Memperpanjang masa trial tenant.");
            Console.WriteLine("  tenant delete <tenantId>          Menghapus data & DB tenant.");
            Console.WriteLine("  audit                             Menampilkan log aktivitas platform.");
            Console.WriteLine("  help                              Menampilkan menu bantuan ini.");
            Console.WriteLine("====================================================");
        }

        private static string? LoadToken()
        {
            if (!File.Exists(ConfigPath)) return null;
            try
            {
                var content = File.ReadAllText(ConfigPath);
                using var doc = JsonDocument.Parse(content);
                return doc.RootElement.GetProperty("token").GetString();
            }
            catch
            {
                return null;
            }
        }

        private static void SaveToken(string token)
        {
            var data = new { token, savedAt = DateTime.UtcNow };
            var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(ConfigPath, json);
        }

        private static async Task<int> HandleLoginAsync(string email, string password)
        {
            Console.WriteLine($"Menghubungkan ke Control API di {ControlApiUrl}...");
            var response = await Client.PostAsJsonAsync($"{ControlApiUrl}/api/v1/auth/login", new { email, password });
            
            if (!response.IsSuccessStatusCode)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("Login Gagal! Periksa email dan password Anda.");
                Console.ResetColor();
                return 1;
            }

            var resBody = await response.Content.ReadFromJsonAsync<JsonElement>();
            var token = resBody.GetProperty("data").GetProperty("token").GetString();
            
            if (string.IsNullOrEmpty(token))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("Login Gagal! Token kosong.");
                Console.ResetColor();
                return 1;
            }

            SaveToken(token);

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("Login Berhasil! Token disimpan di user profile.");
            Console.ResetColor();
            return 0;
        }

        private static async Task<int> HandleTenantListAsync()
        {
            Console.WriteLine("Mengambil data tenant...");
            var response = await Client.GetAsync($"{ControlApiUrl}/api/v1/tenants");

            if (!response.IsSuccessStatusCode)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"Error: Gagal mengambil data ({response.StatusCode})");
                Console.ResetColor();
                return 1;
            }

            var doc = await response.Content.ReadFromJsonAsync<JsonElement>();
            var tenants = doc.GetProperty("data");

            Console.WriteLine("\n------------------------------------------------------------------------------------------------------------");
            Console.WriteLine(string.Format("| {0,-15} | {1,-15} | {2,-15} | {3,-10} | {4,-15} | {5,-20} |", "Tenant ID", "Tenant Code", "Restaurant", "Status", "Sub Status", "Database"));
            Console.WriteLine("------------------------------------------------------------------------------------------------------------");

            foreach (var t in tenants.EnumerateArray())
            {
                var id = t.GetProperty("tenantId").GetString();
                var code = t.GetProperty("tenantCode").GetString();
                var restaurant = t.GetProperty("restaurantName").GetString();
                var status = t.GetProperty("status").GetString();
                var subStatus = t.GetProperty("subscriptionStatus").GetString();
                var database = t.GetProperty("databaseIdentifier").GetString();

                Console.WriteLine(string.Format("| {0,-15} | {1,-15} | {2,-15} | {3,-10} | {4,-15} | {5,-20} |", 
                    id?.Length > 15 ? id.Substring(0, 12) + "..." : id,
                    code?.Length > 15 ? code.Substring(0, 12) + "..." : code,
                    restaurant?.Length > 15 ? restaurant.Substring(0, 12) + "..." : restaurant,
                    status, subStatus, database));
            }
            Console.WriteLine("------------------------------------------------------------------------------------------------------------\n");

            return 0;
        }

        private static async Task<int> HandleTenantCreateAsync(string[] args)
        {
            if (args.Length < 5)
            {
                Console.WriteLine("Penggunaan: sibangku-cli tenant create <tenantName> <restaurantName> <adminEmail> [trialDays]");
                return 1;
            }

            var tenantName = args[2];
            var restaurantName = args[3];
            var adminEmail = args[4];
            var trialDays = args.Length > 5 && int.TryParse(args[5], out var days) ? days : 60;

            Console.WriteLine($"Mengirim permintaan provisioning untuk '{tenantName}'...");
            
            var payload = new { tenantName, restaurantName, adminEmail, trialDays };
            var response = await Client.PostAsJsonAsync($"{ControlApiUrl}/api/v1/tenants", payload);

            if (!response.IsSuccessStatusCode)
            {
                var errBody = await response.Content.ReadAsStringAsync();
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"Error: Provisioning gagal ({response.StatusCode}). Detail: {errBody}");
                Console.ResetColor();
                return 1;
            }

            var doc = await response.Content.ReadFromJsonAsync<JsonElement>();
            var data = doc.GetProperty("data");

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("\n=== Provisioning Tenant Sukses ===");
            Console.WriteLine($"ID Tenant    : {data.GetProperty("tenantId").GetString()}");
            Console.WriteLine($"Kode Tenant  : {data.GetProperty("tenantCode").GetString()}");
            Console.WriteLine($"Database     : {data.GetProperty("databaseName").GetString()}");
            Console.WriteLine($"Email Admin  : {data.GetProperty("adminEmail").GetString()}");
            Console.WriteLine($"Password Pjs : {data.GetProperty("temporaryPassword").GetString()}");
            Console.WriteLine("===================================\n");
            Console.ResetColor();

            return 0;
        }

        private static async Task<int> HandleTenantExtendAsync(string[] args)
        {
            if (args.Length < 4)
            {
                Console.WriteLine("Penggunaan: sibangku-cli tenant extend <tenantId> <days>");
                return 1;
            }

            var tenantId = args[2];
            if (!int.TryParse(args[3], out var days))
            {
                Console.WriteLine("Error: Jumlah hari perpanjangan harus berupa angka.");
                return 1;
            }

            Console.WriteLine($"Memperpanjang trial tenant {tenantId} sebanyak {days} hari...");
            var response = await Client.PatchAsJsonAsync($"{ControlApiUrl}/api/v1/tenants/{tenantId}/extend-trial", new { days });

            if (!response.IsSuccessStatusCode)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"Error: Gagal memperpanjang trial ({response.StatusCode})");
                Console.ResetColor();
                return 1;
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("Sukses: Trial tenant berhasil diperpanjang.");
            Console.ResetColor();
            return 0;
        }

        private static async Task<int> HandleTenantDeleteAsync(string[] args)
        {
            if (args.Length < 3)
            {
                Console.WriteLine("Penggunaan: sibangku-cli tenant delete <tenantId>");
                return 1;
            }

            var tenantId = args[2];

            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.Write($"Apakah Anda yakin ingin menghapus permanen tenant ID {tenantId}? Tindakan ini akan menghapus database fisik! (y/N): ");
            Console.ResetColor();
            var confirm = Console.ReadLine();

            if (confirm?.ToLowerInvariant() != "y")
            {
                Console.WriteLine("Dibatalkan.");
                return 0;
            }

            Console.WriteLine($"Menghapus tenant {tenantId}...");
            var response = await Client.DeleteAsync($"{ControlApiUrl}/api/v1/tenants/{tenantId}");

            if (!response.IsSuccessStatusCode)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"Error: Gagal menghapus tenant ({response.StatusCode})");
                Console.ResetColor();
                return 1;
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("Sukses: Tenant dan database fisiknya berhasil dihapus.");
            Console.ResetColor();
            return 0;
        }

        private static async Task<int> HandleAuditListAsync()
        {
            Console.WriteLine("Mengambil data audit log...");
            var response = await Client.GetAsync($"{ControlApiUrl}/api/v1/audit");

            if (!response.IsSuccessStatusCode)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"Error: Gagal mengambil data audit ({response.StatusCode})");
                Console.ResetColor();
                return 1;
            }

            var doc = await response.Content.ReadFromJsonAsync<JsonElement>();
            var logs = doc.GetProperty("data");

            Console.WriteLine("\n------------------------------------------------------------------------------------------------------------");
            Console.WriteLine(string.Format("| {0,-25} | {1,-15} | {2,-15} | {3,-15} |", "Timestamp", "User ID", "Tenant ID", "Action"));
            Console.WriteLine("------------------------------------------------------------------------------------------------------------");

            foreach (var l in logs.EnumerateArray())
            {
                var createdAt = l.GetProperty("createdAt").GetDateTime().ToLocalTime().ToString("g");
                var userId = l.GetProperty("userId").GetString();
                var tenantId = l.GetProperty("tenantId").GetString();
                var action = l.GetProperty("action").GetString();

                Console.WriteLine(string.Format("| {0,-25} | {1,-15} | {2,-15} | {3,-15} |", 
                    createdAt,
                    userId?.Length > 15 ? userId.Substring(0, 12) + "..." : userId,
                    tenantId?.Length > 15 ? tenantId.Substring(0, 12) + "..." : tenantId,
                    action));
            }
            Console.WriteLine("------------------------------------------------------------------------------------------------------------\n");

            return 0;
        }
    }
}
