import { SEO, SEOConfigs } from './SEO';

export function PrivacyPolicy() {
  return (
    <>
      <SEO {...SEOConfigs.privacy} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privatumo politika</h1>
          <p className="text-gray-600 mb-8">Paskutinį kartą atnaujinta: 2026-09-25</p>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed mb-6">
              Ši privatumo politika paaiškina, kaip Gratas Gedraitis renka, naudoja ir saugo Jūsų asmens duomenis,
              kai naudojatės GVET, GSistemos ar kitomis teikiamomis sistemų, automatizavimo ir programinės įrangos
              paslaugomis, lankotės interneto svetainėse, pildote užklausos formas, kreipiatės dėl demo, konsultacijos,
              pasiūlymo ar naudojatės teikiamomis sistemomis.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Ši privatumo politika taikoma GVET, GSistemos ir kitoms Grato Gedraičio teikiamoms paslaugoms bei
              projektams, kai nenurodyta kitaip.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Duomenų valdytojas</h2>
            <p className="text-gray-700 leading-relaxed mb-4">Jūsų asmens duomenų valdytojas:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <p className="text-gray-900 font-semibold mb-2">Gratas Gedraitis</p>
              <p className="text-gray-700">Projektai / paslaugos: GVET, GSistemos</p>
              <p className="text-gray-700">El. paštas: gratasgedraitis@gmail.com</p>
              <p className="text-gray-700">Telefonas: +37061175707</p>
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
              <li>įmonės, klinikos, ūkio ar veiklos pavadinimą;</li>
              <li>informaciją apie Jūsų pareigas ar vaidmenį įmonėje;</li>
              <li>informaciją apie įmonės, klinikos, ūkio ar veiklos dydį;</li>
              <li>informaciją apie naudojamas CRM, apskaitos, mokėjimų, el. pašto, rezervacijų, veterinarines ar kitas sistemas;</li>
              <li>informaciją apie procesus, kuriuos norėtumėte automatizuoti, sujungti ar tobulinti;</li>
              <li>informaciją apie Jums aktualius CRM, automatizavimo, integracijų, ataskaitų, veterinarinių ar individualių sistemų sprendimus;</li>
              <li>Jūsų pateiktas žinutes, užklausas ar kitą informaciją;</li>
              <li>techninius svetainių naudojimo duomenis, jeigu tokie duomenys renkami svetainių veikimui, saugumui ar analitikai.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              Naudojantis GVET sistema gali būti tvarkomi duomenys, reikalingi veterinarinei veiklai, klientų ir gyvūnų
              duomenims, gydymams, vakcinacijoms, vaistų apskaitai, atsargoms, sąskaitoms, likučiams, vizitams,
              ataskaitoms ir veterinariniams žurnalams valdyti.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Naudojantis GSistemos ar kitais individualiai kuriamais sprendimais gali būti tvarkomi duomenys, reikalingi
              klientų valdymui, CRM, mokėjimų procesams, automatizacijoms, integracijoms, ataskaitoms, vidiniams verslo
              procesams ir kitoms su konkrečiu projektu susijusioms funkcijoms.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Iš kur gauname duomenis</h2>
            <p className="text-gray-700 leading-relaxed mb-4">Duomenis gauname, kai:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li>užpildote formą Facebook / Meta reklamoje;</li>
              <li>užpildote formą mūsų interneto svetainėse;</li>
              <li>susisiekiate el. paštu, telefonu, socialiniuose tinkluose ar kitais kanalais;</li>
              <li>kreipiatės dėl GVET, GSistemos, CRM, automatizacijos, integracijos ar individualaus programinės įrangos sprendimo;</li>
              <li>naudojatės mūsų sistemomis ar paslaugomis;</li>
              <li>suteikiate duomenis demo pristatymo, konsultacijos, projekto analizės, registracijos, diegimo ar aptarnavimo metu.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Kokiais tikslais naudojame duomenis</h2>
            <p className="text-gray-700 leading-relaxed mb-4">Jūsų duomenis naudojame šiais tikslais:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li>atsakyti į Jūsų užklausą;</li>
              <li>susisiekti dėl GVET, GSistemos ar kitų teikiamų paslaugų;</li>
              <li>pristatyti sistemas, CRM, automatizacijas, integracijas ar kitus sprendimus;</li>
              <li>įvertinti Jūsų verslo, veterinarijos klinikos ar ūkio procesus ir poreikius;</li>
              <li>paruošti pasiūlymą;</li>
              <li>suderinti konsultaciją, demo ar susitikimą;</li>
              <li>projektuoti, diegti, konfigūruoti ir palaikyti individualias sistemas;</li>
              <li>administruoti vartotojų paskyras;</li>
              <li>teikti, palaikyti ir tobulinti sistemas bei paslaugas;</li>
              <li>vykdyti sutartinius įsipareigojimus;</li>
              <li>užtikrinti sistemų, paskyrų ir duomenų saugumą;</li>
              <li>laikytis teisinių pareigų, jeigu jos taikomos.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Teisinis duomenų tvarkymo pagrindas</h2>
            <p className="text-gray-700 leading-relaxed mb-4">Jūsų duomenys tvarkomi remiantis vienu ar keliais iš šių pagrindų:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li>Jūsų sutikimu, kai pateikiate duomenis formoje arba sutinkate gauti informaciją;</li>
              <li>siekiant imtis veiksmų prieš sudarant sutartį, pavyzdžiui, kai prašote demo, pasiūlymo, konsultacijos ar sistemos įvertinimo;</li>
              <li>sutarties vykdymu, jeigu tampate mūsų klientu;</li>
              <li>teisėtu interesu atsakyti į užklausas, palaikyti ryšį su potencialiais klientais, gerinti paslaugas ir užtikrinti sistemų saugumą;</li>
              <li>teisine prievole, kai duomenų tvarkymas reikalingas pagal teisės aktus.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Kam galime perduoti duomenis</h2>
            <p className="text-gray-700 leading-relaxed mb-4">Jūsų duomenys nėra parduodami.</p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Duomenys gali būti perduodami tik tiek, kiek reikia paslaugoms teikti arba užklausoms apdoroti:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li>svetainių, serverių, duomenų bazių ir techninės infrastruktūros paslaugų teikėjams;</li>
              <li>Meta / Facebook, kai duomenys pateikiami per Meta Instant Form;</li>
              <li>el. pašto, CRM, automatizavimo, analitikos ar komunikacijos įrankių teikėjams;</li>
              <li>mokėjimų ar kitų integruojamų paslaugų teikėjams, kai tai reikalinga konkrečiam sprendimui;</li>
              <li>buhalterijos, teisinių ar kitų būtinų paslaugų teikėjams;</li>
              <li>valstybės institucijoms, kai to reikalauja teisės aktai.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              Su paslaugų teikėjais duomenys tvarkomi tik tiek, kiek būtina konkrečiai paslaugai atlikti.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Duomenų saugojimo terminas</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Užklausų, konsultacijų, demo ir pasiūlymų formų duomenys saugomi iki 24 mėnesių nuo paskutinio kontakto,
              nebent anksčiau paprašote juos ištrinti arba atsiranda teisėtas pagrindas saugoti ilgiau.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Klientų duomenys saugomi sutarties galiojimo metu ir tiek, kiek būtina po sutarties pabaigos dėl apskaitos,
              teisinių reikalavimų, ginčų sprendimo, techninio palaikymo ar sistemos veikimo užtikrinimo.
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
              <li>gauti savo duomenis susistemintu, įprastai naudojamu ir kompiuterio skaitomu formatu, kai ši teisė taikoma;</li>
              <li>pateikti skundą Valstybinei duomenų apsaugos inspekcijai.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              Norėdami pasinaudoti šiomis teisėmis, susisiekite el. paštu: gratasgedraitis@gmail.com
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Slapukai ir analitika</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Mūsų interneto svetainėse, įskaitant gvet.lt, gali būti naudojami slapukai ar panašios technologijos,
              reikalingos svetainių veikimui, saugumui, analitikai arba reklamos efektyvumui vertinti.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Jeigu naudojami nebūtini slapukai, lankytojas gali būti paprašytas duoti sutikimą.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Meta / Facebook formos</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Jeigu savo duomenis pateikiate per Facebook arba Meta Instant Form, Jūsų duomenys pirmiausia pateikiami
              Meta platformoje ir perduodami mums tam, kad galėtume atsakyti į Jūsų užklausą ir su Jumis susisiekti.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Duomenys gali būti naudojami susisiekti dėl GVET, GSistemos, CRM, automatizavimo, integracijų, individualių
              verslo sistemų ar kitų mūsų siūlomų paslaugų, priklausomai nuo to, kurią formą užpildėte.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Meta taip pat gali tvarkyti Jūsų duomenis pagal savo privatumo politiką.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Privatumo politikos pakeitimai</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Ši privatumo politika gali būti atnaujinama.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Naujausia privatumo politikos versija skelbiama mūsų interneto svetainėse ir gali būti naudojama mūsų
              teikiamų paslaugų bei Meta / Facebook formose.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Jeigu pakeitimai bus esminiai, galime apie juos informuoti papildomai.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. Kontaktai</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Dėl klausimų apie šią privatumo politiką arba Jūsų asmens duomenų tvarkymą susisiekite:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <p className="text-gray-900 font-semibold mb-2">Gratas Gedraitis</p>
              <p className="text-gray-700">El. paštas: gratasgedraitis@gmail.com</p>
              <p className="text-gray-700">Telefonas: +37061175707</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
