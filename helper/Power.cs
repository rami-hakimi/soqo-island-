// Battery, straight from Windows (GetSystemPowerStatus). Nothing is estimated here: a PC
// without a battery reports present=false, an unknown percentage reports -1.
using System;
using System.Globalization;
using System.Runtime.InteropServices;

static class Power {
  [StructLayout(LayoutKind.Sequential)]
  struct SYSTEM_POWER_STATUS {
    public byte ACLineStatus;      // 0 offline, 1 online, 255 unknown
    public byte BatteryFlag;       // 1 high, 2 low, 4 critical, 8 charging, 128 no system battery, 255 unknown
    public byte BatteryLifePercent; // 0-100, 255 unknown
    public byte SystemStatusFlag;  // 1 = battery saver on
    public int BatteryLifeTime;    // seconds, -1 unknown
    public int BatteryFullLifeTime;
  }
  [DllImport("kernel32.dll")] static extern bool GetSystemPowerStatus(out SYSTEM_POWER_STATUS s);

  // one JSON object for the helper line: {"present":true,"ac":true,"charging":false,"pct":87,"saver":false,"minutes":-1}
  public static string Json() {
    SYSTEM_POWER_STATUS s;
    if (!GetSystemPowerStatus(out s)) return "null";
    bool present = (s.BatteryFlag & 128) == 0 && s.BatteryFlag != 255;
    if (!present) return "{\"present\":false}";
    string ac = s.ACLineStatus == 1 ? "true" : s.ACLineStatus == 0 ? "false" : "null";
    bool charging = (s.BatteryFlag & 8) != 0;
    int pct = s.BatteryLifePercent == 255 ? -1 : Math.Min(100, (int)s.BatteryLifePercent);
    int minutes = s.BatteryLifeTime < 0 ? -1 : s.BatteryLifeTime / 60;
    bool saver = (s.SystemStatusFlag & 1) != 0;
    return "{\"present\":true,\"ac\":" + ac + ",\"charging\":" + (charging ? "true" : "false") + ",\"pct\":" + pct.ToString(CultureInfo.InvariantCulture)
      + ",\"saver\":" + (saver ? "true" : "false") + ",\"minutes\":" + minutes.ToString(CultureInfo.InvariantCulture) + "}";
  }
}
