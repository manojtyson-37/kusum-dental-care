import { Link } from 'react-router-dom';
import { ArrowLeft, Phone } from 'lucide-react';
import ScrollExpandMedia from '../components/ui/scroll-expansion-hero';

const WA_URL = "https://wa.me/918431907976?text=Hi%20Dr.%20Kusum's%20Dental%20Care%2C%20I%20would%20like%20to%20schedule%20an%20appointment.";

export default function Tour() {
  return (
    <div className="tour-page">
      <Link to="/" className="tour-page__back">
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <ScrollExpandMedia
        mediaType="image"
        mediaSrc="/gallery/dental-3.jpg"
        bgImageSrc="/gallery/dental-2.webp"
        title="Inside Our Clinic"
        date="Malleshpalya, Bangalore"
        scrollToExpand="Scroll to explore"
      >
        <div className="tour-page__content">
          <h2>Dr. Kusum's Dental Care</h2>
          <p>
            A multi-specialty dental clinic &amp; implant center in Malleshpalya, Bangalore,
            delivering quality dental treatment with a gentle touch. We combine the latest
            dental technology with compassionate care, and our team has been transforming smiles
            across Bangalore with precision, warmth, and expertise.
          </p>
          <p>
            Open Monday–Sunday, 9:30 AM – 9:00 PM. Walk-ins welcome.
          </p>
          <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            <Phone size={16} />
            Book Appointment
          </a>
        </div>
      </ScrollExpandMedia>
    </div>
  );
}
