"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";

export default function Home() {
  // State
  const [settings, setSettings] = useState({
    businessName: "Felix Cleans It LLC",
    phone: "(702) 583-1039",
    hours: "Sat-Sun: 8AM-6PM | Mon-Fri: 4PM-8PM",
    serviceArea: "Las Vegas Valley, Summerlin, Enterprise, Henderson",
    logoUrl: null,
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
    selectedDate: "",
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

      const { data: servicesData } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: true });

      if (servicesData) setServices(servicesData);

      const { data: testimonialsData } = await supabase
        .from("testimonials")
        .select("*")
        .order("created_at", { ascending: false });

      if (testimonialsData) setTestimonials(testimonialsData);

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
    }, 5000);
    return () => clearInterval(interval);
  }, [gallery.length]);

  const getStorageUrl = (bucket, path) => {
    if (!path) return null;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 3);
    if (files.length === 0) return;

    setPhotos(files);
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
      toast.error("Please upload at least 1 photo");
      return;
    }

    if (!formData.selectedDate) {
      toast.error("Please select a date");
      return;
    }

    setIsSubmitting(true);

    try {
     // ✅ Validate files before upload
const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const maxSize = 5 * 1024 * 1024; // 5MB

for (const photo of photos) {
  if (!allowedTypes.includes(photo.type)) {
    toast.error('Only JPEG, PNG, WEBP, and GIF images are allowed');
    setIsSubmitting(false);
    return;
  }
  
  if (photo.size > maxSize) {
    toast.error('Images must be under 5MB');
    setIsSubmitting(false);
    return;
  }
}

const photoUrls = [];
for (const photo of photos) {
  const fileExt = photo.name.split(".").pop().toLowerCase();
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("quote-photos")
    .upload(fileName, photo);

  if (uploadError) throw uploadError;
  photoUrls.push(fileName);
}

      const quoteId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const { error: quoteError } = await supabase.from("quote_requests").insert({
        id: quoteId,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        description: formData.description,
        timeline: formData.selectedDate,
        photos: photoUrls,
        status: "pending",
      });

      if (quoteError) throw quoteError;

      await fetch("/api/notify-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          description: formData.description,
          timeline: formData.selectedDate,
          quoteId,
        }),
      });

      toast.success("Got it! We'll text you with pricing shortly.");

      setFormData({
        name: "",
        phone: "",
        address: "",
        description: "",
        selectedDate: "",
      });
      setPhotos([]);
      setPhotoPreviews([]);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Something went wrong. Call us directly: " + settings.phone);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanPhone = settings.phone.replace(/\D/g, "");

  // Generate next 14 days for date picker
  const getNextDays = () => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const formatDateOption = (date) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <main className="min-h-screen bg-amber-50">
      <Toaster position="top-center" />

      {/* Promo Banner */}
      {showPromo && promoText && (
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white py-3 px-4 sticky top-0 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm font-bold flex-1 text-center">{promoText}</p>
            <button
              onClick={() => setShowPromo(false)}
              className="text-white hover:text-orange-100 text-xl font-bold"
              aria-label="Close promo"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* HERO - Centered with gradient background */}
      <section
        className="py-20 px-4 sm:px-6 lg:px-8"
        style={{
          background: "linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="inline-block bg-white rounded-full p-8 mb-8 shadow-xl">
            {settings.logoUrl ? (
              <img
                src={getStorageUrl("business-assets", settings.logoUrl)}
                alt={settings.businessName}
                className="w-32 h-32 object-contain"
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <span className="text-white text-5xl font-black">
                  {settings.businessName.charAt(0)}
                </span>
              </div>
            )}
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-orange-900 mb-6">
            {settings.businessName}
          </h1>

          <p className="text-2xl sm:text-3xl text-orange-800 mb-4 font-semibold">
            Family-Owned Junk Removal
          </p>

          <p className="text-lg sm:text-xl text-orange-700 mb-12 max-w-2xl mx-auto leading-relaxed">
            We show up on time, treat your property with respect, and get the
            job done right. Building something real for my son Felix.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a
              href="#quote"
              className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-5 rounded-full font-bold text-xl shadow-lg transition transform hover:scale-105"
            >
              📋 Free Quote
            </a>
            <a
              href={`sms:${cleanPhone}`}
              className="bg-white hover:bg-orange-50 text-orange-900 px-10 py-5 rounded-full font-bold text-xl shadow-lg transition transform hover:scale-105"
            >
              📞 {settings.phone}
            </a>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-6 shadow-lg">
              <div className="text-4xl mb-3">📍</div>
              <h3 className="font-bold text-orange-900 mb-2">Service Area</h3>
              <p className="text-orange-700 text-sm">{settings.serviceArea}</p>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-lg">
              <div className="text-4xl mb-3">⏰</div>
              <h3 className="font-bold text-orange-900 mb-2">Hours</h3>
              <p className="text-orange-700 text-sm whitespace-pre-line">
                {settings.hours.replace(" | ", "\n")}
              </p>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-lg">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="font-bold text-orange-900 mb-2">Pricing</h3>
              <p className="text-orange-700 text-sm">
                Free Estimates
                <br />
                No Hidden Fees
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      {services.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-orange-900 mb-4">
                What We Haul Away
              </h2>
              <p className="text-xl text-orange-700">
                If it's junk to you, we'll take it
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-8 text-center border-2 border-orange-200 hover:border-orange-400 transition hover:shadow-lg"
                >
                  {service.icon && (
                    <div className="text-6xl mb-4">{service.icon}</div>
                  )}
                  <h3 className="font-bold text-xl text-orange-900 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-orange-700 text-sm">
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
        <section
          className="py-20 px-4 sm:px-6 lg:px-8"
          style={{
            background: "linear-gradient(135deg, #fed7aa 0%, #fef3c7 100%)",
          }}
        >
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-orange-900 mb-12 text-center">
              Before & After
            </h2>

            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
              {gallery[currentGalleryImage]?.image_url && (
                <div className="relative">
                  <div className="aspect-video bg-gradient-to-br from-orange-200 to-orange-300">
                    <img
                      src={getStorageUrl(
                        "gallery",
                        gallery[currentGalleryImage].image_url
                      )}
                      alt={gallery[currentGalleryImage].title || "Before and After"}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {gallery[currentGalleryImage].title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                      <p className="text-white text-xl font-bold">
                        {gallery[currentGalleryImage].title}
                      </p>
                    </div>
                  )}

                  {gallery.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setCurrentGalleryImage(
                            (prev) => (prev - 1 + gallery.length) % gallery.length
                          )
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
              )}
            </div>

            {gallery.length > 1 && (
              <div className="flex justify-center gap-3 mt-6">
                {gallery.map((_, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCurrentGalleryImage(idx)}
                    className={`w-3 h-3 rounded-full cursor-pointer transition ${
                      idx === currentGalleryImage
                        ? "bg-orange-600"
                        : "bg-orange-300 hover:bg-orange-400"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {testimonials.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-orange-900 mb-12 text-center">
              What People Say
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.slice(0, 3).map((testimonial, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-6 shadow-lg border-2 border-orange-200"
                >
                  <div className="flex mb-3">
                    {[...Array(testimonial.rating || 5)].map((_, i) => (
                      <span key={i} className="text-orange-500 text-xl">
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-orange-800 text-sm mb-3 leading-relaxed italic">
                    "{testimonial.text}"
                  </p>
                  <p className="text-orange-900 font-semibold">
                    — {testimonial.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* QUOTE FORM */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-orange-900" id="quote">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
              Get Your Free Quote
            </h2>
            <p className="text-xl text-orange-200">
              We'll text you back with pricing in minutes
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-orange-900 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-5 py-4 border-2 border-orange-200 rounded-2xl text-lg focus:border-orange-500 focus:outline-none transition"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-orange-900 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-5 py-4 border-2 border-orange-200 rounded-2xl text-lg focus:border-orange-500 focus:outline-none transition"
                  placeholder="702-555-1234"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-orange-900 mb-2">
                Address
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-5 py-4 border-2 border-orange-200 rounded-2xl text-lg focus:border-orange-500 focus:outline-none transition"
                placeholder="123 Main St, Las Vegas, NV"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-orange-900 mb-2">
                What needs removed?
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-5 py-4 border-2 border-orange-200 rounded-2xl text-lg focus:border-orange-500 focus:outline-none resize-none transition"
                placeholder="Old furniture, appliances, yard waste..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-orange-900 mb-2">
                When do you need this done?
              </label>
              <select
                required
                value={formData.selectedDate}
                onChange={(e) =>
                  setFormData({ ...formData, selectedDate: e.target.value })
                }
                className="w-full px-5 py-4 border-2 border-orange-200 rounded-2xl text-lg focus:border-orange-500 focus:outline-none transition appearance-none bg-white"
              >
                <option value="">Select a date...</option>
                {getNextDays().map((date) => (
                  <option
                    key={date.toISOString()}
                    value={date.toISOString().split("T")[0]}
                  >
                    {formatDateOption(date)} -{" "}
                    {date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-orange-900 mb-2">
                Upload Photos
              </label>
              <div className="border-2 border-dashed border-orange-300 rounded-2xl p-10 text-center bg-orange-50 hover:bg-orange-100 transition cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <p className="text-4xl mb-2">📷</p>
                  <p className="text-orange-800 font-semibold">
                    Click to upload (1-3 photos)
                  </p>
                  <p className="text-orange-600 text-sm mt-1">
                    Helps us give accurate pricing
                  </p>
                </label>
              </div>

              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-2xl border-2 border-orange-200"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow-lg hover:bg-red-600 transition"
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
              disabled={
                isSubmitting || photos.length === 0 || !formData.selectedDate
              }
              className={`w-full px-8 py-5 rounded-full font-bold text-xl shadow-lg transition transform ${
                isSubmitting || photos.length === 0 || !formData.selectedDate
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-orange-600 hover:bg-orange-700 text-white hover:scale-105"
              }`}
            >
              {isSubmitting ? "Sending..." : "Send My Quote Request 🚀"}
            </button>

            {(photos.length === 0 || !formData.selectedDate) && (
              <p className="text-center text-sm text-red-500 mt-3">
                {!formData.selectedDate
                  ? "Please select a date"
                  : "Please upload at least 1 photo"}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* ABOUT */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
            {/* Photos */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-orange-100 to-amber-100 aspect-square border-2 border-orange-200">
                {settings.aboutPhoto1 ? (
                  <img
                    src={getStorageUrl("business-assets", settings.aboutPhoto1)}
                    alt="About photo 1"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-orange-400 text-sm p-4 text-center">
                    Upload family photo (optional)
                  </div>
                )}
              </div>

              <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-orange-100 to-amber-100 aspect-square border-2 border-orange-200">
                {settings.aboutPhoto2 ? (
                  <img
                    src={getStorageUrl("business-assets", settings.aboutPhoto2)}
                    alt="About photo 2"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-orange-400 text-sm p-4 text-center">
                    Upload job photo (optional)
                  </div>
                )}
              </div>
            </div>

            {/* Text */}
            <div className="md:col-span-3">
              <div className="mb-6">
                <div className="inline-block bg-gradient-to-br from-orange-100 to-amber-100 rounded-full p-3 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-3xl">
                    👨‍👦
                  </div>
                </div>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-orange-900 mb-4">
                {settings.aboutTitle}
              </h2>
              <p className="text-lg text-orange-800 leading-relaxed whitespace-pre-line mb-6">
                {settings.aboutText}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`tel:${cleanPhone}`}
                  className="inline-flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full font-semibold transition transform hover:scale-105 shadow-lg"
                >
                  Call {settings.phone}
                </a>
                <a
                  href="#quote"
                  className="inline-flex items-center justify-center bg-white hover:bg-orange-50 text-orange-900 px-6 py-3 rounded-full font-semibold transition transform hover:scale-105 shadow-lg border-2 border-orange-200"
                >
                  Request a Quote
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-orange-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Contact</h3>
              <p className="text-orange-200 mb-2 text-lg font-semibold">
                {settings.phone}
              </p>
              <p className="text-orange-300">{settings.serviceArea}</p>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Hours</h3>
              <p className="text-orange-200 whitespace-pre-line">
                {settings.hours.replace(" | ", "\n")}
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-4">About</h3>
              <p className="text-orange-200 text-sm">
                Family-owned junk removal service. Building a legacy for my son
                Felix.
              </p>
            </div>
          </div>
          <div className="border-t border-orange-700 pt-8 text-center">
            <p className="text-xl font-bold mb-2">{settings.businessName}</p>
            <p className="text-orange-400 text-sm mb-4">
              © {new Date().getFullYear()} All rights reserved
            </p>
            <Link
              href="/login"
              className="text-orange-500 hover:text-orange-400 text-xs transition-colors"
            >
              Dashboard Login
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}