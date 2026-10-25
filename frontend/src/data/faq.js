// The single source of truth for help answers (v2.0). Used by the FAQ on the
// landing page now, and by the help chatbot in v2.1 — write each answer once.
// Every answer is plain, accurate to how the app really behaves, and available
// in English and Hindi (Hindi needs a native-speaker review).
// `keywords` help the chatbot match free-typed questions later.
// `action` is an optional shortcut button { label: {en, hi}, to }.
export const FAQ = [
  {
    id: "request-blood",
    q: { en: "How do I request blood?", hi: "मैं रक्त के लिए अनुरोध कैसे करूँ?" },
    a: {
      en: "Open New Request (or “SOS — Request Now” in an emergency). Choose the blood group, hospital, area and location, then submit. Matching donors nearby are notified straight away, and you can watch the progress on the request page.",
      hi: "“नया अनुरोध” खोलें (आपात स्थिति में “SOS — अभी अनुरोध करें”)। रक्त समूह, अस्पताल, इलाका और स्थान चुनकर भेज दें। पास के मिलते-जुलते दाताओं को तुरंत सूचना जाती है, और आप अनुरोध पेज पर प्रगति देख सकते हैं।",
    },
    keywords: ["request", "need blood", "ask for blood", "create request", "अनुरोध", "रक्त चाहिए", "how to request", "blood chahiye", "need a donor", "find donor", "ask donors", "new request", "urgent blood", "blood required", "खून चाहिए"],
    action: { label: { en: "New request", hi: "नया अनुरोध" }, to: "/requests/new" },
  },
  {
    id: "sos",
    q: { en: "What is SOS?", hi: "SOS क्या है?" },
    a: {
      en: "SOS is the fastest way to ask for blood. It fills in urgency and your current location for you, and shows one-tap buttons for 112 and 108, so you only add the essentials.",
      hi: "SOS रक्त मांगने का सबसे तेज़ तरीका है। यह जल्दी की श्रेणी और आपका मौजूदा स्थान अपने-आप भर देता है, और 112 व 108 के एक-टैप बटन दिखाता है, ताकि आपको बस ज़रूरी बातें भरनी हों।",
    },
    keywords: ["sos", "emergency", "urgent", "fast", "आपातकाल", "जल्दी", "panic", "ambulance", "112", "108", "critical", "तुरंत"],
    action: { label: { en: "SOS — request now", hi: "SOS — अभी अनुरोध" }, to: "/requests/new?sos=1" },
  },
  {
    id: "no-account",
    q: { en: "Can I ask for blood without an account?", hi: "क्या मैं बिना खाते के रक्त मांग सकता हूँ?" },
    a: {
      en: "Yes. Use “Emergency — Request Now” on the home page: just a name and phone number. If you want to keep your requests, save the account afterwards with an email and a password.",
      hi: "हाँ। होम पेज पर “आपातकाल — अभी अनुरोध करें” इस्तेमाल करें: बस नाम और फ़ोन नंबर चाहिए। अनुरोध सहेजना चाहें तो बाद में ईमेल और पासवर्ड से खाता सहेज लें।",
    },
    keywords: ["guest", "no account", "without login", "without signup", "बिना खाता", "अतिथि", "anonymous", "not registered", "dont have account", "without registering", "no login", "बिना लॉगिन", "बिना रजिस्टर"],
    action: { label: { en: "Emergency request", hi: "आपातकालीन अनुरोध" }, to: "/emergency" },
  },
  {
    id: "donate",
    q: { en: "How do I become a donor?", hi: "मैं दाता कैसे बनूँ?" },
    a: {
      en: "Sign up as a Donor, verify your email, create your donor profile (blood group and area) and switch “Available to donate” on. You'll then be matched to compatible requests nearby.",
      hi: "दाता के रूप में साइन अप करें, ईमेल सत्यापित करें, अपनी दाता प्रोफ़ाइल (रक्त समूह और इलाका) बनाएँ और “दान के लिए उपलब्ध” चालू करें। फिर आपको पास के उपयुक्त अनुरोधों से जोड़ा जाएगा।",
    },
    keywords: ["donor", "donate", "become donor", "register", "दाता", "रक्तदान", "i want to donate", "give blood", "sign up as donor", "donor signup", "rakt daan", "रक्त दान", "दान करना", "दाता बनना"],
    action: { label: { en: "Sign up", hi: "साइन अप" }, to: "/signup" },
  },
  {
    id: "gap",
    q: { en: "How long must I wait between donations?", hi: "दो दान के बीच कितना इंतज़ार करना होता है?" },
    a: {
      en: "For whole blood, men wait 90 days and women 120 days (120 if sex isn't stated). RaktSetu won't contact you until your waiting period is over. The blood bank always makes the final decision.",
      hi: "पूरे रक्त के लिए पुरुष 90 दिन और महिलाएँ 120 दिन इंतज़ार करती हैं (लिंग न बताया हो तो 120)। प्रतीक्षा अवधि पूरी होने तक रक्तसेतु आपसे संपर्क नहीं करेगा। अंतिम निर्णय हमेशा ब्लड बैंक का होता है।",
    },
    keywords: ["gap", "wait", "how often", "eligible", "days between", "कितने दिन", "अंतराल", "how many days", "how long", "waiting period", "next donation", "can i donate again", "donate again", "कब दान", "फिर से दान", "कितना इंतज़ार"],
  },
  {
    id: "phone-privacy",
    q: { en: "Is my phone number private?", hi: "क्या मेरा फ़ोन नंबर निजी है?" },
    a: {
      en: "Yes. It stays masked while people browse. It is shared only after you accept a request, and only with that requester. A verified hospital partner doing a genuine donor check can also see it.",
      hi: "हाँ। लोगों के ब्राउज़ करते समय यह छिपा रहता है। यह केवल तब साझा होता है जब आप कोई अनुरोध स्वीकार करते हैं, और सिर्फ़ उसी अनुरोधकर्ता के साथ। सच्चे दाता-सत्यापन के लिए सत्यापित अस्पताल साझेदार भी इसे देख सकता है।",
    },
    keywords: ["privacy", "phone", "number", "private", "hidden", "share", "निजी", "फ़ोन", "phone number", "my number", "contact details", "who can see", "see my number", "mobile number", "hidden number", "नंबर", "मोबाइल"],
    action: { label: { en: "Privacy Policy", hi: "गोपनीयता नीति" }, to: "/privacy" },
  },
  {
    id: "no-accept",
    q: { en: "What if nobody accepts my request?", hi: "अगर कोई मेरा अनुरोध स्वीकार न करे तो?" },
    a: {
      en: "We keep widening the search to more donors in rounds. Requests close after 72, 48 or 24 hours (Normal, Urgent, Critical) and we ask “Still need blood?” before that. Meanwhile, share the request on WhatsApp and call the hospital's blood bank.",
      hi: "हम चरणों में ज़्यादा दाताओं तक खोज बढ़ाते रहते हैं। अनुरोध 72, 48 या 24 घंटे (सामान्य, जल्दी, गंभीर) बाद बंद होते हैं, और उससे पहले हम पूछते हैं “क्या अब भी रक्त चाहिए?”। इस बीच अनुरोध को WhatsApp पर साझा करें और अस्पताल के ब्लड बैंक को फ़ोन करें।",
    },
    keywords: ["nobody", "no one", "no response", "not accepted", "waiting", "कोई नहीं", "जवाब नहीं", "no donors", "nobody accepted", "no one accepted", "no donor responded", "not getting donors", "still waiting", "no reply", "कोई दाता नहीं", "कोई स्वीकार"],
  },
  {
    id: "closed",
    q: { en: "Why was my request closed?", hi: "मेरा अनुरोध बंद क्यों हो गया?" },
    a: {
      en: "A request closes when it is fulfilled, when its time runs out, when you close it, or when donors report it as fake (then new requests from that account are paused for 48 hours and an admin can review it).",
      hi: "अनुरोध तब बंद होता है जब वह पूरा हो जाए, समय समाप्त हो जाए, आप उसे बंद करें, या दाता उसे नकली बताकर रिपोर्ट करें (तब उस खाते से नए अनुरोध 48 घंटे रुक जाते हैं और एडमिन उसे देख सकता है)।",
    },
    keywords: ["closed", "expired", "ended", "cancelled", "बंद", "समाप्त", "why closed", "request closed", "request expired", "auto closed", "request cancelled", "closed automatically", "अनुरोध बंद"],
  },
  {
    id: "plan-ahead",
    q: { en: "Can I ask for blood for a future date?", hi: "क्या मैं आने वाली तारीख़ के लिए रक्त मांग सकता हूँ?" },
    a: {
      en: "Yes. On New Request choose “Plan ahead” and pick a date between 24 hours and 30 days away. Donors are contacted about 3 days before. For regular transfusions you can also switch on “Repeat this request”.",
      hi: "हाँ। “नया अनुरोध” में “पहले से योजना” चुनें और 24 घंटे से 30 दिन के भीतर की तारीख़ चुनें। दाताओं से लगभग 3 दिन पहले संपर्क किया जाता है। नियमित ट्रांसफ़्यूज़न के लिए “इस अनुरोध को दोहराएँ” भी चालू कर सकते हैं।",
    },
    keywords: ["plan", "schedule", "future", "later", "repeat", "thalassemia", "dialysis", "सर्जरी", "दोहराएँ", "recurring", "regular transfusion", "scheduled", "future date", "later date", "in advance", "पहले से", "योजना"],
    action: { label: { en: "New request", hi: "नया अनुरोध" }, to: "/requests/new" },
  },
  {
    id: "hospital-verify",
    q: { en: "How does hospital verification work?", hi: "अस्पताल सत्यापन कैसे काम करता है?" },
    a: {
      en: "Hospital partners are approved by an admin. They confirm Critical requests before donors are contacted, and can verify donors so they get a Verified badge. Anyone can sign up as a hospital, but the tools unlock only after approval.",
      hi: "अस्पताल साझेदारों को एडमिन मंज़ूरी देता है। वे गंभीर अनुरोधों की पुष्टि करते हैं, उसके बाद ही दाताओं से संपर्क होता है, और दाताओं को सत्यापित कर “Verified” बैज दे सकते हैं। कोई भी अस्पताल के रूप में साइन अप कर सकता है, पर औज़ार मंज़ूरी के बाद ही खुलते हैं।",
    },
    keywords: ["hospital", "verify", "verified", "partner", "approval", "सत्यापन", "अस्पताल", "hospital verification", "hospital approval", "approved hospital", "verified hospital", "blood bank verify", "hospital account", "अस्पताल सत्यापन"],
  },
  {
    id: "trust-tiers",
    q: { en: "What are New, Trusted and Pillar?", hi: "New, Trusted और Pillar क्या हैं?" },
    a: {
      en: "They show how well a donor is known: hospital verification counts most, then completed donations (up to 3), then having a photo, an address and an alternate phone. It is a guide, not a medical test.",
      hi: "ये बताते हैं कि दाता कितना जाना-पहचाना है: सबसे ज़्यादा अहमियत अस्पताल सत्यापन की है, फिर पूरे किए गए दान (3 तक), फिर फ़ोटो, पता और वैकल्पिक फ़ोन। यह एक संकेत है, चिकित्सा जाँच नहीं।",
    },
    keywords: ["tier", "trusted", "pillar", "badge", "trust", "बैज", "भरोसा", "trust tier", "trust level", "trusted donor", "pillar donor", "new donor", "badges", "भरोसे का स्तर"],
  },
  {
    id: "family",
    q: { en: "How do I add a family member?", hi: "मैं परिवार का सदस्य कैसे जोड़ूँ?" },
    a: {
      en: "Open Profile and use Family members to add someone. You can then raise requests for them, give them their own donor profile, and they get their own card.",
      hi: "प्रोफ़ाइल खोलें और “परिवार के सदस्य” से किसी को जोड़ें। फिर उनके लिए अनुरोध कर सकते हैं, उन्हें अपनी दाता प्रोफ़ाइल दे सकते हैं, और उन्हें अपना कार्ड भी मिलता है।",
    },
    keywords: ["family", "member", "mother", "father", "child", "परिवार", "add family", "family member", "add mother", "add father", "add wife", "add relative", "relative", "dependent", "परिवार का सदस्य"],
    action: { label: { en: "Open profile", hi: "प्रोफ़ाइल खोलें" }, to: "/profile" },
  },
  {
    id: "card",
    q: { en: "What is my RaktSetu card?", hi: "मेरा रक्तसेतु कार्ड क्या है?" },
    a: {
      en: "A card with a QR code that shows your blood group and trust badge. Scanning it opens a page that shows only what you allow; your phone, email and address are never on it. You can hide the card or create a new ID any time.",
      hi: "QR कोड वाला कार्ड जो आपका रक्त समूह और भरोसे का बैज दिखाता है। इसे स्कैन करने पर वही दिखता है जो आप अनुमति दें; आपका फ़ोन, ईमेल और पता कभी नहीं दिखता। कार्ड छिपा सकते हैं या कभी भी नई आईडी बना सकते हैं।",
    },
    keywords: ["card", "qr", "id", "scan", "कार्ड", "क्यूआर", "raktsetu card", "donor card", "my card", "qr code", "id card", "scan card", "कार्ड बनाएँ"],
    action: { label: { en: "My Card", hi: "मेरा कार्ड" }, to: "/card" },
  },
  {
    id: "email-verify",
    q: { en: "Why do I need to verify my email?", hi: "मुझे ईमेल सत्यापित क्यों करना है?" },
    a: {
      en: "To become a donor, accept requests or use hospital tools. It stops fake accounts. Raising a blood request never needs it. Use “Resend email” in the banner at the top, and check your spam folder.",
      hi: "दाता बनने, अनुरोध स्वीकार करने या अस्पताल के औज़ार इस्तेमाल करने के लिए। इससे नकली खाते रुकते हैं। रक्त का अनुरोध करने के लिए यह कभी ज़रूरी नहीं। ऊपर के बैनर में “ईमेल दोबारा भेजें” दबाएँ, और स्पैम फ़ोल्डर भी देखें।",
    },
    keywords: ["verify", "email", "verification", "spam", "ईमेल", "सत्यापित", "verify email", "verification email", "verification link", "email not received", "didn't get email", "spam folder", "ईमेल नहीं आया"],
  },
  {
    id: "quiet-hours",
    q: { en: "Can I stop night-time calls?", hi: "क्या मैं रात के संदेश रोक सकता हूँ?" },
    a: {
      en: "Yes. In Profile choose Contact preferences: turn on Quiet hours (only Critical requests get through) or Emergencies only. You stay in the donor pool and can still answer requests in the app.",
      hi: "हाँ। प्रोफ़ाइल में “संपर्क की पसंद” चुनें: “शांत समय” चालू करें (केवल गंभीर अनुरोध पहुँचेंगे) या “केवल आपात”। आप दाता सूची में बने रहते हैं और ऐप में अनुरोधों का जवाब दे सकते हैं।",
    },
    keywords: ["night", "quiet", "notifications", "disturb", "stop", "रात", "शांत", "quiet hours", "night notifications", "do not disturb", "dont disturb", "notification time", "रात में सूचना"],
    action: { label: { en: "Open profile", hi: "प्रोफ़ाइल खोलें" }, to: "/profile" },
  },
  {
    id: "share",
    q: { en: "How do I share a request?", hi: "मैं अनुरोध कैसे साझा करूँ?" },
    a: {
      en: "Open the request and press Share. The link shows only blood group, units, urgency, hospital, area and status — no names or phone numbers.",
      hi: "अनुरोध खोलकर “साझा करें” दबाएँ। लिंक में केवल रक्त समूह, यूनिट, ज़रूरत की श्रेणी, अस्पताल, इलाका और स्थिति दिखती है — कोई नाम या फ़ोन नंबर नहीं।",
    },
    keywords: ["share", "whatsapp", "link", "forward", "साझा", "व्हाट्सऐप", "share request", "share link", "send on whatsapp", "forward request", "track link", "साझा करें", "लिंक भेजें"],
    action: { label: { en: "My requests", hi: "मेरे अनुरोध" }, to: "/requests" },
  },
  {
    id: "certificate",
    q: { en: "Can I get a donation acknowledgement?", hi: "क्या मुझे दान की पावती मिल सकती है?" },
    a: {
      en: "Yes. Once a donation is recorded, open Profile, find your donation history and choose “View acknowledgement”. It can be printed or saved as a PDF.",
      hi: "हाँ। दान दर्ज होने के बाद प्रोफ़ाइल खोलें, दान का इतिहास देखें और “पावती देखें” चुनें। इसे प्रिंट या PDF के रूप में सहेजा जा सकता है।",
    },
    keywords: ["certificate", "acknowledgement", "proof", "print", "प्रमाणपत्र", "पावती", "donation certificate", "download certificate", "acknowledgment", "donation proof", "receipt", "print certificate", "प्रमाणपत्र डाउनलोड"],
    action: { label: { en: "Open profile", hi: "प्रोफ़ाइल खोलें" }, to: "/profile" },
  },
  {
    id: "language",
    q: { en: "How do I change the language?", hi: "भाषा कैसे बदलूँ?" },
    a: {
      en: "Tap English | हिंदी at the top of the screen. On a phone, open the sun/moon icon (Appearance) and choose the language there.",
      hi: "स्क्रीन के ऊपर English | हिंदी दबाएँ। फ़ोन पर सूरज/चाँद वाले आइकन (दिखावट) में जाकर भाषा चुनें।",
    },
    keywords: ["language", "hindi", "english", "भाषा", "हिंदी", "change language", "switch language", "हिंदी में", "भाषा बदलें"],
  },
  {
    id: "logout",
    q: { en: "How do I log out?", hi: "मैं लॉग आउट कैसे करूँ?" },
    a: {
      en: "Open the menu (the ☰ button on a phone) and press Log out at the bottom. If you are using a guest session, save your account first — a guest who logs out can't get back in.",
      hi: "मेनू खोलें (फ़ोन पर ☰ बटन) और नीचे “लॉग आउट” दबाएँ। अगर आप अतिथि सत्र में हैं तो पहले खाता सहेज लें — लॉग आउट करने वाला अतिथि वापस नहीं आ सकता।",
    },
    keywords: ["logout", "log out", "sign out", "लॉग आउट", "signout", "leave account", "exit account", "how to logout", "लॉगआउट", "साइन आउट", "बाहर निकलें"],
  },
];

export const faqText = (entry, lang, field) => entry[field][lang] || entry[field].en;
