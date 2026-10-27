import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { ShieldCheck, Cpu, Eye } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

export default function ClinicScrollShowcase() {
  const { t } = useLang();
  return (
    <section className="clinic-scroll-showcase relative w-full bg-[var(--off-white)] py-4 md:py-6" id="clinic-tour">
      <div className="w-full max-w-7xl mx-auto px-4">
        <ContainerScroll
          titleComponent={
            <div className="flex flex-col items-center justify-center text-center mb-6 mx-auto w-full">
              <h2 className="section-title text-center text-3xl md:text-5xl lg:text-6xl max-w-3xl leading-tight mx-auto">
                {t("Precision Technology Meets")}{' '}
                <span style={{ color: 'var(--green-primary)' }}>
                  {t("Gentle Dental Care")}
                </span>
              </h2>
              <p className="section-subtitle text-center max-w-xl mx-auto mt-3">
                {t("Scroll down to reveal Dr. Kusum's treatment operatory, designed around strict sterilization and patient comfort.")}
              </p>
            </div>
          }
        >
        <div className="relative w-full h-full group">
          <img
            src="/gallery/dental-3.jpg"
            alt="Treatment room at Dr. Kusum's Dental Care"
            className="w-full h-full object-cover rounded-2xl"
            loading="lazy"
          />

          {/* Clinical Floating HUD Badges */}
          <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md text-white text-xs font-mono border border-white/20 shadow-md">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>{t("Autoclave Sterilized")}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md text-white text-xs font-mono border border-white/20 shadow-md">
              <Cpu size={14} className="text-cyan-400" />
              <span>{t("Rotary Endodontics")}</span>
            </span>
          </div>

          <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1B1E3A]/85 backdrop-blur-md text-[#E7C98F] text-xs font-mono border border-[#E7C98F]/30 shadow-lg">
              <Eye size={14} />
              <span>{t("Malleshpalya Suite")}</span>
            </span>
          </div>

          {/* Subtle Ambient Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 rounded-2xl pointer-events-none" />
        </div>
      </ContainerScroll>
      </div>
    </section>
  );
}
