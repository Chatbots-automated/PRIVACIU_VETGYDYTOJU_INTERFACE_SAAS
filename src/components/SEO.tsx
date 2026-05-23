import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEO({
  title = 'GVET - Veterinarinės Apskaitos Sistema Ūkių Veterinarams',
  description = 'GVET – profesionali veterinarinės apskaitos sistema ūkių veterinarams Lietuvoje. Galvijų, kiaulių, avių gydymo įrašai, vaistų sandėlio valdymas, privalomi žurnalai pagal LR reikalavimus.',
  keywords = 'GVET, veterinarija, veterinarinės apskaitos sistema, ūkių veterinarai, gyvulių gydymas, vaistų apskaita',
  image = 'https://gvet.lt/assets/gvet-logo.png',
  url = 'https://gvet.lt',
  type = 'website'
}: SEOProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta tags
    updateMetaTag('name', 'description', description);
    updateMetaTag('name', 'keywords', keywords);
    
    // Open Graph
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:image', image);
    updateMetaTag('property', 'og:url', url);
    updateMetaTag('property', 'og:type', type);
    
    // Twitter Card
    updateMetaTag('name', 'twitter:title', title);
    updateMetaTag('name', 'twitter:description', description);
    updateMetaTag('name', 'twitter:image', image);
    updateMetaTag('name', 'twitter:url', url);
    
    // Canonical URL
    updateCanonicalLink(url);
  }, [title, description, keywords, image, url, type]);

  return null;
}

function updateMetaTag(attribute: string, key: string, content: string) {
  let element = document.querySelector(`meta[${attribute}="${key}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

function updateCanonicalLink(url: string) {
  let element = document.querySelector('link[rel="canonical"]');
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  
  element.setAttribute('href', url);
}

// Pre-defined SEO configurations for different pages
export const SEOConfigs = {
  home: {
    title: 'GVET - Veterinarinės Apskaitos Sistema Ūkių Veterinarams | Gyvulių Gydymo Valdymas',
    description: 'GVET – profesionali veterinarinės apskaitos sistema ūkių veterinarams Lietuvoje. Galvijų, kiaulių, avių gydymo įrašai, vaistų sandėlio valdymas, privalomi žurnalai pagal LR reikalavimus.',
    keywords: 'GVET, veterinarija, veterinarinės apskaitos sistema, ūkių veterinarai, gyvulių gydymas, vaistų apskaita, veterinarijos programa',
    url: 'https://gvet.lt'
  },
  login: {
    title: 'Prisijungimas | GVET Veterinarinės Apskaitos Sistema',
    description: 'Prisijunkite prie GVET veterinarinės apskaitos sistemos. Valdykite gyvulių gydymą, sandėlį ir generuokite privalomus žurnalus.',
    url: 'https://gvet.lt/login'
  },
  register: {
    title: 'Registracija | GVET Veterinarinės Apskaitos Sistema',
    description: 'Užsiregistruokite GVET sistemoje ir pradėkite naudotis profesionalia veterinarinės apskaitos sistema. 7 dienų nemokamas bandomasis laikotarpis.',
    url: 'https://gvet.lt/register'
  },
  vetpraktika: {
    title: 'Veterinarijos Praktika | GVET Sistema',
    description: 'Valdykite veterinarijos praktiką su GVET. Gyvūnų gydymo įrašai, vizitai, sveikatos istorija ir vizitų kainodara.',
    keywords: 'veterinarijos praktika, gyvūnų gydymas, vizitai, gydymo istorija, veterinarijos įrašai',
    url: 'https://gvet.lt/vetpraktika'
  },
  veterinarija: {
    title: 'Gydymo Modulis | GVET Veterinarinė Sistema',
    description: 'GVET gydymo modulis - gyvūnų gydymo įrašai, ligos, simptomai, vaistų skyrimas, išlaukos ir privalomi žurnalai.',
    keywords: 'gyvūnų gydymas, veterinariniai vaistai, ligos, diagnozės, išlaukos, karencija',
    url: 'https://gvet.lt/veterinarija'
  },
  warehouse: {
    title: 'Sandėlio Valdymas | GVET Sistema',
    description: 'GVET sandėlio valdymo modulis - vaistų, vakcinų, biocidų atsargų valdymas, partijų sekimas, galiojimo datos.',
    keywords: 'sandėlio valdymas, vaistų apskaita, atsargos, partijos, galiojimo datos',
    url: 'https://gvet.lt/sandėlis'
  },
  animals: {
    title: 'Gyvūnų Registras | GVET Sistema',
    description: 'GVET gyvūnų registro modulis - galvijai, kiaulės, avys, ožkos. Ženklinimo numeriai, VIC sinchronizacija, gyvūnų sveikatos istorija.',
    keywords: 'gyvūnų registras, galvijai, kiaulės, avys, ženklinimas, VIC, gyvūnų duomenys',
    url: 'https://gvet.lt/gyvūnai'
  },
  reports: {
    title: 'Privalomi Žurnalai | GVET Sistema',
    description: 'GVET privalomų žurnalų generavimas pagal VMVT reikalavimus. Gydomų gyvūnų žurnalas, vaistų žurnalas, išlaukų ataskaita.',
    keywords: 'privalomi žurnalai, VMVT žurnalai, gydomų gyvūnų registras, vaistų žurnalas, išlaukų ataskaita',
    url: 'https://gvet.lt/ataskaitos'
  },
  accounting: {
    title: 'Apskaita ir Finansai | GVET Sistema',
    description: 'GVET apskaitos modulis - sąskaitų generavimas, mokėjimai, finansinės ataskaitos, darbo aktai.',
    keywords: 'veterinarijos apskaita, sąskaitos, mokėjimai, finansai, darbo aktai',
    url: 'https://gvet.lt/apskaita'
  }
};
