import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const router = useRouter();

  // Fetch logo from database
  useEffect(() => {
    const fetchLogo = async () => {
      const { data } = await supabase
        .from("settings")
        .select("logo_url")
        .maybeSingle();
      
      if (data?.logo_url) {
        const url = supabase.storage
          .from('business-assets')
          .getPublicUrl(data.logo_url).data.publicUrl;
        setLogoUrl(url);
      }
    };
    fetchLogo();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setErr(error.message);
      setIsLoading(false);
      return;
    }
    
    const to = router.query.redirectedFrom || "/dashboard";
    router.replace(to);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-6">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-48 mx-auto"
              />
            ) : (
              <div className="text-8xl mb-4">🗑️</div>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Dashboard Login
          </h1>
          <p className="text-gray-600">Access your admin panel</p>
        </div>

        <div className="bg-white border-2 border-blue-100 rounded-2xl p-8 shadow-xl">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg transition-colors text-gray-900 placeholder-gray-400"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg transition-colors text-gray-900 placeholder-gray-400"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {err && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">{err}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span>Sign In</span>
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Back to Site */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to site
          </a>
        </div>
      </div>
    </main>
  );
}