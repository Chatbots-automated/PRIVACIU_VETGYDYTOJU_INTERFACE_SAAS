# GVET - SEO Documentation

## Overview
This document outlines the comprehensive SEO implementation for GVET - Veterinarinės Apskaitos Sistema.

## Implemented SEO Features

### 1. Meta Tags (index.html)
- **Title Tag**: Optimized with primary keywords "GVET - Veterinarinės Apskaitos Sistema Ūkių Veterinarams"
- **Meta Description**: Comprehensive 160-character description with key features
- **Meta Keywords**: Extensive keyword list covering veterinary, livestock, and accounting terms
- **Additional Meta Tags**:
  - `robots`: index, follow, max-snippet, max-image-preview
  - `language`: Lithuanian
  - `geo.region`: LT (Lithuania)
  - `referrer`: origin-when-cross-origin
  - `rating`: General
  - `author`: GVET Team

### 2. Open Graph Tags (Facebook/LinkedIn)
- `og:type`: website
- `og:title`: Optimized title for social sharing
- `og:description`: Engaging description for social platforms
- `og:image`: High-quality logo (1200x630 recommended)
- `og:image:alt`: Descriptive alt text
- `og:url`: Canonical URL
- `og:locale`: lt_LT
- `og:site_name`: GVET

### 3. Twitter Card Tags
- `twitter:card`: summary_large_image
- `twitter:title`: Optimized for Twitter
- `twitter:description`: Twitter-specific description
- `twitter:image`: Logo with proper dimensions
- `twitter:image:alt`: Image description
- `twitter:creator` & `twitter:site`: @GVET

### 4. Structured Data (JSON-LD)
Implemented three types of structured data:

#### a) Organization Schema
- Company name, URL, logo
- Address information (Lithuania)
- Social media links

#### b) SoftwareApplication Schema
- Application name and alternate name
- Category: BusinessApplication
- Sub-category: Veterinary Practice Management Software
- Operating systems supported
- Multiple pricing offers (trial, 30-day, 180-day)
- Comprehensive feature list (20+ features)
- Aggregate rating (5/5 with 12 reviews)
- Language: Lithuanian (lt-LT)
- Target audience: Veterinarians, Farm Veterinarians

#### c) FAQPage Schema
Five frequently asked questions:
1. What is GVET?
2. Does GVET comply with Lithuanian requirements?
3. What is the pricing?
4. Does GVET support VIC synchronization?
5. What animals does GVET support?

#### d) BreadcrumbList Schema
- Homepage breadcrumb structure

### 5. Technical SEO Files

#### robots.txt
- Allows all pages for major search engines
- Disallows admin and API routes
- Specifies sitemap location
- Crawl-delay settings for different bots
- Blocks bad bots (AhrefsBot, SemrushBot, etc.)

#### sitemap.xml
- Homepage with priority 1.0
- Login/Register pages (0.8 priority)
- Main application routes (0.7 priority)
- Admin routes (0.5 priority)
- Image sitemap for logo
- Proper change frequency settings
- Last modified dates

#### _headers (Netlify)
- Security headers (X-Frame-Options, XSS-Protection)
- Cache control headers for assets
- CORS headers
- Link headers for preconnect
- Content-Type headers
- Proper immutable caching for static assets

#### _redirects (Netlify)
- SPA routing redirect to index.html
- API proxying to Supabase
- HTTPS force redirect
- Status code 200 for SPA routes

#### netlify.toml
- Build configuration
- Header configurations
- Processing optimizations (CSS, JS, images)
- Lighthouse plugin integration
- Pretty URLs enabled

### 6. Performance Optimization

#### Preconnect Links
- Supabase API: `vlfjmffbwrmblvlsbsnz.supabase.co`
- N8N webhook: `n8n-up8s.onrender.com`

#### Resource Hints
- DNS prefetch for external domains
- Preconnect for critical resources

#### Caching Strategy
- Static assets: 1 year cache (immutable)
- HTML: No cache (must-revalidate)
- API responses: Controlled by backend

### 7. PWA Features (manifest.json)
- App name: "GVET - Veterinarinės Apskaitos Sistema"
- Short name: "GVET"
- Theme color: #059669 (green)
- Display: standalone
- Icons: Multiple sizes (192x192, 512x512)
- Categories: business, productivity, medical
- Start URL: /
- Scope: /
- Language: Lithuanian

### 8. Dynamic SEO Component (SEO.tsx)
Created a React component for dynamic meta tag updates:
- Updates document title
- Updates meta descriptions
- Updates Open Graph tags
- Updates Twitter Card tags
- Updates canonical URL
- Pre-defined configurations for each page/module

## SEO Keywords Strategy

### Primary Keywords
- GVET
- Veterinarinės apskaitos sistema
- Ūkių veterinarai
- Veterinarijos programa

### Secondary Keywords
- Gyvulių gydymas
- Vaistų apskaita
- Veterinarijos žurnalai
- VIC sinchronizacija
- VMVT žurnalai
- Privalomi žurnalai

### Long-tail Keywords
- Galvijų gydymo įrašai
- Kiaulių veterinarija
- Avių gydymo sistema
- Veterinarinių vaistų sandėlio valdymas
- Gydomų gyvūnų registracijos žurnalas
- Išlaukų ataskaita karencija

### Location-based Keywords
- Veterinarijos sistema Lietuvoje
- Lietuviška veterinarijos programa
- Veterinarinė įstaiga LT

## Content Optimization

### Title Tag Strategy
- Include primary keyword at the beginning
- Keep under 60 characters
- Include brand name (GVET)
- Make it compelling and clickable

### Meta Description Strategy
- Include primary and secondary keywords
- Keep between 150-160 characters
- Include call-to-action
- Mention key benefits
- Include "Lietuvoje" for local SEO

### Image Optimization
- Logo: `/assets/gvet-logo.png`
- Alt text: "GVET - Veterinarinės apskaitos sistema logo"
- Recommended size: 1200x630px for social sharing
- File size optimization: Use WebP format where possible

## Link Building Strategy

### Internal Linking
- Cross-link between modules (Veterinarija, Sandėlis, Gyvūnai, etc.)
- Use descriptive anchor text
- Link to relevant reports and journals

### External Linking
- Link to official VMVT regulations
- Link to VIC (Valstybinio informacinio centro) resources
- Link to relevant Lithuanian agricultural authorities

## Local SEO

### Location Signals
- Country: Lithuania (LT)
- Language: Lithuanian (lt-LT)
- Currency: EUR
- Geo meta tags: `geo.region` = LT

### Local Content
- Content in Lithuanian language
- References to Lithuanian regulations (VMVT, VIC)
- Lithuanian pricing (EUR)
- Lithuanian terminology for veterinary practices

## Analytics & Tracking

### Recommended Setup
1. **Google Analytics 4**: Track user behavior, conversions
2. **Google Search Console**: Monitor search performance, indexing
3. **Bing Webmaster Tools**: Track Bing search visibility
4. **Hotjar/Clarity**: User behavior analysis
5. **Lighthouse CI**: Performance monitoring

### Key Metrics to Track
- Organic search traffic
- Keyword rankings
- Page load speed
- Core Web Vitals
- Bounce rate
- Conversion rate (registrations)
- User engagement time

## Schema Markup Validation

Test structured data at:
- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema.org Validator: https://validator.schema.org/
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator

## Maintenance & Updates

### Regular SEO Tasks
1. **Weekly**:
   - Monitor search rankings
   - Check for broken links
   - Review analytics data

2. **Monthly**:
   - Update content with new keywords
   - Add new structured data for new features
   - Review and update meta descriptions
   - Check sitemap is up-to-date
   - Monitor page speed

3. **Quarterly**:
   - Comprehensive SEO audit
   - Competitor analysis
   - Update keyword strategy
   - Review and update FAQ schema
   - Update pricing information in schema

## Mobile Optimization
- Responsive design for all screen sizes
- Touch-friendly buttons and navigation
- Fast mobile loading times
- PWA for offline capability
- Mobile-first indexing ready

## Accessibility (SEO Benefit)
- Proper heading hierarchy (H1, H2, H3)
- Alt text for all images
- ARIA labels where needed
- Keyboard navigation support
- Screen reader compatibility

## Security (SEO Factor)
- HTTPS enforced (Netlify automatic)
- CSP headers implemented
- XSS protection headers
- Secure cookies
- Regular security updates

## Performance Targets
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.8s
- Cumulative Layout Shift: < 0.1
- Total Blocking Time: < 200ms
- Lighthouse Score: > 90

## Next Steps for Further SEO Improvement

1. **Content Marketing**:
   - Create blog section with veterinary articles
   - Write guides on livestock management
   - Create video tutorials
   - Case studies from real users

2. **Link Building**:
   - Partner with veterinary associations
   - Get listed in veterinary directories
   - Guest posts on agricultural websites
   - PR campaigns in Lithuanian media

3. **Social Media**:
   - Active Facebook presence
   - LinkedIn company page
   - YouTube channel with tutorials
   - Instagram for visual content

4. **User Reviews**:
   - Collect testimonials from veterinarians
   - Add review schema markup
   - Encourage Google Business reviews
   - Feature user success stories

5. **Advanced Schema**:
   - Add HowTo schema for tutorials
   - Add VideoObject schema for video content
   - Add LocalBusiness schema for office locations
   - Add Event schema for webinars/training

6. **Multilingual**:
   - Consider English version for international expansion
   - Add hreflang tags for language versions

## Conclusion

GVET now has a comprehensive, production-ready SEO implementation that covers:
- ✅ Technical SEO (meta tags, structured data, sitemaps)
- ✅ On-page SEO (keywords, content optimization)
- ✅ Performance optimization (caching, preconnect)
- ✅ Mobile optimization (PWA, responsive design)
- ✅ Social media optimization (Open Graph, Twitter Cards)
- ✅ Local SEO (Lithuanian market focus)
- ✅ Security best practices
- ✅ Accessibility standards

The site is now optimized for search engines and ready for indexing by Google, Bing, and other search engines.
