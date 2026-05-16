export interface CountryInfo {
  code: string; name: string; flag: string; dialCode: string;
  bgColor: string; textColor: string; borderColor: string;
}
const COUNTRIES: { prefix: string; info: CountryInfo }[] = [
  { prefix: "+92",  info: { code:"PK", name:"Pakistan",     flag:"🇵🇰", dialCode:"+92",  bgColor:"#e8f5e9", textColor:"#1b5e20", borderColor:"#a5d6a7" } },
  { prefix: "+971", info: { code:"AE", name:"UAE",          flag:"🇦🇪", dialCode:"+971", bgColor:"#e3f2fd", textColor:"#0d47a1", borderColor:"#90caf9" } },
  { prefix: "+966", info: { code:"SA", name:"Saudi Arabia", flag:"🇸🇦", dialCode:"+966", bgColor:"#fff3e0", textColor:"#e65100", borderColor:"#ffcc80" } },
  { prefix: "+974", info: { code:"QA", name:"Qatar",        flag:"🇶🇦", dialCode:"+974", bgColor:"#fce4ec", textColor:"#880e4f", borderColor:"#f48fb1" } },
  { prefix: "+965", info: { code:"KW", name:"Kuwait",       flag:"🇰🇼", dialCode:"+965", bgColor:"#e0f7fa", textColor:"#006064", borderColor:"#80deea" } },
  { prefix: "+973", info: { code:"BH", name:"Bahrain",      flag:"🇧🇭", dialCode:"+973", bgColor:"#f3e5f5", textColor:"#4a148c", borderColor:"#ce93d8" } },
  { prefix: "+968", info: { code:"OM", name:"Oman",         flag:"🇴🇲", dialCode:"+968", bgColor:"#fbe9e7", textColor:"#bf360c", borderColor:"#ffab91" } },
  { prefix: "+44",  info: { code:"GB", name:"UK",           flag:"🇬🇧", dialCode:"+44",  bgColor:"#e8eaf6", textColor:"#1a237e", borderColor:"#9fa8da" } },
  { prefix: "+1",   info: { code:"US", name:"USA",          flag:"🇺🇸", dialCode:"+1",   bgColor:"#e3f2fd", textColor:"#1565c0", borderColor:"#90caf9" } },
  { prefix: "+91",  info: { code:"IN", name:"India",        flag:"🇮🇳", dialCode:"+91",  bgColor:"#fff8e1", textColor:"#f57f17", borderColor:"#ffe082" } },
  { prefix: "+90",  info: { code:"TR", name:"Turkey",       flag:"🇹🇷", dialCode:"+90",  bgColor:"#ffebee", textColor:"#b71c1c", borderColor:"#ef9a9a" } },
  { prefix: "+880", info: { code:"BD", name:"Bangladesh",   flag:"🇧🇩", dialCode:"+880", bgColor:"#e8f5e9", textColor:"#2e7d32", borderColor:"#a5d6a7" } },
  { prefix: "+93",  info: { code:"AF", name:"Afghanistan",  flag:"🇦🇫", dialCode:"+93",  bgColor:"#f3e5f5", textColor:"#6a1b9a", borderColor:"#ce93d8" } },
];
export function getCountryFromPhone(phone: string): CountryInfo | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-().]/g, "");
  const sorted = [...COUNTRIES].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const { prefix, info } of sorted) {
    if (cleaned.startsWith(prefix)) return info;
  }
  if (/^(0092|0\d{10})/.test(cleaned)) return COUNTRIES[0].info;
  return null;
}
