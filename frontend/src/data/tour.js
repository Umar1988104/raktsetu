// Quick tours (v2.1d). Each step: an icon name, and a title/body in English and
// Hindi. `welcome` = what each feature does (new people); `whatsnew` = what
// changed in this release (returning people). Bump TOUR_VERSION when a release
// should show "What's new" again.
export const TOUR_VERSION = "v2.1";

const step = (icon, en, hi) => ({ icon, title: { en: en[0], hi: hi[0] }, body: { en: en[1], hi: hi[1] } });

const INTRO = step(
  "Droplet",
  ["Welcome to RaktSetu", "RaktSetu connects people who need blood with donors nearby. Here is a quick look at what you can do. It takes less than a minute."],
  ["रक्तसेतु में आपका स्वागत है", "रक्तसेतु ज़रूरतमंदों को पास के रक्तदाताओं से जोड़ता है। एक मिनट से कम में देखें कि आप यहाँ क्या कर सकते हैं।"]
);
const HELP = step(
  "MessageCircle",
  ["Questions? Tap Help", "The Help button on every page answers common questions in English or Hindi, any time."],
  ["सवाल हैं? मदद दबाएँ", "हर पेज पर मौजूद मदद बटन आम सवालों के जवाब हिंदी या अंग्रेज़ी में, कभी भी देता है।"]
);

export const WELCOME = {
  donor: [
    INTRO,
    step("Bell", ["Say when you are available", "Switch on “Available to donate” and we alert you when someone nearby needs your blood group. You can accept or decline, and set quiet hours for the night."], ["बताएँ कि आप कब उपलब्ध हैं", "“दान के लिए उपलब्ध” चालू करें, और पास में आपके ब्लड ग्रुप की ज़रूरत होने पर हम आपको बताएँगे। आप स्वीकार या अस्वीकार कर सकते हैं, और रात के लिए शांत घंटे तय कर सकते हैं।"]),
    step("CreditCard", ["Your RaktSetu card", "Get a card with a QR code that anyone can scan to check you are a real donor. You decide what it shows."], ["आपका रक्तसेतु कार्ड", "QR कोड वाला कार्ड पाएँ जिसे कोई भी स्कैन करके जाँच सकता है कि आप असली रक्तदाता हैं। क्या दिखे, यह आप तय करते हैं।"]),
    step("Tent", ["Camps and blood stock", "RSVP to donation camps and get a reminder the day before. See what hospital blood banks hold on the Blood Stock page."], ["शिविर और रक्त भंडार", "रक्तदान शिविरों में आने की पुष्टि करें और एक दिन पहले रिमाइंडर पाएँ। रक्त भंडार पेज पर देखें कि अस्पतालों के ब्लड बैंक में क्या उपलब्ध है।"]),
    step("HeartHandshake", ["See your impact", "My Impact keeps your donation history and lets you make a picture to share. Badges and streaks are optional and stay off until you turn them on."], ["अपना प्रभाव देखें", "मेरा प्रभाव में आपका दान इतिहास रहता है और आप शेयर करने के लिए तस्वीर बना सकते हैं। बैज और स्ट्रीक वैकल्पिक हैं और आपके चालू करने तक बंद रहते हैं।"]),
    step("Users", ["Invite friends", "Share your invite link from your Profile. When a friend you invited donates, your trust score grows."], ["दोस्तों को बुलाएँ", "अपनी प्रोफ़ाइल से आमंत्रण लिंक साझा करें। जब आपका बुलाया दोस्त दान करता है, तो आपका भरोसा स्कोर बढ़ता है।"]),
    HELP,
  ],
  seeker: [
    INTRO,
    step("Siren", ["Ask for blood", "Tap New Request and choose the blood group, units and hospital. In an emergency, SOS is the fastest way to start an urgent request. Critical requests are confirmed with the hospital first."], ["रक्त माँगें", "नया अनुरोध दबाएँ और ब्लड ग्रुप, यूनिट और अस्पताल चुनें। आपातकाल में SOS तुरंत अनुरोध शुरू करने का सबसे तेज़ तरीका है। गंभीर अनुरोधों की पुष्टि पहले अस्पताल से की जाती है।"]),
    step("ClipboardCheck", ["Track every step", "My Requests shows who was notified and who accepted. You can share the status link, or make a poster for WhatsApp."], ["हर कदम देखें", "मेरे अनुरोध में दिखता है कि किसे सूचना गई और किसने स्वीकार किया। आप स्टेटस लिंक साझा कर सकते हैं या WhatsApp के लिए पोस्टर बना सकते हैं।"]),
    step("Users", ["Look around yourself", "Browse the Donor Network, Donation Camps and Blood Stock to see what is available near you."], ["खुद भी खोजें", "डोनर नेटवर्क, रक्तदान शिविर और रक्त भंडार देखें कि आपके पास क्या उपलब्ध है।"]),
    step("Bell", ["Stay updated", "Notifications tell you when a donor replies. Once a donor accepts, you can see how to contact them."], ["अपडेट रहें", "सूचनाएँ बताती हैं कि कब कोई दाता जवाब देता है। दाता के स्वीकार करने पर आप उनसे संपर्क का तरीका देख सकते हैं।"]),
    HELP,
  ],
  hospital: [
    INTRO,
    step("ShieldCheck", ["Confirm urgent requests", "When someone raises a Critical request for your hospital, you confirm it is real before donors are alerted."], ["गंभीर अनुरोधों की पुष्टि करें", "जब कोई आपके अस्पताल के लिए गंभीर अनुरोध करता है, तो दाताओं को सूचना जाने से पहले आप उसकी पुष्टि करते हैं।"]),
    step("Warehouse", ["Post your blood stock", "Once your hospital is approved, add how many units you hold on the Blood Stock page. It always shows how long ago you updated it."], ["अपना रक्त भंडार डालें", "अस्पताल के मंज़ूर होने पर रक्त भंडार पेज पर बताएँ कि आपके पास कितनी यूनिट हैं। यह हमेशा दिखाता है कि आपने कब अपडेट किया।"]),
    step("Tent", ["Host donation camps", "Post camps for donors to find. You see how many people said they will come, never who."], ["रक्तदान शिविर लगाएँ", "दाताओं के लिए शिविर डालें। आप देखते हैं कि कितने लोगों ने आने की पुष्टि की है, कौन हैं यह नहीं।"]),
    HELP,
  ],
};

const NEW_LOOK = step(
  "Sparkles",
  ["A fresh new look", "RaktSetu has a new glass design, with tabs shaped like blood vials. Dark mode and large text still work from the top bar."],
  ["एक नया रूप", "रक्तसेतु का नया ग्लास डिज़ाइन आ गया है, जिसमें टैब रक्त की शीशी जैसे हैं। डार्क मोड और बड़े अक्षर अब भी ऊपर की पट्टी से चलते हैं।"]
);
const NEW_HELP = step(
  "MessageCircle",
  ["New: Help chat", "Tap Help on any page and ask a question. You get a pre-written answer in English or Hindi. Your question stays on your device."],
  ["नया: मदद चैट", "किसी भी पेज पर मदद दबाएँ और सवाल पूछें। आपको हिंदी या अंग्रेज़ी में पहले से लिखा जवाब मिलेगा। आपका सवाल आपके डिवाइस पर ही रहता है।"]
);

export const WHATS_NEW = {
  donor: [
    NEW_LOOK,
    NEW_HELP,
    step("Users", ["Invite friends", "Share your invite link from your Profile. When a friend you invited donates, your trust score grows."], ["दोस्तों को बुलाएँ", "अपनी प्रोफ़ाइल से आमंत्रण लिंक साझा करें। जब आपका बुलाया दोस्त दान करता है, तो आपका भरोसा स्कोर बढ़ता है।"]),
    step("Tent", ["RSVP to camps, check blood stock", "Tap “I’ll come” on a donation camp to get a reminder the day before. The new Blood Stock page shows what hospital blood banks hold."], ["शिविर में आने की पुष्टि, रक्त भंडार", "रक्तदान शिविर पर “मैं आऊँगा” दबाएँ और एक दिन पहले रिमाइंडर पाएँ। नया रक्त भंडार पेज दिखाता है कि अस्पतालों के ब्लड बैंक में क्या है।"]),
    step("HeartHandshake", ["My Impact and optional badges", "See your donations in one place and make a picture to share. Badges and streaks are optional and off until you turn them on."], ["मेरा प्रभाव और वैकल्पिक बैज", "अपने दान एक जगह देखें और शेयर करने के लिए तस्वीर बनाएँ। बैज और स्ट्रीक वैकल्पिक हैं और आपके चालू करने तक बंद रहते हैं।"]),
  ],
  seeker: [
    NEW_LOOK,
    NEW_HELP,
    step("Image", ["Make a poster", "Open a request and tap Make a poster: a picture with a QR code for WhatsApp, with no phone number or patient name on it."], ["पोस्टर बनाएँ", "किसी अनुरोध को खोलकर पोस्टर बनाएँ दबाएँ: WhatsApp के लिए QR कोड वाली तस्वीर, जिस पर फ़ोन नंबर या मरीज़ का नाम नहीं होता।"]),
    step("Warehouse", ["Blood stock page", "See what hospital blood banks say they hold, with when it was last updated. Always call to confirm before you travel."], ["रक्त भंडार पेज", "देखें कि अस्पतालों के ब्लड बैंक के अनुसार उनके पास क्या है, और कब अपडेट हुआ। जाने से पहले हमेशा फ़ोन करके पुष्टि करें।"]),
  ],
  hospital: [
    NEW_LOOK,
    NEW_HELP,
    step("Warehouse", ["Blood stock board", "Post how many units you hold on the new Blood Stock page. It always shows how long ago you updated it."], ["रक्त भंडार बोर्ड", "नए रक्त भंडार पेज पर बताएँ कि आपके पास कितनी यूनिट हैं। यह हमेशा दिखाता है कि आपने कब अपडेट किया।"]),
    step("Tent", ["Camp RSVPs", "Donors can now say they will come to your camps and get a reminder. You see how many, never who."], ["शिविर में आने की पुष्टि", "दाता अब आपके शिविरों में आने की पुष्टि कर सकते हैं और रिमाइंडर पा सकते हैं। आप संख्या देखते हैं, नाम नहीं।"]),
  ],
};
