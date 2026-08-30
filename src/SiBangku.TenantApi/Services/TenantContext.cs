using SiBangku.Db;
using SiBangku.Shared.Models;

namespace SiBangku.TenantApi.Services
{
    public class TenantContext
    {
        public Tenant? CurrentTenant { get; set; }
        public TenantDbContext? DbContext { get; set; }
    }
}
