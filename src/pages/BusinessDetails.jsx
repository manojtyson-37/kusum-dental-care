import { BUSINESS } from './legalContent';

// Renders only the details the clinic has filled in (see BUSINESS).
export default function BusinessDetails() {
  const rows = [
    ['Trade name', BUSINESS.tradeName],
    ['Type of business', BUSINESS.type],
    ['Practitioner', BUSINESS.practitioner],
    ['Practitioner registration no.', BUSINESS.practitionerRegistrationNo],
    ['Clinic registration no.', BUSINESS.clinicRegistrationNo],
    ['GSTIN', BUSINESS.gstin],
    ['Address', BUSINESS.address],
    ['Phone', BUSINESS.phones.join(' / ')],
    ['Email', BUSINESS.email],
    ['Opening hours', BUSINESS.hours],
    ['Website', BUSINESS.website],
  ].filter(([, v]) => v);

  return (
    <section className="legal__section">
      <h2>Business details</h2>
      <dl className="legal__details">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
