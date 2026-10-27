import Hero from '../components/Hero';
import Services from '../components/Services';
import ClinicScrollShowcase from '../components/ClinicScrollShowcase';
import TrustStrip from '../components/TrustStrip';
import CTABanner from '../components/CTABanner';
import Testimonials from '../components/Testimonials';
import About from '../components/About';
import WordTrail from '../components/WordTrail';
import Gallery from '../components/Gallery';
import DentistIntro from '../components/DentistIntro';
import Differentiators from '../components/Differentiators';

export default function Home() {
  return (
    <main id="main" tabIndex={-1}>
      <Hero />
      <ClinicScrollShowcase />
      <WordTrail />
      <DentistIntro />
      <TrustStrip />
      <Differentiators />
      <Services />
      <Gallery />
      <Testimonials />
      <CTABanner />
      <About />
    </main>
  );
}
