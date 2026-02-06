import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabaseClient";

export default function Dashboard() {
  const router = useRouter();

  // State
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Quote Requests
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [quoteTab, setQuoteTab] = useState("pending");

  // Services
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({
    title: "",
    description: "",
    icon: "",
  });

  // Gallery (Before/After)
  const [gallery, setGallery] = useState([]);
  const [newGalleryItem, setNewGalleryItem] = useState({
    title: "",
    category: "before",
    imageFile: null,
    imagePreview: null,
  });

  // Testimonials
  const [testimonials, setTestimonials] = useState([]);
  const [newTestimonial, setNewTestimonial] = useState({
    name: "",
    text: "",
    rating: 5,
    imageFile: null,
    imagePreview: null,
  });

  // Settings
  const [settings, setSettings] = useState({
    businessName: "Felix Cleans It LLC",
    phone: "(702) 583-1039",
    hours: "Sat-Sun: 8AM-6PM | Mon-Fri: 4PM-8PM",
    serviceArea: "Las Vegas Valley, Summerlin, Enterprise, Henderson",
    logoUrl: null,
    aboutTitle: "About Felix Cleans It",
    aboutText: "Felix Cleans It LLC is family-owned and operated. I started this business to build something real for my son — honest work, reliable service, and a name you can trust. We show up on time, treat your property with respect, and get the job done right.",
    aboutPhoto1: null,
    aboutPhoto2: null,
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  
  const [aboutPhoto1File, setAboutPhoto1File] = useState(null);
  const [aboutPhoto1Preview, setAboutPhoto1Preview] = useState(null);
  
  const [aboutPhoto2File, setAboutPhoto2File] = useState(null);
  const [aboutPhoto2Preview, setAboutPhoto2Preview] = useState(null);

  const [promo, setPromo] = useState({
    enabled: false,
    text: "",
  });

  // Job notes state for completed jobs
  const [jobNotes, setJobNotes] = useState({});
  const [jobPhotos, setJobPhotos] = useState({});
  const [expandedPhoto, setExpandedPhoto] = useState(null);

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, [router]);

  const fetchAllData = async () => {
    try {
      // Check auth (still use client for auth check)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push("/login");
        return;
      }

      // Fetch ALL data from API (uses service role, bypasses RLS)
      const response = await fetch('/api/dashboard-data');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      // Set all the data
      setQuoteRequests(data.quotes.map(q => ({
        ...q,
        _localNotes: "",
        _localPhotos: []
      })));

      if (data.settings) {
        setSettings({
          businessName: data.settings.business_name || "Felix Cleans It LLC",
          phone: data.settings.phone || "(702) 583-1039",
          hours: data.settings.hours || "Sat-Sun: 8AM-6PM | Mon-Fri: 4PM-8PM",
          serviceArea: data.settings.service_area || "Las Vegas Valley",
          logoUrl: data.settings.logo_url,
          aboutTitle: data.settings.about_title || "About Felix Cleans It",
          aboutText: data.settings.about_text || "Felix Cleans It LLC is family-owned and operated. I started this business to build something real for my son — honest work, reliable service, and a name you can trust. We show up on time, treat your property with respect, and get the job done right.",
          aboutPhoto1: data.settings.about_photo_1,
          aboutPhoto2: data.settings.about_photo_2,
        });

        setPromo({
          enabled: data.settings.promo_enabled ?? false,
          text: data.settings.promo_text ?? "",
        });
      }

      setServices(data.services);
      setGallery(data.gallery);
      setTestimonials(data.testimonials);
      setReady(true);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to load dashboard: " + error.message);
    }
  };

  const getStorageUrl = (bucket, path) => {
    if (!path) return null;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  // Quote Request Actions
  const updateQuoteStatus = async (id, status) => {
    const { error } = await supabase
      .from("quote_requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status");
      return;
    }

    setQuoteRequests(prev =>
      prev.map(q => q.id === id ? { ...q, status } : q)
    );
  };

  const deleteQuote = async (id) => {
    const ok = window.confirm("Delete this quote request?");
    if (!ok) return;

    const { error } = await supabase
      .from("quote_requests")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete:", error);
      alert("Failed to delete quote");
      return;
    }

    setQuoteRequests(prev => prev.filter(q => q.id !== id));
  };

  // Job Notes & Photos (for completed jobs)
  const updateLocalNotes = (id, text) => {
    setQuoteRequests(prev =>
      prev.map(q => q.id === id ? { ...q, _localNotes: text } : q)
    );
  };

  const handleLocalPhotos = (id, files) => {
    const readers = Array.from(files).map(file => {
      return new Promise(resolve => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(images => {
      setQuoteRequests(prev =>
        prev.map(q =>
          q.id === id
            ? { ...q, _localPhotos: [...(q._localPhotos || []), ...images] }
            : q
        )
      );
    });
  };

  const saveJobNotes = async (id) => {
    const quote = quoteRequests.find(q => q.id === id);
    if (!quote) return;

    try {
      const newSavedNotes = [];
      const newSavedPhotos = [];

      // Upload photos
      const photoFileNames = [];
      if (quote._localPhotos && quote._localPhotos.length > 0) {
        for (const photo of quote._localPhotos) {
          const response = await fetch(photo);
          const blob = await response.blob();
          const fileName = `${Date.now()}-${Math.random()}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from("job-photos")
            .upload(fileName, blob);

          if (!uploadError) {
            photoFileNames.push(fileName);
          }
        }
      }

      // Save notes
      if (quote._localNotes && quote._localNotes.trim() !== "") {
        const { data: noteRows, error: noteError } = await supabase
          .from("job_notes")
          .insert({
            quote_request_id: id,
            notes: quote._localNotes.trim(),
          })
          .select("*");

        if (noteError) throw noteError;
        if (noteRows && noteRows.length > 0) {
          newSavedNotes.push(noteRows[0]);
        }
      }

      // Save photos
      if (photoFileNames.length > 0) {
        const { data: photoRows, error: photoError } = await supabase
          .from("job_photos")
          .insert(
            photoFileNames.map(fileName => ({
              quote_request_id: id,
              photo_url: fileName,
            }))
          )
          .select("*");

        if (photoError) throw photoError;
        if (photoRows) newSavedPhotos.push(...photoRows);
      }

      // Update local state
      setQuoteRequests(prev =>
        prev.map(q =>
          q.id === id
            ? {
                ...q,
                savedNotes: [...(q.savedNotes || []), ...newSavedNotes],
                savedPhotos: [...(q.savedPhotos || []), ...newSavedPhotos],
                _localNotes: "",
                _localPhotos: [],
              }
            : q
        )
      );

      alert("✅ Notes and photos saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save notes");
    }
  };

  // Services
  const handleAddService = async (e) => {
    e.preventDefault();
    if (!newService.title.trim()) {
      alert("Please enter a service title.");
      return;
    }

    const { data, error } = await supabase
      .from("services")
      .insert({
        title: newService.title,
        description: newService.description,
        icon: newService.icon || "🚛",
      })
      .select();

    if (error) {
      console.error(error);
      alert("Failed to add service");
      return;
    }

    setServices(prev => [data[0], ...prev]);
    setNewService({ title: "", description: "", icon: "" });
  };

  const handleDeleteService = async (id) => {
    const ok = window.confirm("Remove this service?");
    if (!ok) return;

    const { error } = await supabase.from("services").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("Failed to delete service");
      return;
    }

    setServices(prev => prev.filter(s => s.id !== id));
  };

  // Gallery
  const handleAddGalleryItem = async (e) => {
    e.preventDefault();

    let imagePath = null;

    if (newGalleryItem.imageFile) {
      const fileExt = newGalleryItem.imageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, newGalleryItem.imageFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert("Failed to upload image");
        return;
      }

      imagePath = fileName;
    }

    const { data, error } = await supabase
      .from("gallery")
      .insert({
        title: newGalleryItem.title,
        category: newGalleryItem.category,
        image_url: imagePath,
      })
      .select();

    if (error) {
      console.error(error);
      alert("Failed to add gallery item");
      return;
    }

    setGallery(prev => [data[0], ...prev]);
    setNewGalleryItem({
      title: "",
      category: "before",
      imageFile: null,
      imagePreview: null,
    });
  };

  const handleDeleteGalleryItem = async (id) => {
    const ok = window.confirm("Delete this gallery item?");
    if (!ok) return;

    const { error } = await supabase.from("gallery").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("Failed to delete gallery item");
      return;
    }

    setGallery(prev => prev.filter(g => g.id !== id));
  };

  // Testimonials
  const handleAddTestimonial = async (e) => {
    e.preventDefault();

    let photoPath = null;

    if (newTestimonial.imageFile) {
      const fileExt = newTestimonial.imageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("testimonials")
        .upload(fileName, newTestimonial.imageFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
      } else {
        photoPath = fileName;
      }
    }

    const { data, error } = await supabase
      .from("testimonials")
      .insert({
        name: newTestimonial.name,
        text: newTestimonial.text,
        rating: newTestimonial.rating,
        image_url: photoPath,
      })
      .select();

    if (error) {
      console.error(error);
      alert("Failed to add testimonial");
      return;
    }

    setTestimonials(prev => [data[0], ...prev]);
    setNewTestimonial({
      name: "",
      text: "",
      rating: 5,
      imageFile: null,
      imagePreview: null,
    });
  };

  const handleDeleteTestimonial = async (id) => {
    const ok = window.confirm("Delete this testimonial?");
    if (!ok) return;

    const { error } = await supabase.from("testimonials").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("Failed to delete testimonial");
      return;
    }

    setTestimonials(prev => prev.filter(t => t.id !== id));
  };

  // Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert("You must be logged in to save settings");
        return;
      }

      let logoPath = settings.logoUrl;
      let aboutPhoto1Path = settings.aboutPhoto1;
      let aboutPhoto2Path = settings.aboutPhoto2;

      // Upload new logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("business-assets")
          .upload(fileName, logoFile);

        if (uploadError) {
          console.error("Logo upload error:", uploadError);
          alert("Failed to upload logo");
          return;
        }

        logoPath = fileName;
      }

      // Upload about photo 1 if provided
      if (aboutPhoto1File) {
        const fileExt = aboutPhoto1File.name.split(".").pop();
        const fileName = `about-1-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("business-assets")
          .upload(fileName, aboutPhoto1File);

        if (uploadError) {
          console.error("About photo 1 upload error:", uploadError);
          alert("Failed to upload about photo 1");
          return;
        }

        aboutPhoto1Path = fileName;
      }

      // Upload about photo 2 if provided
      if (aboutPhoto2File) {
        const fileExt = aboutPhoto2File.name.split(".").pop();
        const fileName = `about-2-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("business-assets")
          .upload(fileName, aboutPhoto2File);

        if (uploadError) {
          console.error("About photo 2 upload error:", uploadError);
          alert("Failed to upload about photo 2");
          return;
        }

        aboutPhoto2Path = fileName;
      }

      const payload = {
        owner_id: user.id,
        business_name: settings.businessName,
        phone: settings.phone,
        hours: settings.hours,
        service_area: settings.serviceArea,
        logo_url: logoPath,
        promo_text: promo.text,
        promo_enabled: promo.enabled,
        about_title: settings.aboutTitle,
        about_text: settings.aboutText,
        about_photo_1: aboutPhoto1Path,
        about_photo_2: aboutPhoto2Path,
      };

      // Call API route (uses service role, bypasses RLS)
      const response = await fetch('/api/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      setSettings(prev => ({
        ...prev,
        logoUrl: result.data.logo_url,
        aboutPhoto1: result.data.about_photo_1,
        aboutPhoto2: result.data.about_photo_2,
      }));

      setLogoFile(null);
      setLogoPreview(null);
      setAboutPhoto1File(null);
      setAboutPhoto1Preview(null);
      setAboutPhoto2File(null);
      setAboutPhoto2Preview(null);

      alert("✅ Settings saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings: " + err.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      router.push("/login");
    }
  };

  // Loading state
  if (!ready) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-orange-900 text-sm font-semibold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Dashboard", icon: "🏠" },
    { id: "quotes", label: "Quotes", icon: "📋" },
    { id: "services", label: "Services", icon: "🚛" },
    { id: "gallery", label: "Gallery", icon: "📸" },
    { id: "reviews", label: "Reviews", icon: "⭐" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  const pendingQuotes = quoteRequests.filter(q => q.status === "pending");
  const confirmedQuotes = quoteRequests.filter(q => q.status === "confirmed");
  const completedQuotes = quoteRequests.filter(q => q.status === "completed");

  return (
    <div className="min-h-screen bg-amber-50 flex relative">
      {/* SIDEBAR - Mobile overlay, desktop sidebar */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarOpen ? 'w-64' : 'lg:w-20'}
        fixed lg:relative inset-y-0 left-0 z-50
        bg-white border-r-2 border-orange-200 transition-all duration-300 flex flex-col shadow-lg
      `}>
        {/* Logo/Header */}
        <div className="p-6 border-b-2 border-orange-100">
          {sidebarOpen ? (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🗑️</span>
                </div>
                <div>
                  <h1 className="text-2xl font-black text-orange-900">Felix</h1>
                  <p className="text-xs text-orange-700 font-semibold">Dashboard</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🗑️</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all transform ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-105'
                  : 'text-orange-900 hover:bg-orange-50 hover:scale-105'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              {sidebarOpen && <span className="text-sm">{tab.label}</span>}
            </button>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t-2 border-orange-100">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-600 hover:bg-red-50 font-bold transition"
          >
            <span className="text-xl">🚪</span>
            {sidebarOpen && <span className="text-sm">Sign Out</span>}
          </button>
        </div>

        {/* Toggle Button - Desktop */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:block absolute -right-3 top-20 w-6 h-6 bg-orange-500 text-white rounded-full items-center justify-center shadow-lg hover:bg-orange-600 transition font-bold"
        >
          {sidebarOpen ? '←' : '→'}
        </button>
      </aside>

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto w-full">
        {/* Mobile header with menu button */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b-2 border-orange-200 p-4 flex items-center justify-between shadow-md">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg"
          >
            <span className="text-xl">☰</span>
          </button>
          <h1 className="text-lg font-black text-orange-900">
            {tabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
          </h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Welcome Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-8 text-white shadow-xl">
                <h2 className="text-3xl font-extrabold mb-2">Welcome back! 👋</h2>
                <p className="text-orange-100">Here's what's happening with your business today</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-6 border-2 border-orange-200 shadow-lg hover:shadow-xl transition hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center">
                      <span className="text-3xl">⏳</span>
                    </div>
                    <span className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">PENDING</span>
                  </div>
                  <p className="text-5xl font-black text-orange-900 mb-2">{pendingQuotes.length}</p>
                  <p className="text-sm text-orange-700 font-semibold">Quotes waiting for you</p>
                </div>

                <div className="bg-white rounded-3xl p-6 border-2 border-orange-200 shadow-lg hover:shadow-xl transition hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center">
                      <span className="text-3xl">✅</span>
                    </div>
                    <span className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">CONFIRMED</span>
                  </div>
                  <p className="text-5xl font-black text-orange-900 mb-2">{confirmedQuotes.length}</p>
                  <p className="text-sm text-orange-700 font-semibold">Jobs ready to go</p>
                </div>

                <div className="bg-white rounded-3xl p-6 border-2 border-orange-200 shadow-lg hover:shadow-xl transition hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center">
                      <span className="text-3xl">🎉</span>
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full">DONE</span>
                  </div>
                  <p className="text-5xl font-black text-orange-900 mb-2">{completedQuotes.length}</p>
                  <p className="text-sm text-orange-700 font-semibold">Completed jobs</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-3xl p-6 border-2 border-orange-200 shadow-lg">
                <h3 className="text-xl font-extrabold text-orange-900 mb-4 flex items-center gap-2">
                  <span>📋</span> Recent Quote Requests
                </h3>
                <div className="space-y-3">
                  {quoteRequests.slice(0, 5).map(q => (
                    <div
                      key={q.id}
                      className="flex items-center gap-4 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl hover:shadow-md transition cursor-pointer border-2 border-orange-100"
                      onClick={() => setActiveTab("quotes")}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-md ${
                        q.status === "pending" ? "bg-orange-200" :
                        q.status === "confirmed" ? "bg-orange-300" :
                        "bg-green-200"
                      }`}>
                        {q.status === "pending" ? "⏳" :
                         q.status === "confirmed" ? "✅" :
                         "🎉"}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-orange-900">{q.name}</p>
                        <p className="text-sm text-orange-700">{q.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-orange-700 font-semibold">{new Date(q.created_at).toLocaleDateString()}</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          q.status === "pending" ? "bg-orange-200 text-orange-800" :
                          q.status === "confirmed" ? "bg-orange-300 text-orange-900" :
                          "bg-green-200 text-green-800"
                        }`}>
                          {q.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        {/* QUOTE REQUESTS TAB */}
        {activeTab === "quotes" && (
          <section className="space-y-4">
            <h2 className="text-3xl font-black text-orange-900 px-4">
              Quote Requests
            </h2>

            {/* Filter tabs */}
            <div className="bg-white rounded-3xl border-2 border-orange-200 p-2 shadow-lg">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setQuoteTab("pending")}
                  className={`py-4 rounded-2xl font-black text-base transition-all transform ${
                    quoteTab === "pending"
                      ? "bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg scale-105"
                      : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                  }`}
                >
                  <div className="text-2xl mb-1">⏳</div>
                  <div className="text-xs">Pending</div>
                  <div className="text-lg font-black">({pendingQuotes.length})</div>
                </button>
                
                <button
                  onClick={() => setQuoteTab("confirmed")}
                  className={`py-4 rounded-2xl font-black text-base transition-all transform ${
                    quoteTab === "confirmed"
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-105"
                      : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                  }`}
                >
                  <div className="text-2xl mb-1">✅</div>
                  <div className="text-xs">Confirmed</div>
                  <div className="text-lg font-black">({confirmedQuotes.length})</div>
                </button>
                
                <button
                  onClick={() => setQuoteTab("completed")}
                  className={`py-4 rounded-2xl font-black text-base transition-all transform ${
                    quoteTab === "completed"
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-105"
                      : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                  }`}
                >
                  <div className="text-2xl mb-1">🎉</div>
                  <div className="text-xs">Done</div>
                  <div className="text-lg font-black">({completedQuotes.length})</div>
                </button>
              </div>
            </div>

            {/* Quote list */}
            <div className="space-y-4">
              {(quoteTab === "pending"
                ? pendingQuotes
                : quoteTab === "confirmed"
                ? confirmedQuotes
                : completedQuotes
              ).map(q => (
                <div key={q.id} className="bg-white border-2 border-orange-200 rounded-3xl p-4 sm:p-6 shadow-lg">
                  <div className="space-y-3">
                    <div>
                      <p className="font-bold text-orange-900 text-base sm:text-lg">{q.name}</p>
                      <p className="text-sm text-orange-700 font-semibold">{q.phone}</p>
                      <p className="text-sm text-orange-700 mt-1">📍 {q.address}</p>
                      <p className="text-sm text-orange-800 mt-2">{q.description}</p>
                      <p className="text-xs text-orange-600 mt-2 font-semibold">
                        Requested for: {new Date(q.timeline).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Photos */}
                    {q.photos && q.photos.length > 0 && (
                      <div>
                        <p className="text-xs text-orange-900 font-bold mb-2">Customer Photos:</p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {q.photos.map((photo, idx) => (
                            <img
                              key={idx}
                              src={getStorageUrl("quote-photos", photo)}
                              alt={`Photo ${idx + 1}`}
                              onClick={() => setExpandedPhoto(getStorageUrl("quote-photos", photo))}
                              className="w-20 h-20 flex-shrink-0 object-cover rounded-2xl border-2 border-orange-200 cursor-zoom-in hover:scale-105 transition"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      {q.status === "pending" && (
                        <button
                          onClick={() => updateQuoteStatus(q.id, "confirmed")}
                          className="w-full sm:w-auto px-6 py-3 sm:py-4 bg-orange-600 text-white text-sm font-bold rounded-2xl hover:bg-orange-700 shadow-lg transition transform active:scale-95"
                        >
                          Confirm Job
                        </button>
                      )}
                      {q.status === "confirmed" && (
                        <button
                          onClick={() => updateQuoteStatus(q.id, "completed")}
                          className="w-full sm:w-auto px-6 py-3 sm:py-4 bg-green-600 text-white text-sm font-bold rounded-2xl hover:bg-green-700 shadow-lg transition transform active:scale-95"
                        >
                          Mark Completed
                        </button>
                      )}
                      {q.status === "completed" && (
                        <div className="w-full space-y-3 mt-4 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-4">
                          {/* Saved notes */}
                          {q.savedNotes && q.savedNotes.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-orange-900 mb-2">Saved Notes:</p>
                              {q.savedNotes.map(n => (
                                <p key={n.id} className="text-sm text-orange-800 mb-1">• {n.notes}</p>
                              ))}
                            </div>
                          )}

                          {/* Saved photos */}
                          {q.savedPhotos && q.savedPhotos.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-orange-900 mb-2">Saved Photos:</p>
                              <div className="flex gap-2">
                                {q.savedPhotos.map(p => (
                                  <img
                                    key={p.id}
                                    src={getStorageUrl("job-photos", p.photo_url)}
                                    alt="Job photo"
                                    onClick={() => setExpandedPhoto(getStorageUrl("job-photos", p.photo_url))}
                                    className="w-20 h-20 object-cover rounded-2xl border-2 border-orange-200 cursor-zoom-in hover:scale-105 transition"
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Add new notes */}
                          <div>
                            <label className="text-xs text-orange-900 font-bold">Add Job Notes:</label>
                            <textarea
                              value={q._localNotes || ""}
                              onChange={e => updateLocalNotes(q.id, e.target.value)}
                              rows={3}
                              placeholder="What did you haul? Any issues? Payment details?"
                              className="w-full mt-1 border-2 border-orange-200 rounded-2xl p-3 text-sm focus:border-orange-500 focus:outline-none"
                            />
                          </div>

                          {/* Add photos */}
                          <div>
                            <label className="text-xs text-orange-900 font-bold">Add Job Photos:</label>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={e => handleLocalPhotos(q.id, e.target.files)}
                              className="mt-1 text-sm"
                            />
                            {q._localPhotos && q._localPhotos.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {q._localPhotos.map((src, i) => (
                                  <img
                                    key={i}
                                    src={src}
                                    alt={`Preview ${i + 1}`}
                                    className="w-20 h-20 object-cover rounded-2xl border-2 border-orange-200"
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => saveJobNotes(q.id)}
                            className="px-6 py-4 bg-orange-900 text-white text-sm font-bold rounded-2xl hover:bg-orange-800 shadow-lg transition"
                          >
                            Save Notes & Photos
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => deleteQuote(q.id)}
                        className="w-full sm:w-auto px-6 py-3 sm:py-4 border-2 border-orange-200 text-orange-900 text-sm font-bold rounded-2xl hover:bg-orange-50 transition active:scale-95"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SERVICES TAB */}
        {activeTab === "services" && (
          <section className="bg-white border-2 border-orange-200 rounded-3xl p-4 sm:p-6 shadow-lg">
            <h2 className="text-xl sm:text-2xl font-black text-orange-900 mb-4">
              Services
            </h2>

            {/* Add service form */}
            <form onSubmit={handleAddService} className="border-2 border-orange-200 rounded-2xl p-4 mb-6 space-y-4 bg-gradient-to-br from-orange-50 to-amber-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-base font-bold text-orange-900 mb-1">
                    Service Title
                  </label>
                  <input
                    type="text"
                    value={newService.title}
                    onChange={e =>
                      setNewService(prev => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g. Junk Removal"
                    className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base text-orange-900 placeholder-orange-400 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-orange-900 mb-1">
                    Icon (emoji)
                  </label>
                  <input
                    type="text"
                    value={newService.icon}
                    onChange={e =>
                      setNewService(prev => ({ ...prev, icon: e.target.value }))
                    }
                    placeholder="🚛"
                    className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base text-orange-900 placeholder-orange-400 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-base font-bold text-orange-900 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newService.description}
                  onChange={e =>
                    setNewService(prev => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="What's included in this service?"
                  className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base text-orange-900 placeholder-orange-400 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-4 bg-orange-600 text-white text-sm font-bold rounded-2xl hover:bg-orange-700 shadow-lg transition transform hover:scale-105"
              >
                Add Service
              </button>
            </form>

            {/* Services list */}
            <div className="space-y-3">
              {services.map(s => (
                <div
                  key={s.id}
                  className="border-2 border-orange-200 rounded-2xl p-4 flex items-start justify-between bg-gradient-to-br from-orange-50 to-amber-50"
                >
                  <div className="flex gap-3">
                    {s.icon && <div className="text-3xl">{s.icon}</div>}
                    <div>
                      <p className="font-bold text-orange-900">{s.title}</p>
                      <p className="text-sm text-orange-700">{s.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteService(s.id)}
                    className="text-sm text-red-600 hover:text-red-700 font-bold"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* GALLERY TAB */}
        {activeTab === "gallery" && (
          <section className="bg-white border-2 border-orange-200 rounded-3xl p-4 sm:p-6 shadow-lg">
            <h2 className="text-xl sm:text-2xl font-black text-orange-900 mb-4">
              Before & After Gallery
            </h2>

            {/* Add gallery item */}
            <form onSubmit={handleAddGalleryItem} className="border-2 border-orange-200 rounded-2xl p-4 mb-6 space-y-4 bg-gradient-to-br from-orange-50 to-amber-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-orange-900 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newGalleryItem.title}
                    onChange={e =>
                      setNewGalleryItem(prev => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g. Garage Cleanout"
                    className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base text-orange-900 placeholder-orange-400 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-orange-900 mb-1">
                    Category
                  </label>
                  <select
                    value={newGalleryItem.category}
                    onChange={e =>
                      setNewGalleryItem(prev => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base focus:border-orange-500 focus:outline-none"
                  >
                    <option value="before">Before</option>
                    <option value="after">After</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-base font-bold text-orange-900 mb-1">
                  Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setNewGalleryItem(prev => ({
                      ...prev,
                      imageFile: file,
                      imagePreview: URL.createObjectURL(file),
                    }));
                  }}
                  className="text-sm"
                />
                {newGalleryItem.imagePreview && (
                  <img
                    src={newGalleryItem.imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-2xl mt-2 border-2 border-orange-200"
                  />
                )}
              </div>
              <button
                type="submit"
                className="px-6 py-4 bg-orange-600 text-white text-sm font-bold rounded-2xl hover:bg-orange-700 shadow-lg transition transform hover:scale-105"
              >
                Add to Gallery
              </button>
            </form>

            {/* Gallery grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {gallery.map(g => (
                <div key={g.id} className="border-2 border-orange-200 rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition">
                  {g.image_url && (
                    <img
                      src={getStorageUrl("gallery", g.image_url)}
                      alt={g.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-3">
                    <p className="font-bold text-sm text-orange-900">{g.title}</p>
                    <p className="text-xs text-orange-700">{g.category}</p>
                    <button
                      onClick={() => handleDeleteGalleryItem(g.id)}
                      className="text-xs text-red-600 hover:text-red-700 mt-2 font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* REVIEWS TAB */}
        {activeTab === "reviews" && (
          <section className="bg-white border-2 border-orange-200 rounded-3xl p-4 sm:p-6 shadow-lg">
            <h2 className="text-xl sm:text-2xl font-black text-orange-900 mb-4">
              Customer Reviews
            </h2>

            {/* Add testimonial */}
            <form onSubmit={handleAddTestimonial} className="border-2 border-orange-200 rounded-2xl p-4 mb-6 space-y-4 bg-gradient-to-br from-orange-50 to-amber-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-orange-900 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={newTestimonial.name}
                    onChange={e =>
                      setNewTestimonial(prev => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="John D."
                    className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base text-orange-900 placeholder-orange-400 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-orange-900 mb-1">
                    Rating
                  </label>
                  <select
                    value={newTestimonial.rating}
                    onChange={e =>
                      setNewTestimonial(prev => ({ ...prev, rating: Number(e.target.value) }))
                    }
                    className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base focus:border-orange-500 focus:outline-none"
                  >
                    {[5, 4, 3, 2, 1].map(r => (
                      <option key={r} value={r}>
                        {r} stars
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-base font-bold text-orange-900 mb-1">
                  Review Text
                </label>
                <textarea
                  value={newTestimonial.text}
                  onChange={e =>
                    setNewTestimonial(prev => ({ ...prev, text: e.target.value }))
                  }
                  rows={3}
                  placeholder="What did they say?"
                  className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base text-orange-900 placeholder-orange-400 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-base font-bold text-orange-900 mb-1">
                  Photo (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setNewTestimonial(prev => ({
                      ...prev,
                      imageFile: file,
                      imagePreview: URL.createObjectURL(file),
                    }));
                  }}
                  className="text-sm"
                />
                {newTestimonial.imagePreview && (
                  <img
                    src={newTestimonial.imagePreview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-2xl mt-2 border-2 border-orange-200"
                  />
                )}
              </div>
              <button
                type="submit"
                className="px-6 py-4 bg-orange-600 text-white text-sm font-bold rounded-2xl hover:bg-orange-700 shadow-lg transition transform hover:scale-105"
              >
                Add Review
              </button>
            </form>

            {/* Testimonials list */}
            <div className="space-y-3">
              {testimonials.map(t => (
                <div
                  key={t.id}
                  className="border-2 border-orange-200 rounded-2xl p-4 flex items-start justify-between bg-gradient-to-br from-orange-50 to-amber-50"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-orange-900">{t.name}</p>
                      <span className="text-sm text-orange-500">
                        {"★".repeat(t.rating)}
                      </span>
                    </div>
                    <p className="text-sm text-orange-800">{t.text}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteTestimonial(t.id)}
                    className="text-sm text-red-600 hover:text-red-700 font-bold"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <section className="bg-white border-2 border-orange-200 rounded-3xl p-4 sm:p-6 shadow-lg">
            <h2 className="text-xl sm:text-2xl font-black text-orange-900 mb-4">
              Settings
            </h2>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Logo Upload */}
              <div>
                <h3 className="text-sm font-bold text-orange-900 mb-3">Business Logo</h3>
                <div className="flex items-start gap-4">
                  <div className="w-32 h-32 bg-gradient-to-br from-orange-100 to-amber-100 border-2 border-orange-200 rounded-2xl overflow-hidden flex items-center justify-center">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : settings.logoUrl ? (
                      <img
                        src={getStorageUrl("business-assets", settings.logoUrl)}
                        alt="Current logo"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-3xl mb-2">🗑️</div>
                        <p className="text-xs text-orange-700 font-semibold">No logo</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-orange-900 font-bold mb-1">
                      Upload New Logo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setLogoFile(file);
                        setLogoPreview(URL.createObjectURL(file));
                      }}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Business Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-orange-900 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={settings.businessName}
                    onChange={e =>
                      setSettings(prev => ({ ...prev, businessName: e.target.value }))
                    }
                    className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base text-orange-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-orange-900 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={e =>
                      setSettings(prev => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base text-orange-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-orange-900 mb-1">
                  Service Area
                </label>
                <input
                  type="text"
                  value={settings.serviceArea}
                  onChange={e =>
                    setSettings(prev => ({ ...prev, serviceArea: e.target.value }))
                  }
                  className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base text-orange-900 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-orange-900 mb-1">
                  Hours
                </label>
                <input
                  type="text"
                  value={settings.hours}
                  onChange={e =>
                    setSettings(prev => ({ ...prev, hours: e.target.value }))
                  }
                  className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base text-orange-900 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Promo Banner */}
              <div className="border-t-2 border-orange-200 pt-6">
                <h3 className="text-sm font-bold text-orange-900 mb-3">
                  Promo Banner
                </h3>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={promo.enabled}
                    onChange={e =>
                      setPromo(prev => ({ ...prev, enabled: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-orange-300 text-orange-600"
                  />
                  <span className="text-sm text-orange-900 font-semibold">
                    Show promo banner on website
                  </span>
                </label>
                <input
                  type="text"
                  value={promo.text}
                  onChange={e => setPromo(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="e.g. Get 10 jobs stamped, 11th is free!"
                  className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base text-orange-900 placeholder-orange-400 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* About Section */}
              <div className="border-t-2 border-orange-200 pt-6">
                <h3 className="text-lg font-extrabold text-orange-900 mb-4">
                  About Section
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-base font-bold text-orange-900 mb-1">
                      About Title
                    </label>
                    <input
                      type="text"
                      value={settings.aboutTitle}
                      onChange={e =>
                        setSettings(prev => ({ ...prev, aboutTitle: e.target.value }))
                      }
                      placeholder="About Felix Cleans It"
                      className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base text-orange-900 placeholder-orange-400 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-bold text-orange-900 mb-1">
                      About Text
                    </label>
                    <textarea
                      rows={6}
                      value={settings.aboutText}
                      onChange={e =>
                        setSettings(prev => ({ ...prev, aboutText: e.target.value }))
                      }
                      placeholder="Tell your story..."
                      className="w-full border-2 border-orange-200 rounded-2xl px-4 py-4 text-base text-orange-900 placeholder-orange-400 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* About Photos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Photo 1 */}
                    <div>
                      <label className="block text-sm font-bold text-orange-900 mb-2">
                        About Photo 1 (Family/Personal)
                      </label>
                      <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-amber-100 border-2 border-orange-200 rounded-2xl overflow-hidden flex items-center justify-center mb-2">
                        {aboutPhoto1Preview ? (
                          <img
                            src={aboutPhoto1Preview}
                            alt="About photo 1 preview"
                            className="w-full h-full object-cover"
                          />
                        ) : settings.aboutPhoto1 ? (
                          <img
                            src={getStorageUrl("business-assets", settings.aboutPhoto1)}
                            alt="Current about photo 1"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-orange-400">
                            <p className="text-sm font-semibold">No photo uploaded</p>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          setAboutPhoto1File(file);
                          setAboutPhoto1Preview(URL.createObjectURL(file));
                        }}
                        className="text-sm"
                      />
                    </div>

                    {/* Photo 2 */}
                    <div>
                      <label className="block text-sm font-bold text-orange-900 mb-2">
                        About Photo 2 (Job/Work)
                      </label>
                      <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-amber-100 border-2 border-orange-200 rounded-2xl overflow-hidden flex items-center justify-center mb-2">
                        {aboutPhoto2Preview ? (
                          <img
                            src={aboutPhoto2Preview}
                            alt="About photo 2 preview"
                            className="w-full h-full object-cover"
                          />
                        ) : settings.aboutPhoto2 ? (
                          <img
                            src={getStorageUrl("business-assets", settings.aboutPhoto2)}
                            alt="Current about photo 2"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-orange-400">
                            <p className="text-sm font-semibold">No photo uploaded</p>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          setAboutPhoto2File(file);
                          setAboutPhoto2Preview(URL.createObjectURL(file));
                        }}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-4 bg-orange-600 text-white text-sm font-bold rounded-2xl hover:bg-orange-700 shadow-lg transition transform hover:scale-105"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </section>
        )}
      </div>

      {/* Photo Modal */}
      {expandedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpandedPhoto(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setExpandedPhoto(null)}
              className="absolute -top-10 right-0 text-white text-sm hover:text-gray-300 font-bold"
            >
              ✕ Close
            </button>
            <img
              src={expandedPhoto}
              alt="Expanded"
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </main>
    </div>
  );
}