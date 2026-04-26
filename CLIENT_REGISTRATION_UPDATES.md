# Client Self-Registration Updates

## Summary
Updated the client registration flow so that clients can fill in their own organization information when they register with a registration code. Everything is now in Lithuanian.

## Changes Made

### 1. **ClientRegistration.tsx** - Complete Lithuanian Translation & Enhanced Form

#### New Organization Fields Added:
- ✅ **Organizacijos pavadinimas** (Organization Name) - Required
- ✅ **Įmonės kodas** (Company Code)
- ✅ **PVM kodas** (VAT Code)
- ✅ **El. paštas** (Contact Email) - Required
- ✅ **Telefonas** (Contact Phone)
- ✅ **Kontaktinis asmuo** (Contact Person)
- ✅ **Gatvė** (Address)
- ✅ **Miestas** (City)
- ✅ **Pašto kodas** (Postal Code)

#### Form Organization:
The form is now organized into clear sections:
1. **Pagrindinė informacija** (Basic Information)
   - Organization name, company code, VAT code
2. **Kontaktinė informacija** (Contact Information)
   - Email, phone, contact person
3. **Adresas** (Address)
   - Street, city, postal code
4. **Jūsų paskyros duomenys** (Your Account Details)
   - Full name, email, password

#### All Text Translated to Lithuanian:
- ✅ "Tikrinamas registracijos kodas..." (Validating registration code)
- ✅ "Neteisingas registracijos kodas" (Invalid registration code)
- ✅ "Įveskite registracijos kodą" (Enter registration code)
- ✅ "Patikrinti kodą" (Validate code)
- ✅ "Registracija sėkminga!" (Registration complete)
- ✅ "Nukreipiame į prisijungimo puslapį..." (Redirecting to login)
- ✅ "Sveiki prisijungę" (Welcome)
- ✅ "Sukurkite paskyrą, kad pradėtumėte naudotis sistema" (Create account to get started)
- ✅ "Kuriama paskyra..." (Creating account)
- ✅ "Sukurti paskyrą" (Create account)

#### Error Messages in Lithuanian:
- ✅ "Neteisingas arba pasibaigęs registracijos kodas"
- ✅ "Prašome užpildyti visus privalomas laukus"
- ✅ "Prašome užpildyti organizacijos pavadinimą ir el. paštą"
- ✅ "Slaptažodžiai nesutampa"
- ✅ "Slaptažodis turi būti ne trumpesnis nei 8 simboliai"
- ✅ "Šis el. paštas jau užregistruotas"
- ✅ "Klientas pasiekė maksimalų vartotojų skaičių"
- ✅ "Nepavyko atnaujinti organizacijos informacijos"

#### Validation:
- Organization name is required
- Contact email is required
- All organization information is saved to the database when client registers
- User email and password validation remains

#### Database Updates:
The registration now saves ALL client information to the `clients` table:
```typescript
{
  name: string,              // Required
  company_code: string?,     // Optional
  vat_code: string?,         // Optional
  contact_email: string,     // Required
  contact_phone: string?,    // Optional
  contact_person: string?,   // Optional
  address: string?,          // Optional
  city: string?,             // Optional
  postal_code: string?       // Optional
}
```

## How It Works Now

### Step 1: Admin Creates Client
Admin creates a client in AdminDashboard and generates a registration code.

### Step 2: Client Receives Code
Client receives registration code (e.g., ABCD-1234-WXYZ)

### Step 3: Client Self-Registration
1. Client visits registration page with code
2. System validates code
3. Client fills in:
   - **Organization information** (name, company code, VAT, email, phone, contact person, address)
   - **Personal account details** (name, email, password)
4. Client submits form
5. System:
   - Updates client record with all organization details
   - Creates user account
   - Logs client in automatically

### Step 4: Client Logs In
Client is automatically redirected to login page with their email pre-filled.

## Benefits

1. **Client Ownership**: Clients fill in their own information, ensuring accuracy
2. **Less Admin Work**: Admin only needs to create basic client record and share code
3. **Complete Information**: All organization details captured during registration
4. **User-Friendly**: Clear sections, Lithuanian language, helpful placeholders
5. **Validation**: Required fields ensure minimum data quality
6. **Security**: Registration code must be valid and active

## Required Fields (Marked with *)
- Organizacijos pavadinimas (Organization Name)
- El. paštas (Contact Email)
- Vardas ir pavardė (User Full Name)
- El. paštas (User Email)
- Slaptažodis (Password)
- Pakartokite slaptažodį (Confirm Password)

## Optional Fields
- Įmonės kodas (Company Code)
- PVM kodas (VAT Code)
- Telefonas (Phone)
- Kontaktinis asmuo (Contact Person)
- Gatvė (Address)
- Miestas (City)
- Pašto kodas (Postal Code)

## Testing Checklist

- [ ] Code validation works
- [ ] Invalid code shows Lithuanian error
- [ ] Required fields validated
- [ ] Optional fields can be left empty
- [ ] All data saves to database
- [ ] User account created successfully
- [ ] Auto-login works
- [ ] All text in Lithuanian
- [ ] Form layout is clear and organized
- [ ] Mobile responsive

## Notes

- AdminDashboard remains in English (for admin users)
- ClientRegistration is now fully in Lithuanian (for clients)
- All validation messages are user-friendly
- Form is organized in logical sections
- Placeholders provide examples for each field
