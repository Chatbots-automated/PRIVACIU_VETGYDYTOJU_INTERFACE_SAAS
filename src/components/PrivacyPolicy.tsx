import { SEO, SEOConfigs } from './SEO';

export function PrivacyPolicy() {
  return (
    <>
      <SEO {...SEOConfigs.privacy} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privatumo politika</h1>
          <p className="text-gray-600 mb-8">Paskutinį kartą atnaujinta: 2026-06-16</p>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed mb-6">
              Ši privatumo politika paaiškina, kaip GVET renka, naudoja ir saugo Jūsų asmens duomenis, 
              kai naudojatės svetaine gvet.lt, pildote užklausos formas, kreipiatės dėl GVET demo pristatymo 
              arba naudojatės GVET sistema.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Duomenų valdytojas</h2>
            <p className="text-gray-700 leading-relaxed mb-4">Jūsų asmens duomenų valdytojas:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <p className="text-gray-900 font-semibold mb-2">GVET</p>
              <p className="text-gray-700">El. paštas: info@gvet.lt</p>
              <p className="text-gray-700">Telefonas: +370 XXX XXXXX</p>
              <p className="text-gray-700">Adresas: Lietuva</p>
            </div>
            <p className="text-gray-700 leading-relaxed mb-6">
              Jeigu turite klausimų dėl savo asmens duomenų tvarkymo, galite susisiekti nurodytu el. paštu.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Kokius duomenis renkame</h2>
            <p className="text-gray-700 leading-relaxed mb-4">Galime rinkti šiuos duomenis:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li>vardą ir pavardę;</li>
              <li>telefono numerį;</li>
              <li>el. pašto adresą;</li>
              <li>informaciją apie tai, ar esate veterinarijos gydytojas, ūkio savininkas, ūkio vadovas, darbuotojas ar kitas asmuo;</li>
              <li>informaciją apie Jums aktualius GVET sistemos funkcionalumus;</li>
              <li>informaciją apie veiklos ar ūkio dydį;</li>
              <li>Jūsų pateiktas žinutes, užklausas ar kitą informaciją;</li>
              <li>techninius svetainės naudojimo duomenis, jeigu tokie duomenys renkami svetainės veikimui ar analitikai.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              Naudojantis GVET sistema, priklausomai nuo suteiktų funkcijų, sistemoje taip pat gali būti tvarkomi duomenys, 
              reikalingi veterinarinės veiklos, ūkio procesų, gyvulių duomenų, gydymų, vakcinacijų, vaistų apskaitos, 
              sąskaitų, likučių ir veterinarinių žurnalų valdymui.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Iš kur gauname duomenis</h2>
            <p className="text-gray-700 leading-relaxed mb-4">Duomenis gauname, kai:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li>užpildote formą Facebook / Meta reklamoje;</li>
              <li>užpildote formą gvet.lt svetainėje;</li>
              <li>susisiekiate su mumis el. paštu, telefonu, socialiniuose tinkluose ar kitais kanalais;</li>
              <li>naudojatės GVET sistema;</li>
              <li>suteikiate duomenis demo pristatymo, registracijos, sistemos diegimo ar aptarnavimo metu.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Kokiais tikslais naudojame duomenis</h2>
            <p className="text-gray-700 leading-relaxed mb-4">Jūsų duomenis naudojame šiais tikslais:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li>atsakyti į Jūsų užklausą;</li>
              <li>susisiekti dėl GVET demo video ar sistemos pristatymo;</li>
              <li>suteikti informaciją apie GVET ir GVET PRO paslaugas;</li>
              <li>įvertinti, kuri GVET versija Jums aktuali;</li>
              <li>paruošti pasiūlymą arba suderinti susitikimą;</li>
              <li>administruoti GVET sistemos paskyras;</li>
              <li>teikti, palaikyti ir tobulinti GVET sistemą;</li>
              <li>vykdyti sutartinius įsipareigojimus;</li>
              <li>užtikrinti sistemos saugumą;</li>
              <li>laikytis teisinių pareigų, jeigu jos taikomos.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Teisinis duomenų tvarkymo pagrindas</h2>
            <p className="text-gray-700 leading-relaxed mb-4">Jūsų duomenys tvarkomi remiantis vienu ar keliais iš šių pagrindų:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li>Jūsų sutikimu, kai pateikiate duomenis formoje arba sutinkate gauti informaciją;</li>
              <li>siekiant imtis veiksmų prieš sudarant sutartį, pavyzdžiui, kai prašote demo, pasiūlymo ar konsultacijos;</li>
              <li>sutarties vykdymu, jeigu tampate GVET klientu;</li>
              <li>teisėtu interesu atsakyti į užklausas, palaikyti ryšį su potencialiais klientais, gerinti paslaugas ir užtikrinti sistemos saugumą;</li>
              <li>teisine prievole, kai duomenų tvarkymas reikalingas pagal teisės aktus.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Kam galime perduoti duomenis</h2>
            <p className="text-gray-700 leading-relaxed mb-4">Jūsų duomenys nėra parduodami.</p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Duomenys gali būti perduodami tik tiek, kiek reikia paslaugoms teikti arba užklausoms apdoroti:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li>svetainės, serverių ir techninės infrastruktūros paslaugų teikėjams;</li>
              <li>Meta / Facebook, kai duomenys pateikiami per Meta Instant Form;</li>
              <li>el. pašto, CRM, automatizavimo ar komunikacijos įrankių teikėjams;</li>
              <li>buhalterijos, teisinių ar kitų būtinų paslaugų teikėjams;</li>
              <li>valstybės institucijoms, kai to reikalauja teisės aktai.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              Su paslaugų teikėjais duomenys tvarkomi tik tiek, kiek būtina paslaugoms atlikti.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Duomenų saugojimo terminas</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Užklausų ir demo formų duomenys saugomi iki 24 mėnesių nuo paskutinio kontakto, nebent anksčiau 
              paprašote juos ištrinti arba atsiranda teisėtas pagrindas saugoti ilgiau.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Klientų duomenys saugomi sutarties galiojimo metu ir tiek, kiek būtina po sutarties pabaigos dėl apskaitos, 
              teisinių reikalavimų, ginčų sprendimo ar sistemos veikimo užtikrinimo.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Kai duomenys nebereikalingi, jie ištrinami arba anonimizuojami.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Duomenų saugumas</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Taikome protingas technines ir organizacines priemones, kad apsaugotume Jūsų duomenis nuo neteisėtos prieigos, 
              praradimo, pakeitimo ar atskleidimo.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Prieiga prie duomenų suteikiama tik tiems asmenims ar paslaugų teikėjams, kuriems ji reikalinga konkrečiai 
              funkcijai atlikti.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. Jūsų teisės</h2>
            <p className="text-gray-700 leading-relaxed mb-4">Pagal Bendrąjį duomenų apsaugos reglamentą Jūs turite teisę:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li>gauti informaciją apie savo duomenų tvarkymą;</li>
              <li>susipažinti su savo asmens duomenimis;</li>
              <li>prašyti ištaisyti netikslius ar neišsamius duomenis;</li>
              <li>prašyti ištrinti duomenis;</li>
              <li>apriboti duomenų tvarkymą;</li>
              <li>nesutikti su duomenų tvarkymu;</li>
              <li>atšaukti sutikimą, jeigu duomenys tvarkomi sutikimo pagrindu;</li>
              <li>gauti savo duomenis susistemintu, įprastai naudojamu ir kompiuterio skaitomu formatu;</li>
              <li>pateikti skundą Valstybinei duomenų apsaugos inspekcijai.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              Norėdami pasinaudoti šiomis teisėmis, susisiekite el. paštu: info@gvet.lt
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Slapukai ir analitika</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              gvet.lt svetainėje gali būti naudojami slapukai ar panašios technologijos, reikalingos svetainės veikimui, 
              analitikai arba reklamos efektyvumui vertinti.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Jeigu svetainėje naudojami nebūtini slapukai, lankytojas gali būti paprašytas duoti sutikimą.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Meta / Facebook formos</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Jeigu savo duomenis pateikiate per Facebook arba Meta Instant Form, Jūsų duomenys pirmiausia pateikiami 
              Meta platformoje ir perduodami mums tam, kad galėtume atsakyti į Jūsų užklausą, susisiekti dėl GVET demo 
              video ar pateikti daugiau informacijos apie GVET paslaugas.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Meta taip pat gali tvarkyti Jūsų duomenis pagal savo privatumo politiką.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Privatumo politikos pakeitimai</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Ši privatumo politika gali būti atnaujinama.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Naujausia versija visada skelbiama svetainėje gvet.lt.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Jeigu pakeitimai bus esminiai, galime apie juos informuoti papildomai.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. Kontaktai</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Dėl klausimų apie šią privatumo politiką arba Jūsų asmens duomenų tvarkymą susisiekite:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <p className="text-gray-700">El. paštas: info@gvet.lt</p>
              <p className="text-gray-700">Telefonas: +370 XXX XXXXX</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
