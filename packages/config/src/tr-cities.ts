/**
 * Static TR il/ilçe reference — no maps API required.
 * All 81 provinces; districts listed for major metros; others use manual district entry.
 */
export type TrDistrict = { code: string; name: string };
export type TrCity = { code: string; name: string; districts: TrDistrict[] };

function d(code: string, name: string): TrDistrict {
  return { code, name };
}

const ISTANBUL_DISTRICTS: TrDistrict[] = [
  d("34-01", "Adalar"),
  d("34-02", "Arnavutköy"),
  d("34-03", "Ataşehir"),
  d("34-04", "Avcılar"),
  d("34-05", "Bağcılar"),
  d("34-06", "Bahçelievler"),
  d("34-07", "Bakırköy"),
  d("34-08", "Başakşehir"),
  d("34-09", "Bayrampaşa"),
  d("34-10", "Beşiktaş"),
  d("34-11", "Beykoz"),
  d("34-12", "Beylikdüzü"),
  d("34-13", "Beyoğlu"),
  d("34-14", "Büyükçekmece"),
  d("34-15", "Çatalca"),
  d("34-16", "Çekmeköy"),
  d("34-17", "Esenler"),
  d("34-18", "Esenyurt"),
  d("34-19", "Eyüpsultan"),
  d("34-20", "Fatih"),
  d("34-21", "Gaziosmanpaşa"),
  d("34-22", "Güngören"),
  d("34-23", "Kadıköy"),
  d("34-24", "Kağıthane"),
  d("34-25", "Kartal"),
  d("34-26", "Küçükçekmece"),
  d("34-27", "Maltepe"),
  d("34-28", "Pendik"),
  d("34-29", "Sancaktepe"),
  d("34-30", "Sarıyer"),
  d("34-31", "Silivri"),
  d("34-32", "Sultanbeyli"),
  d("34-33", "Sultangazi"),
  d("34-34", "Şile"),
  d("34-35", "Şişli"),
  d("34-36", "Tuzla"),
  d("34-37", "Ümraniye"),
  d("34-38", "Üsküdar"),
  d("34-39", "Zeytinburnu"),
];

const ANKARA_DISTRICTS: TrDistrict[] = [
  d("06-01", "Altındağ"),
  d("06-02", "Çankaya"),
  d("06-03", "Etimesgut"),
  d("06-04", "Keçiören"),
  d("06-05", "Mamak"),
  d("06-06", "Sincan"),
  d("06-07", "Yenimahalle"),
  d("06-08", "Gölbaşı"),
  d("06-09", "Pursaklar"),
  d("06-10", "Polatlı"),
];

const IZMIR_DISTRICTS: TrDistrict[] = [
  d("35-01", "Bornova"),
  d("35-02", "Buca"),
  d("35-03", "Çiğli"),
  d("35-04", "Gaziemir"),
  d("35-05", "Karabağlar"),
  d("35-06", "Karşıyaka"),
  d("35-07", "Konak"),
  d("35-08", "Bayraklı"),
  d("35-09", "Balçova"),
  d("35-10", "Narlıdere"),
];

const PROVINCE_NAMES: Record<string, string> = {
  "01": "Adana",
  "02": "Adıyaman",
  "03": "Afyonkarahisar",
  "04": "Ağrı",
  "05": "Amasya",
  "06": "Ankara",
  "07": "Antalya",
  "08": "Artvin",
  "09": "Aydın",
  "10": "Balıkesir",
  "11": "Bilecik",
  "12": "Bingöl",
  "13": "Bitlis",
  "14": "Bolu",
  "15": "Burdur",
  "16": "Bursa",
  "17": "Çanakkale",
  "18": "Çankırı",
  "19": "Çorum",
  "20": "Denizli",
  "21": "Diyarbakır",
  "22": "Edirne",
  "23": "Elazığ",
  "24": "Erzincan",
  "25": "Erzurum",
  "26": "Eskişehir",
  "27": "Gaziantep",
  "28": "Giresun",
  "29": "Gümüşhane",
  "30": "Hakkari",
  "31": "Hatay",
  "32": "Isparta",
  "33": "Mersin",
  "34": "İstanbul",
  "35": "İzmir",
  "36": "Kars",
  "37": "Kastamonu",
  "38": "Kayseri",
  "39": "Kırklareli",
  "40": "Kırşehir",
  "41": "Kocaeli",
  "42": "Konya",
  "43": "Kütahya",
  "44": "Malatya",
  "45": "Manisa",
  "46": "Kahramanmaraş",
  "47": "Mardin",
  "48": "Muğla",
  "49": "Muş",
  "50": "Nevşehir",
  "51": "Niğde",
  "52": "Ordu",
  "53": "Rize",
  "54": "Sakarya",
  "55": "Samsun",
  "56": "Siirt",
  "57": "Sinop",
  "58": "Sivas",
  "59": "Tekirdağ",
  "60": "Tokat",
  "61": "Trabzon",
  "62": "Tunceli",
  "63": "Şanlıurfa",
  "64": "Uşak",
  "65": "Van",
  "66": "Yozgat",
  "67": "Zonguldak",
  "68": "Aksaray",
  "69": "Bayburt",
  "70": "Karaman",
  "71": "Kırıkkale",
  "72": "Batman",
  "73": "Şırnak",
  "74": "Bartın",
  "75": "Ardahan",
  "76": "Iğdır",
  "77": "Yalova",
  "78": "Karabük",
  "79": "Kilis",
  "80": "Osmaniye",
  "81": "Düzce",
};

const EXTRA_DISTRICTS: Record<string, TrDistrict[]> = {
  "34": ISTANBUL_DISTRICTS,
  "06": ANKARA_DISTRICTS,
  "35": IZMIR_DISTRICTS,
  "16": [
    d("16-01", "Nilüfer"),
    d("16-02", "Osmangazi"),
    d("16-03", "Yıldırım"),
    d("16-04", "Mudanya"),
    d("16-05", "Gemlik"),
  ],
  "07": [
    d("07-01", "Muratpaşa"),
    d("07-02", "Kepez"),
    d("07-03", "Konyaaltı"),
    d("07-04", "Alanya"),
    d("07-05", "Manavgat"),
  ],
};

export const trCities: TrCity[] = Object.entries(PROVINCE_NAMES)
  .sort(([a], [b]) => a.localeCompare(b, "tr"))
  .map(([code, name]) => ({
    code,
    name,
    districts: EXTRA_DISTRICTS[code] ?? [],
  }));

export function getTrCity(code: string): TrCity | undefined {
  return trCities.find((c) => c.code === code);
}

export function listTrDistricts(cityCode: string): TrDistrict[] {
  return getTrCity(cityCode)?.districts ?? [];
}

/** When empty, UI should allow manual district name/code entry. */
export function cityNeedsManualDistrict(cityCode: string): boolean {
  return listTrDistricts(cityCode).length === 0;
}
