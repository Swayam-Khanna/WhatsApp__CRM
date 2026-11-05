"use client";

import { useState, useRef } from "react";
import { X, Upload, Loader2, User, Search, AlertCircle, CheckCircle2, UserPlus, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api/admin-auth.client";
import { slugify } from "@/lib/farmer/use-farmer";
import { uploadToCloudinary } from "@/lib/cloudinary-client";

interface RegisterFarmerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterFarmerModal({ isOpen, onClose }: RegisterFarmerModalProps) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<"new" | "link">("new");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [village, setVillage] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeLocationText, setPincodeLocationText] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedUrlRef = useRef<string | null>(null);
  const uploadPromiseRef = useRef<Promise<string> | null>(null);

  const handlePincodeChange = async (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    setPincode(clean);

    if (clean.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await fetch(`/api/pincode/${clean}`);
        const json = await res.json();
        if (json.success && json.data) {
          const { state: detectedState, district: detectedDistrict, postOffices } = json.data;
          if (detectedState) setState(detectedState);
          if (detectedDistrict) setDistrict(detectedDistrict);
          if (postOffices && postOffices.length > 0 && !village) {
            setVillage(postOffices[0].name);
          }
          const loc = `${detectedDistrict ? detectedDistrict + ", " : ""}${detectedState}`;
          setPincodeLocationText(loc);
          toast.success(`Location detected: ${loc}`);
        } else {
          setPincodeLocationText(null);
        }
      } catch (err) {
        console.warn("Pincode lookup error:", err);
      } finally {
        setPincodeLoading(false);
      }
    } else {
      setPincodeLocationText(null);
    }
  };

  // Fetch profiles that do not have a farmer_profiles record yet (only when link mode is active)
  const { data: unlinkedProfiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-unlinked-profiles"],
    queryFn: async () => {
      const { data: existingFarmers } = await supabase
        .from("farmer_profiles")
        .select("user_id");

      const existingUserIds = new Set((existingFarmers || []).map((f: any) => f.user_id));

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (profiles || []).filter((p: any) => !existingUserIds.has(p.id));
    },
    enabled: isOpen && registrationMode === "link",
  });

  if (!isOpen) return null;

  const filteredProfiles = unlinkedProfiles.filter((u: any) => {
    if (!userSearch.trim()) return true;
    const s = userSearch.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(s) ||
      (u.email || "").toLowerCase().includes(s) ||
      (u.phone || "").toLowerCase().includes(s) ||
      (u.id || "").toLowerCase().includes(s)
    );
  });

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    const selected = unlinkedProfiles.find((p: any) => p.id === userId);
    if (selected) {
      if (selected.full_name) setFullName(selected.full_name);
      if (selected.phone) setPhone(selected.phone);
      if (selected.email) setEmail(selected.email);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      uploadedUrlRef.current = null;

      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Start pre-uploading in the background immediately so it's already done when submitting
      uploadPromiseRef.current = uploadToCloudinary(file, "prajnaa/farmers")
        .then((url) => {
          if (url) uploadedUrlRef.current = url;
          return url;
        })
        .catch((err) => {
          console.warn("[RegisterFarmer] Background upload notice:", err?.message || err);
          return "";
        });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (registrationMode === "link" && !selectedUserId) {
        toast.error("Please select a registered user account to link, or switch to 'Direct Add'.");
        setLoading(false);
        return;
      }

      const formData = new FormData(e.currentTarget);
      
      const formFullName = ((formData.get("fullName") as string) || fullName).trim();
      const formPhone = ((formData.get("phone") as string) || phone).trim();
      const formEmail = ((formData.get("email") as string) || email).trim();
      const aadhaar = (formData.get("aadhaar") as string) || "";
      const pan = (formData.get("pan") as string) || "";
      const kishanId = (formData.get("kishanId") as string) || "";
      
      const farmName = ((formData.get("farmName") as string) || "").trim();
      const villageVal = ((formData.get("village") as string) || village).trim();
      const districtVal = ((formData.get("district") as string) || district).trim();
      const stateVal = ((formData.get("state") as string) || state).trim();
      const pincodeVal = ((formData.get("pincode") as string) || pincode).trim();
      const totalLandArea = formData.get("totalLandArea") as string;
      const landUnit = formData.get("landUnit") as string;
      const cultivatedArea = formData.get("cultivatedArea") as string;
      const khasraNumbers = formData.get("khasraNumbers") as string;
      const cultivatorType = formData.get("cultivatorType") as string;
      const yearsFarming = formData.get("yearsFarming") as string;
      const farmingMethod = formData.get("farmingMethod") as string;
      const crops = formData.get("crops") as string;

      if (!formFullName || !formPhone || !farmName || !villageVal || !stateVal || (!imageFile && !imagePreview)) {
        toast.error("Please fill all required fields, including farm name, location, and photo.");
        setLoading(false);
        return;
      }

      // Fast image URL resolution: use already uploaded URL from background upload
      let portraitUrl = uploadedUrlRef.current || "";
      if (!portraitUrl && uploadPromiseRef.current) {
        try {
          // If background upload is still finishing, wait with a 3.5s timeout
          const bgUrl = await Promise.race([
            uploadPromiseRef.current,
            new Promise<string>((resolve) => setTimeout(() => resolve(""), 3500)),
          ]);
          if (bgUrl) portraitUrl = bgUrl;
        } catch {}
      }

      // If still not ready, upload now
      if (!portraitUrl && imageFile) {
        try {
          portraitUrl = await uploadToCloudinary(imageFile, "prajnaa/farmers");
        } catch (uploadCatchErr) {
          console.warn("Image upload fallback to preview:", uploadCatchErr);
          portraitUrl = imagePreview || "";
        }
      }

      let success = false;
      let registeredProfile: any = null;

      // 1. Try server API with safe JSON response verification
      try {
        const res = await adminFetch("/api/admin/farmers/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: registrationMode === "link" ? selectedUserId : null,
            fullName: formFullName,
            farmName,
            phone: formPhone,
            email: formEmail,
            aadhaar,
            pan,
            kishanId,
            village: villageVal,
            district: districtVal,
            state: stateVal,
            pincode: pincodeVal,
            totalLandArea,
            landUnit,
            cultivatedArea,
            khasraNumbers,
            cultivatorType,
            yearsFarming,
            farmingMethod,
            crops,
            portraitUrl,
          }),
        });

        // Safety check: ensure response is JSON before parsing
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const resJson = await res.json();
          if (res.ok && resJson.success) {
            success = true;
            registeredProfile = resJson.farmer;
          } else if (resJson.error) {
            console.warn("[RegisterFarmer] Server API error, attempting direct client fallback:", resJson.error);
          }
        } else {
          console.warn("[RegisterFarmer] API returned non-JSON response, using direct client fallback");
        }
      } catch (apiErr) {
        console.warn("[RegisterFarmer] API network exception, using direct client fallback:", apiErr);
      }


      // 2. Direct client-side Supabase insertion fallback
      if (!success) {
        let targetUserId = registrationMode === "link" ? selectedUserId : null;

        // Check if a profile with this phone exists in database
        if (!targetUserId && formPhone) {
          try {
            const { data: foundProfiles } = await supabase
              .from("profiles")
              .select("id")
              .eq("phone", formPhone)
              .limit(1);
            if (foundProfiles && foundProfiles.length > 0) {
              targetUserId = foundProfiles[0].id;
            }
          } catch {}
        }

        const cleanFarm = farmName.trim();
        const baseSlug = slugify(cleanFarm);
        const slug = `${baseSlug || "farmer"}-${Math.random().toString(36).slice(2, 6)}`;
        const parsedCrops = crops
          ? crops.split(",").map((c: string) => c.trim()).filter(Boolean)
          : [];

        const profilePayload: any = {
          full_name: formFullName,
          farm_name: cleanFarm,
          slug,
          phone: formPhone,
          email: formEmail || null,
          status: "approved",
          village: villageVal,
          district: districtVal || null,
          state: stateVal,
          pincode: pincodeVal || null,
          pan_number: pan || null,
          aadhaar_last4: aadhaar || null,
          portrait_url: portraitUrl,
          kishan_pehchan_patra: kishanId || null,
          total_land_area: totalLandArea ? parseFloat(totalLandArea) : null,
          farm_size_acres: totalLandArea ? parseFloat(totalLandArea) : null,
          area_unit: landUnit || null,
          cultivated_area: cultivatedArea ? parseFloat(cultivatedArea) : null,
          khasra_numbers: khasraNumbers || null,
          cultivator_type: cultivatorType || null,
          years_farming: yearsFarming ? parseInt(yearsFarming, 10) : null,
          farming_method: farmingMethod || "natural",
          crops: parsedCrops,
          is_prajnaa_verified: false,
          is_verified: false,
          verified_certificate_id: null,
          verified_certificate_number: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (targetUserId) {
          profilePayload.user_id = targetUserId;
        }

        // Try insert directly
        let { error: insertError, data: insertedData } = await supabase
          .from("farmer_profiles")
          .insert(profilePayload)
          .select()
          .maybeSingle();

        // If insert failed due to user_id NOT NULL on database
        if (insertError && insertError.message?.toLowerCase().includes("user_id")) {
          const cleanPhone = formPhone.replace(/\D/g, "");
          const managedEmail = formEmail || `farmer_${cleanPhone || Date.now()}@prajnaafarm.internal`;
          const tempPass = `Farmer#${cleanPhone || Date.now()}Prajnaa`;

          try {
            const { data: signUpData } = await supabase.auth.signUp({
              email: managedEmail,
              password: tempPass,
              options: {
                data: {
                  full_name: formFullName,
                  phone: formPhone,
                  role: "farmer",
                },
              },
            });

            if (signUpData?.user?.id) {
              profilePayload.user_id = signUpData.user.id;
              const retryRes = await supabase
                .from("farmer_profiles")
                .insert(profilePayload)
                .select()
                .maybeSingle();
              insertError = retryRes.error;
              insertedData = retryRes.data;
            }
          } catch (signUpErr) {
            console.warn("Direct signUp fallback error:", signUpErr);
          }
        }

        if (insertError) {
          throw new Error(insertError.message || "Failed to register farmer.");
        }

        registeredProfile = insertedData || profilePayload;
        success = true;

        if (profilePayload.user_id) {
          try {
            await supabase
              .from("user_roles")
              .upsert({ user_id: profilePayload.user_id, role: "farmer" }, { onConflict: "user_id,role" });
          } catch {}
        }
      }

      toast.success(
        registrationMode === "new"
          ? "Offline farmer registered and approved successfully!"
          : "Farmer registered and linked successfully!"
      );

      // Close modal immediately so UI is instantly responsive
      onClose();

      // Invalidate relevant queries asynchronously without freezing UI
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["admin-farmers"] });
        qc.invalidateQueries({ queryKey: ["admin-farmer-counts"] });
        qc.invalidateQueries({ queryKey: ["admin-unlinked-profiles"] });
        qc.invalidateQueries({ queryKey: ["admin-all-farmers-showcase"] });
        qc.invalidateQueries({ queryKey: ["public-featured-farmers"] });
        qc.invalidateQueries({ queryKey: ["public-featured-farmers-top-component"] });
        qc.invalidateQueries({ queryKey: ["public-all-farmers"] });
        qc.invalidateQueries({ queryKey: ["admin-farmers-list"] });
        qc.invalidateQueries({ queryKey: ["farmers"] });
      }, 50);

    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative flex w-full max-w-4xl max-h-[90vh] flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Register New Farmer</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add offline partner farmers directly or link an existing registered user account.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form id="register-farmer-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Registration Mode Selector */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-subhead text-xs font-bold uppercase tracking-wider text-foreground">
                  Farmer Registration Method
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {registrationMode === "new"
                    ? "Admin direct onboarding (no user account required)"
                    : `${unlinkedProfiles.length} unlinked user(s) available`}
                </span>
              </div>

              {/* Segmented Mode Control */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationMode("new");
                    setSelectedUserId("");
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    registrationMode === "new"
                      ? "bg-[#1b3c29] text-white border-[#1b3c29] shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  <span>+ Direct Add (New / Offline Farmer)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegistrationMode("link")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    registrationMode === "link"
                      ? "bg-[#1b3c29] text-white border-[#1b3c29] shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Link2 className="h-4 w-4" />
                  <span>🔗 Link Existing Registered User</span>
                </button>
              </div>

              {registrationMode === "new" ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-900 dark:text-emerald-200">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    Offline Farmer Direct Onboarding Active
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                    Designed for rural / offline farmers who cannot sign up on the website. Simply fill in their personal and farm details below. The system creates their profile immediately so you can list them and assign crops or products.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {/* Search / Filter Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search registered users by name, phone, or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  {/* Dropdown Selection */}
                  {loadingProfiles ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading registered users...
                    </div>
                  ) : unlinkedProfiles.length === 0 ? (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">No unlinked user accounts found</p>
                        <p className="mt-0.5 text-muted-foreground">
                          Switch to <strong>&ldquo;Direct Add&rdquo;</strong> above to add this farmer directly without an existing online user account.
                        </p>
                      </div>
                    </div>
                  ) : filteredProfiles.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                      No unlinked users match &ldquo;{userSearch}&rdquo;. Try another name, phone, or email.
                    </div>
                  ) : (
                    <select
                      value={selectedUserId}
                      onChange={(e) => handleSelectUser(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-primary font-medium"
                    >
                      <option value="">-- Select an existing user account --</option>
                      {filteredProfiles.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name || "Unnamed User"} {p.phone ? `(${p.phone})` : ""} {p.email ? `• ${p.email}` : ""} [ID: {p.id.substring(0, 8)}]
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedUserId && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        Account linked: <strong>{unlinkedProfiles.find((u: any) => u.id === selectedUserId)?.full_name || "User"}</strong> (ID: {selectedUserId})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Personal Details */}
            <div>
              <h3 className="font-subhead text-sm font-semibold text-primary uppercase tracking-wider mb-4 border-b border-border pb-2">
                Personal Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Full Name *</label>
                  <input
                    name="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Phone *</label>
                  <input
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="9876543210"
                    className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Email (Optional)</label>
                  <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="farmer@example.com"
                    className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Aadhaar (Last 4 digits)</label>
                  <input name="aadhaar" maxLength={4} placeholder="e.g. 1234" className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">PAN Number</label>
                  <input name="pan" maxLength={10} placeholder="E.G. ABCDE1234F" className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary uppercase" />
                </div>
              </div>
            </div>

            {/* Profile Picture */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Farmer Profile Picture *</label>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border bg-secondary flex items-center justify-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-subhead inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold hover:bg-secondary transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </button>
              </div>
            </div>

            {/* Farm & Land Verification Details */}
            <div>
              <h3 className="font-subhead text-sm font-semibold text-primary uppercase tracking-wider mb-4 border-b border-border pb-2">
                Farm &amp; Land Identity Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Farm Name *</label>
                  <input name="farmName" required placeholder="e.g. Organic Sunshine Farm" className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Kishan Pehchan Patra / PM-KISAN ID</label>
                  <input name="kishanId" placeholder="e.g. MH/2023/12345" className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary uppercase" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Pincode</label>
                  <div className="relative">
                    <input
                      name="pincode"
                      value={pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      maxLength={6}
                      placeholder="e.g. 411001"
                      className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                    />
                    {pincodeLoading && (
                      <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {pincodeLocationText && (
                    <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
                      Auto-detected: {pincodeLocationText}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Village / Town *</label>
                  <input
                    name="village"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    required
                    placeholder="e.g. Khed"
                    className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">District</label>
                  <input
                    name="district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Pune"
                    className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">State *</label>
                  <input
                    name="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                    placeholder="e.g. Maharashtra"
                    className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Total Land Area</label>
                  <div className="flex gap-2">
                    <input name="totalLandArea" type="number" step="0.01" placeholder="e.g. 5.5" className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
                    <select name="landUnit" className="rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary">
                      <option value="acres">Acres</option>
                      <option value="bigha">Bigha</option>
                      <option value="hectares">Hectares</option>
                      <option value="guntha">Guntha</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Cultivated Land Area</label>
                  <input name="cultivatedArea" type="number" step="0.01" placeholder="e.g. 4.0" className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Khasra / Survey Number(s)</label>
                  <input name="khasraNumbers" placeholder="e.g. 142/1, 142/2" className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Cultivator Type</label>
                  <select name="cultivatorType" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary appearance-none">
                    <option value="owner">Owner / Self-Cultivated</option>
                    <option value="tenant">Tenant / Leaseholder</option>
                    <option value="sharecropper">Sharecropper</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Years Farming</label>
                  <input name="yearsFarming" type="number" placeholder="e.g. 15" className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Farming Method</label>
                  <select name="farmingMethod" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary appearance-none">
                    <option value="natural">Natural</option>
                    <option value="organic">Organic</option>
                    <option value="traditional">Traditional</option>
                    <option value="regenerative">Regenerative</option>
                  </select>
                </div>
                
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Crops Grown (Comma-Separated)</label>
                  <input name="crops" placeholder="turmeric, millet, mango, cashew" className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 bg-secondary/30">
          <button
            type="button"
            onClick={onClose}
            className="font-subhead rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            form="register-farmer-form"
            type="submit"
            disabled={loading}
            className="font-subhead inline-flex items-center gap-2 rounded-full bg-[#1b3c29] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#132a1d] transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {registrationMode === "new" ? "+ Register & Approve Farmer" : "Link & Register Farmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
