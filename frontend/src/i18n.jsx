import { createContext, useContext, useState, useEffect, useCallback } from "react";

// English text is the key. If a string has no Hindi entry, t() just returns
// the English original — so a partially translated screen still works fine.
const HI = {
  // Navigation / chrome
  "Dashboard": "डैशबोर्ड",
  "SOS — Request Now": "SOS — अभी रक्त मांगें",
  "New Request": "नया अनुरोध",
  "My Requests": "मेरे अनुरोध",
  "Donor Network": "रक्तदाता नेटवर्क",
  "Verify Requests": "अनुरोध सत्यापित करें",
  "Donation Camps": "रक्तदान शिविर",
  "Notifications": "सूचनाएँ",
  "Profile": "प्रोफ़ाइल",
  "Log out": "लॉग आउट",
  "Privacy Policy": "गोपनीयता नीति",
  "Log in": "लॉग इन",
  "Get started": "शुरू करें",
  "Sign up": "साइन अप",

  // Landing
  "Emergency — Request Now": "आपातकाल — अभी अनुरोध करें",
  "Connect nearby compatible donors with people who need blood right now — one trackable request instead of forty frantic phone calls.":
    "अभी रक्त की ज़रूरत वाले लोगों को पास के उपयुक्त रक्तदाताओं से जोड़ें — चालीस घबराहट भरे फ़ोन कॉल की जगह एक ट्रैक होने वाला अनुरोध।",
  "Need blood right now? Request without an account →": "अभी रक्त चाहिए? बिना खाते के अनुरोध करें →",
  "Registered donors": "पंजीकृत रक्तदाता",
  "Available right now": "अभी उपलब्ध",
  "Requests fulfilled": "पूरे हुए अनुरोध",
  "The problem": "समस्या",
  "Finding a donor in time shouldn't depend on luck.": "समय पर रक्तदाता मिलना किस्मत पर निर्भर नहीं होना चाहिए।",
  "How it works": "यह कैसे काम करता है",
  "From request to donor, in one flow.": "अनुरोध से रक्तदाता तक, एक ही प्रवाह में।",
  "Raise a request": "अनुरोध करें",
  "We rank real matches": "हम असली मिलान चुनते हैं",
  "Donors are notified": "रक्तदाताओं को सूचना मिलती है",
  "Tracked to fulfilment": "पूरा होने तक ट्रैकिंग",
  "Why RaktSetu": "रक्तसेतु ही क्यों",
  "Not another static directory.": "कोई और स्थिर डायरेक्टरी नहीं।",
  "Trust": "भरोसा",

  // Auth
  "Create your RaktSetu account": "अपना रक्तसेतु खाता बनाएँ",
  "Email": "ईमेल",
  "Password": "पासवर्ड",
  "Password (min 6 characters)": "पासवर्ड (कम से कम 6 अक्षर)",
  "Need an account?": "खाता नहीं है?",
  "Already have an account?": "पहले से खाता है?",
  "Logging in...": "लॉग इन हो रहा है...",
  "Creating account...": "खाता बन रहा है...",

  // Request forms
  "Emergency blood request": "आपातकालीन रक्त अनुरोध",
  "No account needed. Limited to one request per 24 hours from this network to prevent misuse.":
    "खाते की ज़रूरत नहीं। दुरुपयोग रोकने के लिए इस नेटवर्क से 24 घंटे में केवल एक अनुरोध।",
  "Your name": "आपका नाम",
  "Your phone": "आपका फ़ोन",
  "Blood group needed": "आवश्यक रक्त समूह",
  "Blood group required": "आवश्यक रक्त समूह",
  "Units needed": "आवश्यक यूनिट",
  "Units required": "आवश्यक यूनिट",
  "Urgency": "तात्कालिकता",
  "Urgency level": "तात्कालिकता स्तर",
  "Normal": "सामान्य",
  "Urgent": "ज़रूरी",
  "Critical": "गंभीर",
  "Hospital": "अस्पताल",
  "Area": "इलाका",
  "Location": "स्थान",
  "Use current location": "वर्तमान स्थान उपयोग करें",
  "Submit emergency request": "आपातकालीन अनुरोध भेजें",
  "Submit request": "अनुरोध भेजें",
  "Submitting...": "भेजा जा रहा है...",
  "Have an account?": "खाता है?",
  "instead for full features.": "ताकि सभी सुविधाएँ मिलें।",
  "Critical-urgency requests need hospital verification and aren't available in the quick guest flow —":
    "गंभीर श्रेणी के अनुरोधों के लिए अस्पताल सत्यापन चाहिए, इसलिए वे इस त्वरित अतिथि प्रक्रिया में उपलब्ध नहीं हैं —",
  "create a full account": "पूरा खाता बनाएँ",
  "if this is Critical.": "यदि यह गंभीर है।",
  "New request": "नया अनुरोध",
  "Fill in the details below — we'll find the best matching donors for you.":
    "नीचे विवरण भरें — हम आपके लिए सबसे उपयुक्त रक्तदाता खोजेंगे।",
  "SOS mode — urgency and your location are pre-filled. Just add the essentials and submit.":
    "SOS मोड — तात्कालिकता और आपका स्थान पहले से भरे हैं। बस ज़रूरी जानकारी जोड़कर भेजें।",
  "Who needs blood?": "रक्त किसे चाहिए?",
  "Myself": "मैं स्वयं",
  "Notes (optional)": "टिप्पणी (वैकल्पिक)",
  "Call for help now": "अभी मदद के लिए कॉल करें",
  "Call 112 (emergency)": "112 पर कॉल करें (आपातकाल)",
  "Call 108 (ambulance)": "108 पर कॉल करें (एम्बुलेंस)",

  // Dashboard
  "Welcome back,": "वापसी पर स्वागत है,",
  "Here's what's happening across RaktSetu right now.": "अभी रक्तसेतु पर क्या हो रहा है, यह देखें।",
  "Active requests": "सक्रिय अनुरोध",
  "Available donors": "उपलब्ध रक्तदाता",
  "Total donors": "कुल रक्तदाता",
  "Your fulfilled requests": "आपके पूरे हुए अनुरोध",
  "Total requests on RaktSetu": "रक्तसेतु पर कुल अनुरोध",
  "Donors available now": "अभी उपलब्ध रक्तदाता",
  "Total registered donors": "कुल पंजीकृत रक्तदाता",
  "Recent requests": "हाल के अनुरोध",
  "Blood group availability": "रक्त समूह उपलब्धता",

  // Dashboard (v1.4.1)
  "Quick actions": "त्वरित कार्य",
  "Live now": "अभी लाइव",
  "open requests": "खुले अनुरोध",
  "donors available now": "रक्तदाता अभी उपलब्ध",
  "View all": "सभी देखें",
  "Upcoming camps": "आने वाले शिविर",
  "All camps": "सभी शिविर",
  "What's new": "नया क्या है",
  "See all updates": "सभी अपडेट देखें",
  "Did you know?": "क्या आप जानते हैं?",
  "Waiting for your response": "आपके जवाब का इंतज़ार",
  "Your donor status": "आपकी रक्तदाता स्थिति",
  "Awaiting your verification": "आपके सत्यापन की प्रतीक्षा में",
  "Fastest way to ask for blood": "रक्त माँगने का सबसे तेज़ तरीका",
  "Add full details": "पूरा विवरण जोड़ें",
  "See who's nearby": "देखें आस-पास कौन है",
  "Upcoming drives": "आने वाले शिविर",
  "Requests matched to you": "आपसे मेल खाते अनुरोध",
  "Availability & eligibility": "उपलब्धता और पात्रता",
  "Find a drive to attend": "शामिल होने के लिए शिविर खोजें",
  "Latest improvements": "नवीनतम सुधार",
  "Release Critical requests": "गंभीर अनुरोध जारी करें",
  "Post and manage camps": "शिविर जोड़ें और संभालें",
  "Your partner details": "आपके साझेदार का विवरण",

  // Logout confirmation
  "Log out of RaktSetu?": "रक्तसेतु से लॉग आउट करें?",
  "You'll need to sign in again to see your dashboard.": "अपना डैशबोर्ड देखने के लिए आपको दोबारा साइन इन करना होगा।",
  "You're using a guest session. If you log out, you won't be able to get back to your requests.":
    "आप अतिथि सत्र का उपयोग कर रहे हैं। लॉग आउट करने पर आप अपने अनुरोधों तक वापस नहीं पहुँच पाएँगे।",
  "Stay signed in": "साइन इन रहें",
  "You've been logged out.": "आप लॉग आउट हो गए हैं।",
};

const LanguageContext = createContext({ lang: "en", setLang: () => {}, t: (s) => s });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem("raktsetu_lang") === "hi" ? "hi" : "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next);
    try {
      localStorage.setItem("raktsetu_lang", next);
    } catch {
      /* storage unavailable — preference just won't persist */
    }
  }, []);

  const t = useCallback((s) => (lang === "hi" && HI[s]) || s, [lang]);

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}
