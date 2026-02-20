/**
 * @jest-environment node
 *
 * Landing page tests.
 * Tests component structure, data integrity, section consistency, and page composition.
 * (Render tests require @testing-library/react + jsdom which aren't currently installed.)
 */

import * as fs from 'fs';
import * as path from 'path';

function readComponent(fileName: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', fileName), 'utf8');
}

function readAppFile(fileName: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../../../app', fileName), 'utf8');
}

// Test all component files exist
describe('Landing component files', () => {
  const expectedFiles = [
    'LandingNavbar.tsx',
    'HeroSection.tsx',
    'FeaturesSection.tsx',
    'HowItWorksSection.tsx',
    'IntegrationsSection.tsx',
    'TestimonialsSection.tsx',
    'PricingSection.tsx',
    'CTASection.tsx',
    'FooterSection.tsx',
  ];

  it.each(expectedFiles)('%s exists', (file) => {
    const filePath = path.resolve(__dirname, '..', file);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

// Test FeaturesSection data integrity
describe('FeaturesSection data', () => {
  it('has exactly 6 features', () => {
    const source = readComponent('FeaturesSection.tsx');
    const featureMatches = source.match(/title:\s*"/g);
    expect(featureMatches).toHaveLength(6);
  });

  it('includes expected feature titles', () => {
    const source = readComponent('FeaturesSection.tsx');
    const expectedTitles = [
      'AI Code Generation',
      'PR Management',
      'Sprint Planning',
      'GitHub Integration',
      'Team Collaboration',
      'Activity Tracking',
    ];
    for (const title of expectedTitles) {
      expect(source).toContain(title);
    }
  });
});

// Test PricingSection data integrity
describe('PricingSection data', () => {
  it('has 3 pricing tiers', () => {
    const source = readComponent('PricingSection.tsx');
    const tierNames = ['Free', 'Pro', 'Enterprise'];
    for (const name of tierNames) {
      expect(source).toContain(`name: "${name}"`);
    }
  });

  it('Pro tier is highlighted', () => {
    const source = readComponent('PricingSection.tsx');
    const proSection = source.substring(
      source.indexOf('name: "Pro"'),
      source.indexOf('name: "Enterprise"')
    );
    expect(proSection).toContain('highlighted: true');
  });
});

// Test HowItWorksSection data integrity
describe('HowItWorksSection data', () => {
  it('has 3 steps', () => {
    const source = readComponent('HowItWorksSection.tsx');
    const stepTitles = ['Connect GitHub', 'Create Tasks', 'Ship with Confidence'];
    for (const title of stepTitles) {
      expect(source).toContain(title);
    }
  });
});

// Test IntegrationsSection data integrity
describe('IntegrationsSection data', () => {
  it('has GitHub as live integration', () => {
    const source = readComponent('IntegrationsSection.tsx');
    const githubSection = source.substring(
      source.indexOf('name: "GitHub"'),
      source.indexOf('name: "Jira"')
    );
    expect(githubSection).toContain('"live"');
  });

  it('has Jira, GitLab, and Slack as coming-soon', () => {
    const source = readComponent('IntegrationsSection.tsx');
    for (const name of ['Jira', 'GitLab', 'Slack']) {
      expect(source).toContain(`name: "${name}"`);
    }
    const afterGithub = source.substring(source.indexOf('name: "Jira"'));
    const comingSoonMatches = afterGithub.match(/"coming-soon"/g);
    expect(comingSoonMatches).toHaveLength(3);
  });
});

// Test LandingNavbar has correct anchor links
describe('LandingNavbar navigation', () => {
  it('has anchor links to all major sections', () => {
    const source = readComponent('LandingNavbar.tsx');
    const expectedAnchors = ['#features', '#how-it-works', '#integrations', '#pricing'];
    for (const anchor of expectedAnchors) {
      expect(source).toContain(anchor);
    }
  });
});

// Test auth-aware behavior (source-level checks)
describe('Auth-aware components', () => {
  it('HeroSection accepts isAuthenticated prop', () => {
    const source = readComponent('HeroSection.tsx');
    expect(source).toContain('isAuthenticated');
    expect(source).toContain('Go to Dashboard');
    expect(source).toContain('Get Started Free');
  });

  it('CTASection accepts isAuthenticated prop', () => {
    const source = readComponent('CTASection.tsx');
    expect(source).toContain('isAuthenticated');
    expect(source).toContain('Go to Dashboard');
    expect(source).toContain('Get Started Free');
  });

  it('LandingNavbar accepts isAuthenticated prop', () => {
    const source = readComponent('LandingNavbar.tsx');
    expect(source).toContain('isAuthenticated');
    expect(source).toContain('Go to Dashboard');
    expect(source).toContain('Sign In');
    expect(source).toContain('Get Started');
  });
});

// Test page.tsx composition
describe('Landing page composition (page.tsx)', () => {
  it('imports all landing components', () => {
    const source = readAppFile('page.tsx');
    const expectedImports = [
      'LandingNavbar',
      'HeroSection',
      'FeaturesSection',
      'HowItWorksSection',
      'IntegrationsSection',
      'TestimonialsSection',
      'PricingSection',
      'CTASection',
      'FooterSection',
    ];
    for (const imp of expectedImports) {
      expect(source).toContain(imp);
    }
  });

  it('uses getServerSession for auth', () => {
    const source = readAppFile('page.tsx');
    expect(source).toContain('getServerSession');
    expect(source).toContain('authOptions');
    expect(source).toContain('isAuthenticated');
  });

  it('has SEO metadata', () => {
    const source = readAppFile('page.tsx');
    expect(source).toContain('export const metadata');
    expect(source).toContain('title:');
    expect(source).toContain('description:');
  });

  it('does not redirect anymore', () => {
    const source = readAppFile('page.tsx');
    expect(source).not.toContain('redirect("/login")');
    expect(source).not.toContain('redirect("/dashboard")');
  });
});

// Test globals.css has smooth scrolling
describe('globals.css smooth scrolling', () => {
  it('includes scroll-behavior: smooth', () => {
    const source = readAppFile('globals.css');
    expect(source).toContain('scroll-behavior: smooth');
  });

  it('includes scroll-padding-top for sticky nav offset', () => {
    const source = readAppFile('globals.css');
    expect(source).toContain('scroll-padding-top');
  });
});

// Test section IDs match navbar anchors
describe('Section ID consistency', () => {
  it('all navbar anchors have matching section IDs', () => {
    const navbarSource = readComponent('LandingNavbar.tsx');

    const anchorRegex = /href:\s*"(#[^"]+)"/g;
    const anchors: string[] = [];
    let match;
    while ((match = anchorRegex.exec(navbarSource)) !== null) {
      anchors.push(match[1].substring(1)); // Remove the '#'
    }

    expect(anchors.length).toBeGreaterThan(0);

    const sectionFiles: Record<string, string> = {
      features: 'FeaturesSection.tsx',
      'how-it-works': 'HowItWorksSection.tsx',
      integrations: 'IntegrationsSection.tsx',
      pricing: 'PricingSection.tsx',
    };

    for (const anchor of anchors) {
      const fileName = sectionFiles[anchor];
      expect(fileName).toBeDefined();
      const sectionSource = readComponent(fileName);
      expect(sectionSource).toContain(`id="${anchor}"`);
    }
  });
});

// Test TestimonialsSection data
describe('TestimonialsSection data', () => {
  it('has 3 testimonials', () => {
    const source = readComponent('TestimonialsSection.tsx');
    const quoteMatches = source.match(/quote:/g);
    expect(quoteMatches).toHaveLength(3);
  });
});

// Test FooterSection structure
describe('FooterSection structure', () => {
  it('has the expected footer link categories', () => {
    const source = readComponent('FooterSection.tsx');
    for (const category of ['Product', 'Company', 'Legal', 'Developers']) {
      expect(source).toContain(category);
    }
  });

  it('includes copyright notice', () => {
    const source = readComponent('FooterSection.tsx');
    expect(source).toContain('FlowForge');
    expect(source).toContain('All rights reserved');
  });
});

// Test design system consistency
describe('Design system usage', () => {
  it('LandingNavbar uses sticky header blur pattern', () => {
    const source = readComponent('LandingNavbar.tsx');
    expect(source).toContain('sticky top-0 z-50');
    expect(source).toContain('backdrop-blur');
    expect(source).toContain('border-border/40');
  });

  it('HeroSection uses floating orb pattern', () => {
    const source = readComponent('HeroSection.tsx');
    expect(source).toContain('blur-3xl');
    expect(source).toContain('animate-float');
    expect(source).toContain('rounded-full');
  });

  it('HeroSection uses gradient text', () => {
    const source = readComponent('HeroSection.tsx');
    expect(source).toContain('bg-gradient-to-r');
    expect(source).toContain('bg-clip-text');
    expect(source).toContain('text-transparent');
  });

  it('FeaturesSection uses gradient icon containers', () => {
    const source = readComponent('FeaturesSection.tsx');
    expect(source).toContain('from-[hsl(var(--gradient-start))]');
    expect(source).toContain('to-[hsl(var(--gradient-end))]');
  });

  it('components use gradient-text utility class', () => {
    for (const file of ['FeaturesSection.tsx', 'HowItWorksSection.tsx', 'IntegrationsSection.tsx', 'PricingSection.tsx']) {
      const source = readComponent(file);
      expect(source).toContain('gradient-text');
    }
  });

  it('uses Button variant="gradient" for primary CTAs', () => {
    const source = readComponent('HeroSection.tsx');
    expect(source).toContain('variant="gradient"');
  });

  it('uses Badge variant="ai" in HeroSection', () => {
    const source = readComponent('HeroSection.tsx');
    expect(source).toContain('variant="ai"');
  });

  it('LandingNavbar is a client component', () => {
    const source = readComponent('LandingNavbar.tsx');
    expect(source).toContain('"use client"');
  });

  it('server components do not have "use client" directive', () => {
    const serverComponents = [
      'HeroSection.tsx',
      'FeaturesSection.tsx',
      'HowItWorksSection.tsx',
      'IntegrationsSection.tsx',
      'TestimonialsSection.tsx',
      'PricingSection.tsx',
      'CTASection.tsx',
      'FooterSection.tsx',
    ];
    for (const file of serverComponents) {
      const source = readComponent(file);
      expect(source).not.toContain('"use client"');
    }
  });
});

// Test responsive design patterns
describe('Responsive design', () => {
  it('page uses max-w-7xl container pattern', () => {
    const components = [
      'LandingNavbar.tsx',
      'HeroSection.tsx',
      'FeaturesSection.tsx',
      'HowItWorksSection.tsx',
      'IntegrationsSection.tsx',
      'PricingSection.tsx',
      'CTASection.tsx',
      'FooterSection.tsx',
    ];
    for (const file of components) {
      const source = readComponent(file);
      expect(source).toContain('max-w-7xl');
    }
  });

  it('LandingNavbar has mobile hamburger menu', () => {
    const source = readComponent('LandingNavbar.tsx');
    expect(source).toContain('mobileOpen');
    expect(source).toContain('md:hidden');
    expect(source).toContain('hidden md:flex');
  });

  it('FeaturesSection uses responsive grid', () => {
    const source = readComponent('FeaturesSection.tsx');
    expect(source).toContain('grid-cols-1');
    expect(source).toContain('md:grid-cols-2');
    expect(source).toContain('lg:grid-cols-3');
  });

  it('PricingSection uses responsive grid', () => {
    const source = readComponent('PricingSection.tsx');
    expect(source).toContain('grid-cols-1');
    expect(source).toContain('md:grid-cols-3');
  });
});

// Test links point to correct routes
describe('CTA link destinations', () => {
  it('authenticated CTAs link to /dashboard', () => {
    for (const file of ['HeroSection.tsx', 'CTASection.tsx', 'LandingNavbar.tsx']) {
      const source = readComponent(file);
      expect(source).toContain('href="/dashboard"');
    }
  });

  it('unauthenticated CTAs link to /login', () => {
    for (const file of ['HeroSection.tsx', 'CTASection.tsx', 'LandingNavbar.tsx']) {
      const source = readComponent(file);
      expect(source).toContain('href="/login"');
    }
  });
});
