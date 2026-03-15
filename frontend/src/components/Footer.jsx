import { Link } from 'react-router-dom';
import { Phone, MapPin, Instagram, Facebook, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold mb-4">
              Saffyra <span className="text-primary">Kitchen</span>
            </h3>
            <p className="text-gray-400 mb-4 max-w-md">
              Experience the perfect blend of traditional Dum Biryani and bold Chinese flavors, 
              delivered hot and fresh to your doorstep.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="p-2 bg-secondary-light rounded-full hover:bg-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-secondary-light rounded-full hover:bg-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-secondary-light rounded-full hover:bg-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/menu" className="text-gray-400 hover:text-primary transition-colors">
                  Menu
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-gray-400 hover:text-primary transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-gray-400 hover:text-primary transition-colors">
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center space-x-3 text-gray-400">
                <Phone className="w-5 h-5 text-primary" />
                <span>+91 86682 86129</span>
              </li>
              <li className="flex items-start space-x-3 text-gray-400">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Opposite Fashion Collection, Tilak Maidan, Khamgaon, Dist. Buldhana - 444303</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-secondary-light mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Saffyra Kitchen. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
