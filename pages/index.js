"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import dynamic from "next/dynamic";

const Calendar = dynamic(() => import("react-calendar"), {
  ssr: false,
  loading: () => <div className="h-80 bg-gray-100 rounded-lg animate-pulse" />,
});

export default function Home() {
  // State
  const [settings, setSettings] = useState({
    businessName: "Felix Cleans It LLC",
    phone: "(702) 583-1039",
    hours: "Sat-Sun: 8AM-6PM | Mon-Fri: 4PM-8PM",
    serviceArea: "Las Vegas Valley, Summerlin, Enterprise, Henderson",
    logoUrl: null,

    // NEW: About section (editable)
    aboutTitle: "About Felix Cleans It",
    aboutText:
      "Felix Cleans It LLC is family-owned and operated. I started this business to build something real for my son — honest work, reliable service, and a name you can trust. We show up on time, treat your property with respect, and get the job done right.",
    aboutPhoto1: null,
    aboutPhoto2: null,
  });

  const [services, setServices] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [currentGalleryImage, setCurrentGalleryImage] = useState(0);
  const [promoText, setPromoText] = useState("");
  const [showPromo, setShowPromo] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    description: "",
    selectedDate: null,
  });
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // Settings
      const { data: settingsData } = await supabase
        .from("settings")
        .select("*")
        .maybeSingle();

      if (settingsData) {
        setSettings((prev) => ({
          ...prev,
          businessName: settingsData.business_name || prev.businessName,
          phone: settingsData.phone || prev.phone,
          hours: settingsData.hours || prev.hours,
          serviceArea: settingsData.service_area || prev.serviceArea,
          logoUrl: settingsData.logo_url || prev.logoUrl,

          // NEW: About fields (optional columns)
          aboutTitle: settingsData.about_title || prev.aboutTitle,
          aboutText: settingsData.about_text || prev.aboutText,
          aboutPhoto1: settingsData.about_photo_1 || prev.aboutPhoto1,
          aboutPhoto2: settingsData.about_photo_2 || prev.aboutPhoto2,
        }));

        if (settingsData.promo_enabled && settingsData.promo_text) {
          setPromoText(settingsData.promo_text);
          setShowPromo(true);
        }
      }

      // Services
      const { data: servicesData } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: true });

      if (servicesData) setServices(servicesData);

      // Testimonials
      const { data: testimonialsData } = await supabase
        .from("testimonials")
        .select("*")
        .order("created_at", { ascending: false });

      if (testimonialsData) setTestimonials(testimonialsData);

      // Gallery
      const { data: galleryData } = await supabase
        .from("gallery")
        .select("*")
        .order("created_at", { ascending: false });

      if (galleryData) setGallery(galleryData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Auto-rotate gallery
  useEffect(() => {
    if (gallery.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentGalleryImage((prev) => (prev + 1) % gallery.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [gallery.length]);

  const getStorageUrl = (bucket, path) => {
    if (!path) return null;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 3); // Max 3 photos
    if (files.length === 0) return;

    setPhotos(files);

    // Generate previews
    const previews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (photos.length === 0) {
      toast.error("Please upload at least 1 photo of the items to be removed");
      return;
    }

    if (!formData.selectedDate) {
      toast.error("Please select when you need this done");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload photos to storage
      const photoUrls = [];
      for (const photo of photos) {
        const fileExt = photo.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("quote-photos")
          .upload(fileName, photo);

        if (uploadError) throw uploadError;
        photoUrls.push(fileName);
      }

      // Format date
      const requestedDate = formData.selectedDate.toISOString().split("T")[0];

      // Create quote request
      const { data: quoteData, error: quoteError } = await supabase
        .from("quote_requests")
        .insert({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          description: formData.description,
          timeline: requestedDate,
          photos: photoUrls,
          status: "pending",
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Send SMS notification to Felix
      await fetch("/api/notify-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          description: formData.description,
          timeline: requestedDate,
          quoteId: quoteData.id,
        }),
      });

      toast.success("Quote request submitted! We'll text you shortly with pricing.");

      // Reset form
      setFormData({
        name: "",
        phone: "",
        address: "",
        description: "",
        selectedDate: null,
      });
      setPhotos([]);
      setPhotoPreviews([]);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Something went wrong. Please try again or call us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanPhone = settings.phone.replace(/\D/g, "");

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Toaster position="bottom-center" />

      {/* Promo Banner */}
      {showPromo && promoText && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 sticky top-0 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm font-bold flex-1 text-center">{promoText}</p>
            <button
              onClick={() => setShowPromo(false)}
              className="text-white hover:text-blue-100 text-xl font-bold"
              aria-label="Close promo"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* HERO SECTION - Better hierarchy + bigger logo */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Logo */}
            {settings.logoUrl ? (
              <div className="mb-8">
                <img
                  src={getStorageUrl("business-assets", settings.logoUrl)}
                  alt={settings.businessName}
                  className="w-64 sm:w-72 md:w-80 h-auto mx-auto"
                />
              </div>
            ) : (
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900">
                  {settings.businessName}
                </h2>
              </div>
            )}

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-5 text-gray-900 tracking-tight">
              Fast & Reliable Junk Removal
            </h1>

            <p className="text-xl text-gray-700 mb-3 max-w-2xl mx-auto">
              Family-owned business serving the Las Vegas Valley.
            </p>

            <p className="text-base sm:text-lg text-gray-600 mb-10 max-w-xl mx-auto leading-relaxed">
              Honest pricing. Quick response. Respectful service. Named after my son Felix — building a legacy with every job.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
              <a
                href="#quote"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition shadow-md"
              >
                Get Free Quote
              </a>

              <a
                href={`tel:${cleanPhone}`}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg transition shadow-md"
              >
                Call/Text: {settings.phone}
              </a>
            </div>

            {/* Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="text-sm text-gray-500 font-semibold mb-1">SERVICE AREA</p>
                <p className="text-gray-900 font-medium">{settings.serviceArea}</p>
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="text-sm text-gray-500 font-semibold mb-1">HOURS</p>
                <p className="text-gray-900 font-medium">{settings.hours}</p>
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="text-sm text-gray-500 font-semibold mb-1">PRICING</p>
                <p className="text-gray-900 font-medium">Free Estimates</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      {services.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              What We Haul
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div key={service.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  {service.icon && <div className="text-4xl mb-3">{service.icon}</div>}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Before & After</h2>
              <p className="text-gray-600">See the difference we make</p>
            </div>

            <div className="relative bg-gray-100 rounded-2xl overflow-hidden shadow-xl">
              {gallery[currentGalleryImage]?.image_url && (
                <div className="relative aspect-video">
                  <img
                    src={getStorageUrl("gallery", gallery[currentGalleryImage].image_url)}
                    alt={gallery[currentGalleryImage].title || "Before and After"}
                    className="w-full h-full object-cover"
                  />

                  {/* Title overlay */}
                  {gallery[currentGalleryImage].title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                      <p className="text-white text-xl font-bold">
                        {gallery[currentGalleryImage].title}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {gallery.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCurrentGalleryImage((prev) => (prev - 1 + gallery.length) % gallery.length)
                    }
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center text-2xl text-gray-900 transition"
                    aria-label="Previous image"
                  >
                    ←
                  </button>
                  <button
                    onClick={() =>
                      setCurrentGalleryImage((prev) => (prev + 1) % gallery.length)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center text-2xl text-gray-900 transition"
                    aria-label="Next image"
                  >
                    →
                  </button>
                </>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                {gallery.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentGalleryImage(idx)}
                    className={`h-3 rounded-full transition-all ${
                      idx === currentGalleryImage
                        ? "bg-blue-600 w-10"
                        : "bg-gray-300 w-3 hover:bg-gray-400"
                    }`}
                    aria-label={`Go to image ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {testimonials.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              What Customers Say
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.slice(0, 3).map((testimonial, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex mb-3">
                    {[...Array(testimonial.rating || 5)].map((_, i) => (
                      <span key={i} className="text-yellow-400">★</span>
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                    "{testimonial.text}"
                  </p>
                  <p className="text-gray-900 font-semibold">- {testimonial.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* QUOTE FORM */}
      <section className="py-16 bg-blue-600" id="quote">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Get Your Free Quote</h2>
            <p className="text-blue-100">Text us photos and we'll send you pricing</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 space-y-6 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="702-555-1234"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Service Address *</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                placeholder="123 Main St, Las Vegas, NV"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">What needs to be removed? *</label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 resize-none"
                placeholder="Old furniture, appliances, yard waste, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">When do you need this done? *</label>
              <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                <Calendar
                  value={formData.selectedDate}
                  onChange={(date) => setFormData({ ...formData, selectedDate: date })}
                  minDate={new Date()}
                  className="w-full"
                />
              </div>
              {formData.selectedDate && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected:{" "}
                  {formData.selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Upload Photos (1-3 required) *
              </label>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <p className="text-gray-700 font-medium">Click to upload photos</p>
                  <p className="text-sm text-gray-500">Max 3 photos</p>
                </label>
              </div>

              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || photos.length === 0 || !formData.selectedDate}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition ${
                isSubmitting || photos.length === 0 || !formData.selectedDate
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-yellow-400 hover:bg-yellow-500 text-gray-900"
              }`}
            >
              {isSubmitting ? "Sending..." : "Get Free Quote"}
            </button>

            {(photos.length === 0 || !formData.selectedDate) && (
              <p className="text-center text-sm text-red-500">
                {!formData.selectedDate
                  ? "Please select a date"
                  : "Please upload at least 1 photo"}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* ABOUT US - NEW */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* Photos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                {settings.aboutPhoto1 ? (
                  <img
                    src={getStorageUrl("business-assets", settings.aboutPhoto1)}
                    alt="About photo 1"
                    className="w-full h-64 object-cover"
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center text-gray-400 text-sm">
                    Upload family photo (optional)
                  </div>
                )}
              </div>

              <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                {settings.aboutPhoto2 ? (
                  <img
                    src={getStorageUrl("business-assets", settings.aboutPhoto2)}
                    alt="About photo 2"
                    className="w-full h-64 object-cover"
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center text-gray-400 text-sm">
                    Upload job photo (optional)
                  </div>
                )}
              </div>
            </div>

            {/* Text */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {settings.aboutTitle}
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {settings.aboutText}
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a
                  href={`tel:${cleanPhone}`}
                  className="inline-flex items-center justify-center bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold transition"
                >
                  Call {settings.phone}
                </a>
                <a
                  href="#quote"
                  className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition"
                >
                  Request a Quote
                </a>
              </div>
             
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Contact</h3>
              <p className="text-gray-300 mb-2">{settings.phone}</p>
              <p className="text-gray-300">{settings.serviceArea}</p>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Hours</h3>
              <p className="text-gray-300">{settings.hours}</p>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-4">About</h3>
              <p className="text-gray-300 text-sm">
                Family-owned junk removal service. Building a legacy for my son Felix.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center">
            <p className="text-gray-400 text-sm mb-4">
              © {new Date().getFullYear()} {settings.businessName}. All rights reserved.
            </p>
            <Link
              href="/login"
              className="text-gray-500 hover:text-yellow-400 text-xs transition-colors"
            >
              Dashboard Login
            </Link>
          </div>
        </div>
      </footer>

      {/* Calendar Styles - keep yours */}
      <style jsx global>{`
        .react-calendar {
          border: none !important;
          background: transparent !important;
          font-family: inherit;
          width: 100%;
          color: #111827;
        }

        .react-calendar__navigation {
          background: white !important;
          margin-bottom: 16px !important;
          border: 2px solid #e5e7eb !important;
          border-radius: 12px !important;
          display: flex !important;
          height: 60px !important;
        }

        .react-calendar__navigation button {
          color: #111827 !important;
          font-weight: 700 !important;
          font-size: 18px !important;
          min-height: 56px !important;
          padding: 16px !important;
        }

        .react-calendar__navigation button:hover:enabled {
          background: #dbeafe !important;
        }

        .react-calendar__navigation__label {
          font-size: 20px !important;
          font-weight: 800 !important;
          flex-grow: 2 !important;
        }

        .react-calendar__navigation__arrow {
          font-size: 28px !important;
          flex-grow: 0.5 !important;
        }

        .react-calendar__tile {
          border: 2px solid #e5e7eb !important;
          background: white !important;
          padding: 16px 8px !important;
          transition: all 0.2s !important;
          color: #6b7280;
          border-radius: 12px !important;
          font-size: 16px !important;
          font-weight: 600 !important;
          margin: 4px !important;
          min-height: 60px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .react-calendar__tile:hover:enabled {
          background: #dbeafe !important;
          border-color: #3b82f6 !important;
          color: #1f2937;
          transform: scale(1.05) !important;
        }

        .react-calendar__tile--now {
          background: #fef3c7 !important;
          font-weight: 800 !important;
          color: #111827 !important;
          border-color: #fbbf24 !important;
          border-width: 3px !important;
        }

        .react-calendar__tile--active {
          background: #3b82f6 !important;
          color: white !important;
          font-weight: 800 !important;
          border-color: #2563eb !important;
          border-width: 3px !important;
          transform: scale(1.05) !important;
        }

        .react-calendar__tile:disabled {
          background: #f9fafb !important;
          color: #d1d5db !important;
          border-color: #e5e7eb !important;
          opacity: 0.5 !important;
        }

        .react-calendar__month-view__weekdays {
          font-weight: 700 !important;
          color: #111827 !important;
          font-size: 14px !important;
        }

        .react-calendar__month-view__weekdays__weekday {
          color: #111827 !important;
          border-bottom: 2px solid #e5e7eb !important;
          padding-bottom: 12px !important;
          text-align: center !important;
        }

        @media (max-width: 640px) {
          .react-calendar__navigation {
            height: 70px !important;
          }

          .react-calendar__navigation button {
            min-height: 66px !important;
            font-size: 20px !important;
          }

          .react-calendar__navigation__arrow {
            font-size: 32px !important;
          }

          .react-calendar__tile {
            min-height: 70px !important;
            font-size: 18px !important;
            padding: 20px 8px !important;
          }
        }
      `}</style>
    </main>
  );
}