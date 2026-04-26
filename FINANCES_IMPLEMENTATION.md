# Finansų Sistema - Implementacija

## Sukurta: 2026-04-26

### Pridėti Komponentai

#### 1. Duomenų Bazė
**Failas:** `supabase/migrations_saas/20260426000001_add_finances_system.sql`

Sukurtos lentelės:
- `service_prices` - Kainų lentelė veterinarinėms paslaugoms pagal gydytoją
- `service_invoices` - Išsiųstos paslaugų sąskaitos ūkiams
- `visit_charges` - Mokesčiai už vizitus (paslaugos ir produktai)

Sukurtos view'sai:
- `vw_unpaid_charges_by_farm` - Neapmokėti mokesčiai pagal ūkį
- `vw_invoice_summary` - Sąskaitų suvestinė
- `vw_revenue_by_vet` - Pajamos pagal veterinarą

Funkcijos:
- `generate_invoice_number(p_client_id)` - Generuoja sąskaitos numerį (formatas: SF-2026-0001)

#### 2. Frontend Komponentai

**A. PricingModal.tsx**
- Pasirodo po vizito užbaigimo
- Leidžia įkainoti paslaugas ir produktus
- Automatiškai užkrauna veterinaro numatytas kainas
- Siūlo 30% antkaini produktams
- Gali praleisti ir įkainoti vėliau

**B. FinancesModule.tsx**
- 3 pagrindiniai skirtukai:
  1. **Neapmokėti mokesčiai** - Rodo visus neapmokėtus mokesčius pagal ūkį
  2. **Sąskaitos faktūros** - Rodo visas sugeneruotas sąskaitas su statusais
  3. **Kainų valdymas** - Kiekvienas veterinaras gali valdyti savo paslaugų kainas

Funkcionalumas:
- Pažymėti mokesčius sąskaitai
- Generuoti sąskaitas su PVM
- Filtruoti pagal datų intervalą
- Peržiūrėti sąskaitas

**C. Layout.tsx**
- Pridėtas "Finansai" meniu punktas su Receipt ikona
- Leidimas: 'view'

**D. VeterinaryModule.tsx**
- Pridėtas 'finances' atvejis renderView() funkcijoje
- Rodo FinancesModule komponentą

**E. AnimalDetailSidebar.tsx**
- Importuotas PricingModal
- Pridėti state kintamieji `showPricingModal` ir `pricingModalData`
- Po sėkmingo vizito užbaigimo (`status === 'Baigtas'`) automatiškai atidaro kainų modalą
- Surenka visus panaudotus produktus (gydymo, vakcinacijos, profilaktikos)
- Perduoda visą reikiamą informaciją į PricingModal

### Kaip Naudoti

#### 1. Nustatykite kainas
1. Eiti į Finansai → Kainų valdymas
2. Įvesti savo standartines kainas kiekvienai procedūrai
3. Kainos automatiškai bus naudojamos naujuose vizituose

#### 2. Įkainokite vizitą
Kai užbaigiamas vizitas (status = 'Baigtas'):
1. Automatiškai pasirodo kainų modalas
2. Rodomos visos atliktos procedūros su numatytomis kainomis
3. Rodomi visi panaudoti produktai su siūloma kaina (savikaina + 30%)
4. Galite redaguoti kainas rankiniu būdu
5. Pridėti papildomus produktus jei reikia
6. Išsaugoti arba praleisti (įkainoti vėliau)

#### 3. Generuokite sąskaitą
1. Eiti į Finansai → Neapmokėti mokesčiai
2. Pasirinkti ūkį
3. Įvesti datų intervalą (nuo-iki)
4. Pažymėti mokesčius kuriuos norite įtraukti į sąskaitą
5. Spausti "Sukurti sąskaitą"
6. Sistema automatiškai:
   - Sugeneruoja sąskaitos numerį
   - Apskaičiuoja PVM (21%)
   - Sukuria sąskaitą su statusu "juodraštis"
   - Pažymi mokesčius kaip apmokėtus

#### 4. Peržiūrėkite sąskaitas
1. Eiti į Finansai → Sąskaitos faktūros
2. Matysite visas sugeneruotas sąskaitas
3. Statusai:
   - **Juodraštis** - Nauja sąskaita
   - **Išsiųsta** - Išsiųsta ūkiui
   - **Apmokėta** - Gautas apmokėjimas
   - **Atšaukta** - Atšaukta sąskaita

### Duomenų Struktūra

#### service_prices
```sql
- id (uuid)
- client_id (uuid)
- vet_user_id (uuid)
- procedure_type (text) -- 'Gydymas', 'Vakcina', 'Profilaktika', 'Nagai', etc.
- base_price (numeric)
- description (text)
- active (boolean)
```

#### visit_charges
```sql
- id (uuid)
- client_id (uuid)
- farm_id (uuid)
- visit_id (uuid)
- animal_id (uuid)
- invoice_id (uuid)
- charge_type (text) -- 'paslauga' arba 'produktas'
- procedure_type (text)
- product_id (uuid)
- product_name (text)
- description (text)
- quantity (numeric)
- unit_price (numeric)
- total_price (numeric)
- invoiced (boolean)
```

#### service_invoices
```sql
- id (uuid)
- client_id (uuid)
- farm_id (uuid)
- invoice_number (text) -- SF-2026-0001
- invoice_date (date)
- date_from (date)
- date_to (date)
- subtotal (numeric)
- vat_rate (numeric) -- 21.00
- vat_amount (numeric)
- total_amount (numeric)
- status (text) -- 'juodraštis', 'išsiųsta', 'apmokėta', 'atšaukta'
- payment_date (date)
- pdf_path (text)
- notes (text)
- created_by (uuid)
```

### Atnaujinimai

#### Migracija
```bash
# Paleiskite naują migraciją:
supabase db push

# Arba per Supabase Dashboard:
# SQL Editor → Naujas Query → Įklijuokite migrations_saas/20260426000001_add_finances_system.sql turinį → Run
```

### Būsimi Patobulinimai

1. **PDF Generavimas**
   - Sąskaitų eksportavimas į PDF formatą
   - Su ūkio ir veterinaro informacija
   - Mokėjimo instrukcijos

2. **Apmokėjimų Sekimas**
   - Mokėjimų istorija
   - Automatinis statusų atnaujinimas
   - Priminimas apie neapmokėtas sąskaitas

3. **Analitika**
   - Pajamų ataskaitos pagal laikotarpį
   - Palyginimas tarp gydytojų
   - Populiariausios paslaugos

4. **Email Integracija**
   - Automatinis sąskaitų siuntimas el. paštu
   - Mokėjimo patvirtinimai

5. **Sutarčių Kainos**
   - Specialios kainos tam tikriems ūkiams
   - Mėnesinės prenumeratos
   - Nuolaidos už didelius kiekius

### Pastabos

- Visos kainos eurais (€)
- PVM tarifas: 21%
- Produktų siūlomas antkainis: 30% (redaguojamas)
- Sąskaitos numerio formatas: SF-YYYY-NNNN
- Visi veiksmai audituojami
