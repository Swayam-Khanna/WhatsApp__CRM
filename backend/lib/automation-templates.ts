/**
 * PRAJNAA FARMER MARKET — AUTHORITATIVE AUTOMATED RESPONSE TEMPLATE LIBRARY
 * 
 * Contains 113+ intent-based automated response templates across 13 required categories:
 * 1. Greetings and welcome (>= 10)
 * 2. Thank you and acknowledgements (>= 10)
 * 3. Casual conversations (>= 8)
 * 4. General assistance and clarification (>= 8)
 * 5. Product catalogue enquiries (>= 10)
 * 6. Product details and pricing (>= 12)
 * 7. Packaging and availability (>= 8)
 * 8. Order placement and modification (>= 10)
 * 9. Order status and tracking (>= 8)
 * 10. Payment enquiries (>= 8)
 * 11. Shipping and delivery (>= 8)
 * 12. Complaints, returns and refunds (>= 8)
 * 13. Human handoff and unknown queries (>= 5)
 * 
 * NOTE: These templates are EXCLUSIVELY used by the automated messaging engine
 * and are KEPT SEPARATE from the CRM Inbox manual templates to prevent UI clutter.
 */

export type SupportedLanguage = "en" | "hinglish" | "hi";

export interface AutomatedTemplate {
  id: string;
  category:
    | "greetings_welcome"
    | "thank_you_acknowledgements"
    | "casual_conversations"
    | "general_assistance_clarification"
    | "product_catalogue_enquiries"
    | "product_details_pricing"
    | "packaging_availability"
    | "order_placement_modification"
    | "order_status_tracking"
    | "payment_enquiries"
    | "shipping_delivery"
    | "complaints_returns_refunds"
    | "human_handoff_unknown";
  name: string;
  intent: string;
  subIntent: string;
  en: string;
  hinglish: string;
  hi: string;
  variables: string[];
  shouldSend?: boolean;
}

export const AUTOMATED_TEMPLATES: AutomatedTemplate[] = [
  // ==========================================
  // CATEGORY 1: GREETINGS AND WELCOME (10 templates)
  // ==========================================
  {
    id: "auto_greet_general",
    category: "greetings_welcome",
    name: "General Polite Greeting",
    intent: "greetings",
    subIntent: "general",
    en: "Hello! Welcome to Prajnaa Farmer Market. How can we assist you with our pure Himalayan produce today?",
    hinglish: "Namaste ji! 🙏 Prajnaa Farmer Market mein aapka swagat hai. Aaj hum aapki kya sahayata kar sakte hain?",
    hi: "नमस्ते जी! 🙏 प्रज्ञा फार्मर मार्केट में आपका स्वागत है। आज हम आपकी क्या सहायता कर सकते हैं?",
    variables: [],
  },
  {
    id: "auto_greet_morning",
    category: "greetings_welcome",
    name: "Good Morning Greeting",
    intent: "greetings",
    subIntent: "morning",
    en: "Good morning! Wishing you a healthy day ahead. How may we help you explore our Himalayan harvests?",
    hinglish: "Shubh prabhat ji! ☀️ Aapka din shubh rahe. Prajnaa pure Himalayan harvests ke baare mein kya jaanna chahenge?",
    hi: "शुभ प्रभात जी! ☀️ आपका दिन मंगलमय हो। हमारे शुद्ध हिमालयी उत्पादों के बारे में आप क्या जानना चाहेंगे?",
    variables: [],
  },
  {
    id: "auto_greet_afternoon",
    category: "greetings_welcome",
    name: "Good Afternoon Greeting",
    intent: "greetings",
    subIntent: "afternoon",
    en: "Good afternoon! Welcome to Prajnaa Market. How can we help you today?",
    hinglish: "Namaste ji! Shubh dopahar. Prajnaa Market mein aapka swagat hai, batayein kya sahayata karein?",
    hi: "नमस्ते जी! शुभ दोपहर। प्रज्ञा मार्केट में आपका स्वागत है, बताएं आज हम क्या सहायता कर सकते हैं?",
    variables: [],
  },
  {
    id: "auto_greet_evening",
    category: "greetings_welcome",
    name: "Good Evening Greeting",
    intent: "greetings",
    subIntent: "evening",
    en: "Good evening! Welcome to Prajnaa Market. How can we assist you tonight?",
    hinglish: "Shubh sandhya ji! 🌄 Prajnaa Market mein swagat hai. Aaj hum aapki kya madad kar sakte hain?",
    hi: "शुभ संध्या जी! 🌄 प्रज्ञा मार्केट में आपका स्वागत है। बताएं हम आपकी क्या सेवा कर सकते हैं?",
    variables: [],
  },
  {
    id: "auto_greet_casual_hi",
    category: "greetings_welcome",
    name: "Casual Short Hi / Hello",
    intent: "greetings",
    subIntent: "casual_hi",
    en: "Hi there! How can we help you today?",
    hinglish: "Hello ji! 🙏 Batayein, aaj hum aapki kya madad kar sakte hain?",
    hi: "नमस्ते जी! बताएं, आज हम आपकी क्या सहायता कर सकते हैं?",
    variables: [],
  },
  {
    id: "auto_greet_returning",
    category: "greetings_welcome",
    name: "Returning Customer Welcome Back",
    intent: "greetings",
    subIntent: "returning_patron",
    en: "Welcome back to Prajnaa Market! Delighted to connect with you again. What can we arrange for you today?",
    hinglish: "Prajnaa Market par aapka dobara swagat hai ji! 🙏 Aapse judkar khushi hui. Aaj kounsa fresh harvest bhejein?",
    hi: "प्रज्ञा मार्केट में आपका पुनः स्वागत है जी! आपसे दोबारा जुड़कर बहुत खुशी हुई। आज आपके लिए क्या भिजवाएं?",
    variables: [],
  },
  {
    id: "auto_greet_first_time",
    category: "greetings_welcome",
    name: "First-Time Visitor Welcome",
    intent: "greetings",
    subIntent: "first_time",
    en: "Namaste! Welcome to Prajnaa. We bring 100% pure Himalayan produce straight from mountain farmers to your home: {catalogueLink}",
    hinglish: "Namaste ji! 🙏 Prajnaa Market mein swagat hai. Hum Himalayan kisaano se 100% shuddh natural produce direct aap tak pahunchate hain: {catalogueLink}",
    hi: "नमस्ते जी! 🙏 प्रज्ञा मार्केट में आपका स्वागत है। हम हिमालयी किसानों से 100% शुद्ध प्राकृतिक उत्पाद सीधे आपके घर तक पहुंचाते हैं: {catalogueLink}",
    variables: ["catalogueLink"],
  },
  {
    id: "auto_greet_namaste",
    category: "greetings_welcome",
    name: "Traditional Namaste Response",
    intent: "greetings",
    subIntent: "traditional_namaste",
    en: "Namaste! It is a pleasure to connect with you. How can we assist you with our natural products today?",
    hinglish: "Namaste ji! 🙏 Aapse connect karke khushi hui. Prajnaa ke shuddh utpaadon ke baare mein kya jaanna chahte hain?",
    hi: "नमस्ते जी! 🙏 आपसे जुड़कर अत्यंत प्रसन्नता हुई। हमारे प्राकृतिक उत्पादों के विषय में आज क्या जानकारी चाहिए?",
    variables: [],
  },
  {
    id: "auto_greet_weekend",
    category: "greetings_welcome",
    name: "Weekend Pleasant Greeting",
    intent: "greetings",
    subIntent: "weekend",
    en: "Hello! Hope you are enjoying a peaceful weekend. How can we assist you today?",
    hinglish: "Hello ji! Umeed hai aapka weekend shandar beet raha hoga. Batayein, aaj kya seva karein?",
    hi: "नमस्ते जी! आशा है आपका सप्ताहांत सुखद बीत रहा होगा। बताएं, आज हम आपकी क्या सहायता कर सकते हैं?",
    variables: [],
  },
  {
    id: "auto_greet_quick_checkin",
    category: "greetings_welcome",
    name: "Quick Helpful Check-in",
    intent: "greetings",
    subIntent: "quick_checkin",
    en: "Hello! We are here to help. Looking for any specific Himalayan product today?",
    hinglish: "Hello ji! Hum aapki help ke liye available hain. Aaj koi khaas Himalayan product dhoondh rahe hain?",
    hi: "नमस्ते जी! हम आपकी सहायता के लिए उपस्थित हैं। क्या आज किसी विशेष हिमालयी उत्पाद की तलाश में हैं?",
    variables: [],
  },

  // ==========================================
  // CATEGORY 2: THANK YOU AND ACKNOWLEDGEMENTS (10 templates)
  // ==========================================
  {
    id: "auto_thanks_welcome",
    category: "thank_you_acknowledgements",
    name: "You Are Most Welcome",
    intent: "thank_you",
    subIntent: "general_thanks",
    en: "You are most welcome! Always happy to help. Let us know if you need anything else.",
    hinglish: "Aapka swagat hai ji! Khushi hui madad karke. Koi aur zaroorat ho toh zaroor batayein. 🌿",
    hi: "आपका बहुत-बहुत स्वागत है जी! आपकी सहायता करके खुशी हुई। कोई और आवश्यकता हो तो अवश्य बताएं। 🌿",
    variables: [],
  },
  {
    id: "auto_thanks_happy_to_help",
    category: "thank_you_acknowledgements",
    name: "Happy To Help",
    intent: "thank_you",
    subIntent: "happy_to_help",
    en: "Always happy to help! Wishing you great health with our Himalayan harvests.",
    hinglish: "Hamari khushi hai ji! Prajnaa ke natural harvests ke saath aapka swasthya hamesha uttam rahe. 🌿",
    hi: "आपकी सहायता हमारे लिए सौभाग्य की बात है जी! हिमालयी उत्पादों के साथ आपका स्वास्थ्य उत्तम रहे।",
    variables: [],
  },
  {
    id: "auto_thanks_anytime",
    category: "thank_you_acknowledgements",
    name: "Anytime Support",
    intent: "thank_you",
    subIntent: "anytime",
    en: "Anytime! Feel free to message us whenever you need authentic mountain produce.",
    hinglish: "Kabhi bhi ji! Shuddh Himalayan produce ki zaroorat ho toh bina jhijhak message karein.",
    hi: "कभी भी जी! जब भी आपको शुद्ध पहाड़ी उत्पादों की आवश्यकता हो, निसंकोच संपर्क करें।",
    variables: [],
  },
  {
    id: "auto_thanks_farmer_support",
    category: "thank_you_acknowledgements",
    name: "Gratitude For Supporting Farmers",
    intent: "thank_you",
    subIntent: "support_farmers",
    en: "Thank you for supporting ethical mountain farming and local Himalayan communities! 🙏",
    hinglish: "Himalayan kisaano aur paramparik kheti ko support karne ke liye aapka dil se dhanyavaad ji! 🙏",
    hi: "हिमालयी किसानों और पारंपरिक खेती का समर्थन करने के लिए आपका हृदय से आभार जी! 🙏",
    variables: [],
  },
  {
    id: "auto_ack_sure",
    category: "thank_you_acknowledgements",
    name: "Acknowledgement Sure / Theek Hai",
    intent: "acknowledgements",
    subIntent: "sure",
    en: "Sure! Let us know whenever you are ready.",
    hinglish: "Bilkul ji! Jab bhi aap chahein, batayein.",
    hi: "बिल्कुल जी! जब भी आप चाहें, हमें बताएं।",
    variables: [],
  },
  {
    id: "auto_ack_ok_noted",
    category: "thank_you_acknowledgements",
    name: "Acknowledgement Noted / Theek Hai",
    intent: "acknowledgements",
    subIntent: "ok_noted",
    en: "Alright! Noted. Have a wonderful day ahead.",
    hinglish: "Theek hai ji, note kar liya. Aapka din shubh rahe! 🌿",
    hi: "ठीक है जी, नोट कर लिया गया है। आपका दिन मंगलमय हो! 🌿",
    variables: [],
  },
  {
    id: "auto_ack_got_it",
    category: "thank_you_acknowledgements",
    name: "Acknowledgement Got It / Samajh Gaye",
    intent: "acknowledgements",
    subIntent: "got_it",
    en: "Understood! We are right here if you need anything.",
    hinglish: "Samajh gaye ji! Koi bhi baat ho toh hum yahin available hain.",
    hi: "समझ गए जी! कोई भी आवश्यकता हो तो हम यहीं उपलब्ध हैं।",
    variables: [],
  },
  {
    id: "auto_thanks_info_provided",
    category: "thank_you_acknowledgements",
    name: "Thanks For Information Received",
    intent: "thank_you",
    subIntent: "info_received",
    en: "Glad the information was helpful! Reach out whenever you'd like to place an order.",
    hinglish: "Khushi hui ki jaankari kaam aayi! Jab bhi order book karna ho, bataiye ji.",
    hi: "प्रसन्नता हुई कि जानकारी उपयोगी रही! जब भी ऑर्डर बुक करना हो, कृपया बताएं।",
    variables: [],
  },
  {
    id: "auto_thanks_patron_appreciation",
    category: "thank_you_acknowledgements",
    name: "Patron Trust Appreciation",
    intent: "thank_you",
    subIntent: "patron_trust",
    en: "Thank you for placing your trust in Prajnaa Market. We value your patronage!",
    hinglish: "Prajnaa Market par apna bharosa jatane ke liye bahut shukriya ji! 🙏",
    hi: "प्रज्ञा मार्केट पर अपना विश्वास बनाए रखने के लिए बहुत-बहुत धन्यवाद जी! 🙏",
    variables: [],
  },
  {
    id: "auto_ack_at_your_service",
    category: "thank_you_acknowledgements",
    name: "Always At Your Service",
    intent: "thank_you",
    subIntent: "at_service",
    en: "Always at your service. Wishing you and your family good health!",
    hinglish: "Hamesha aapki seva mein hazir hain ji. Aapke parivar ke uttam swasthya ki kamna karte hain!",
    hi: "सदा आपकी सेवा में उपस्थित हैं जी। आपके और आपके परिवार के उत्तम स्वास्थ्य की कामना करते हैं!",
    variables: [],
  },

  // ==========================================
  // CATEGORY 3: CASUAL CONVERSATIONS (8 templates)
  // ==========================================
  {
    id: "auto_casual_how_are_you",
    category: "casual_conversations",
    name: "How Are You Response",
    intent: "casual_conversation",
    subIntent: "how_are_you",
    en: "We are doing very well, thank you! How are you doing today?",
    hinglish: "Hum bilkul theek hain ji, dhanyavaad! Aap bataiye, aap kaise hain?",
    hi: "हम बिल्कुल ठीक हैं जी, पूछने के लिए धन्यवाद! आप बताएं, आप कैसे हैं?",
    variables: [],
  },
  {
    id: "auto_casual_what_doing",
    category: "casual_conversations",
    name: "What Are You Doing Response",
    intent: "casual_conversation",
    subIntent: "what_doing",
    en: "We are packing fresh Himalayan produce and assisting our patrons. How can we help you today?",
    hinglish: "Himalayan fresh harvest ki packaging aur patrons ki madad mein lage hain ji. Batayein aapke liye kya kar sakte hain?",
    hi: "हिमालयी ताजे उत्पादों की पैकिंग और ग्राहकों की सहायता कर रहे हैं जी। बताएं आपके लिए क्या सेवा कर सकते हैं?",
    variables: [],
  },
  {
    id: "auto_casual_availability_check",
    category: "casual_conversations",
    name: "Are You Available Check",
    intent: "casual_conversation",
    subIntent: "availability_check",
    en: "Yes, we are live and active to help you right now! What would you like to know?",
    hinglish: "Ji haan, hum bilkul live aur available hain aapki help ke liye! Batayein kya jaanna chahte hain?",
    hi: "जी हाँ, हम आपकी सहायता के लिए बिल्कुल उपलब्ध हैं! बताएं क्या जानकारी चाहिए?",
    variables: [],
  },
  {
    id: "auto_casual_location",
    category: "casual_conversations",
    name: "Where Are You Located Response",
    intent: "casual_conversation",
    subIntent: "location",
    en: "We are based in Solan, Himachal Pradesh (173212). All our produce is harvested in high Himalayas and shipped directly from Solan.",
    hinglish: "Hum Solan, Himachal Pradesh (173212) mein based hain ji. Saara produce high Himalayas se harvest hokar Solan hub se dispatch hota hai.",
    hi: "हम सोलन, हिमाचल प्रदेश (173212) में स्थित हैं जी। सभी उत्पाद ऊंचे हिमालयी क्षेत्रों से एकत्र कर सोलन हब से सीधे भेजे जाते हैं।",
    variables: [],
  },
  {
    id: "auto_casual_everything_good",
    category: "casual_conversations",
    name: "Is Everything Good Response",
    intent: "casual_conversation",
    subIntent: "everything_good",
    en: "Everything is wonderful here! Hope all is great at your end too.",
    hinglish: "Ji sab badhiya hai yahan! Umeed hai aapke wahan bhi sab kushal mangal hoga.",
    hi: "जी यहाँ सब बहुत अच्छा है! आशा है आपके वहाँ भी सब कुशल-मंगल होगा।",
    variables: [],
  },
  {
    id: "auto_casual_compliment",
    category: "casual_conversations",
    name: "Compliment / Praise Response",
    intent: "casual_conversation",
    subIntent: "compliment",
    en: "Thank you for the kind words! We take great pride in delivering 100% pure Himalayan goodness.",
    hinglish: "Aapke pyare shabdon ke liye shukriya ji! 100% shuddh Himalayan produce deliver karna hi hamara sankalp hai. 🌿",
    hi: "आपकी प्रशंसा के लिए बहुत-बहुत धन्यवाद जी! 100% शुद्ध हिमालयी उत्पाद उपलब्ध कराना ही हमारा संकल्प है। 🌿",
    variables: [],
  },
  {
    id: "auto_casual_closing_bye",
    category: "casual_conversations",
    name: "Polite Closing / Bye",
    intent: "casual_conversation",
    subIntent: "closing_bye",
    en: "Goodbye! Take care and stay healthy. Feel free to message us whenever you need anything.",
    hinglish: "Alvida ji! Apna khayal rakhein aur swasth rahein. Jab bhi zaroorat ho, message karein. 🌿",
    hi: "अलविदा जी! अपना ध्यान रखें और स्वस्थ रहें। जब भी आवश्यकता हो, निसंकोच संपर्क करें। 🌿",
    variables: [],
  },
  {
    id: "auto_casual_weather",
    category: "casual_conversations",
    name: "Mountain Weather Casual Chat",
    intent: "casual_conversation",
    subIntent: "weather",
    en: "The mountain air is crisp and refreshing here in Solan! How is the weather at your place?",
    hinglish: "Solan ke pahadon mein hawa bahut taaza aur thandi hai ji! Aapke wahan mausam kaisa hai?",
    hi: "सोलन की पहाड़ियों में मौसम बहुत सुहावना और ताज़ा है जी! आपके वहाँ मौसम कैसा है?",
    variables: [],
  },

  // ==========================================
  // CATEGORY 4: GENERAL ASSISTANCE AND CLARIFICATION (8 templates)
  // ==========================================
  {
    id: "auto_assist_how_to_order",
    category: "general_assistance_clarification",
    name: "How To Order Guide",
    intent: "general_assistance",
    subIntent: "how_to_order",
    en: "Ordering is simple! Just tell us the product name and quantity here on WhatsApp, or browse our live catalogue: {catalogueLink}",
    hinglish: "Order karna bahut aasan hai ji! Bas product ka naam aur quantity yahan WhatsApp par bata dijiye, ya catalogue dekhein: {catalogueLink}",
    hi: "ऑर्डर करना बहुत आसान है जी! बस उत्पाद का नाम और मात्रा यहाँ व्हाट्सएप पर बताएं, या कैटलॉग देखें: {catalogueLink}",
    variables: ["catalogueLink"],
  },
  {
    id: "auto_assist_purity_guarantee",
    category: "general_assistance_clarification",
    name: "Purity and Lab Testing Guarantee",
    intent: "general_assistance",
    subIntent: "purity_guarantee",
    en: "Every Prajnaa product is 100% pure, unadulterated, and third-party lab-certified. We source directly from high-altitude farmers without middlemen.",
    hinglish: "Prajnaa ka har product 100% pure, bina milawat aur lab-tested hai. Hum high Himalayas ke farmers se direct harvest karte hain.",
    hi: "प्रज्ञा का प्रत्येक उत्पाद 100% शुद्ध, प्राकृतिक और लैब-प्रमाणित है। हम बिना किसी बिचौलिए के सीधे पहाड़ी किसानों से लाते हैं।",
    variables: [],
  },
  {
    id: "auto_assist_pan_india",
    category: "general_assistance_clarification",
    name: "Pan-India Delivery Assistance",
    intent: "general_assistance",
    subIntent: "pan_india",
    en: "Yes, we deliver pan-India via India Post Speed Post directly to your doorstep with protective artisan packaging.",
    hinglish: "Ji haan, hum poore Bharat mein India Post Speed Post dwara surakshit packaging ke saath doorstep delivery karte hain.",
    hi: "जी हाँ, हम पूरे भारत में इंडिया पोस्ट स्पीड पोस्ट के माध्यम से सुरक्षित पैकेजिंग के साथ होम डिलीवरी करते हैं।",
    variables: [],
  },
  {
    id: "auto_assist_clarify_explain",
    category: "general_assistance_clarification",
    name: "Clarification / Explanation Request",
    intent: "confusion_clarification",
    subIntent: "explain_simpler",
    en: "Allow me to clarify simply: We harvest natural Himalayan produce and deliver it straight to your address. What would you like to know more about?",
    hinglish: "Aasan shabdon mein samjha dete hain ji: Hum high Himalayas se 100% pure natural products direct aapke ghar tak deliver karte hain. Kis cheez ki jankari chahiye?",
    hi: "सरल शब्दों में स्पष्ट कर देते हैं जी: हम हिमालय से 100% शुद्ध प्राकृतिक उत्पाद सीधे आपके घर तक पहुंचाते हैं। आप किस विषय में जानना चाहते हैं?",
    variables: [],
  },
  {
    id: "auto_assist_payment_methods",
    category: "general_assistance_clarification",
    name: "Accepted Payment Methods",
    intent: "general_assistance",
    subIntent: "payment_methods",
    en: "We accept UPI (GPay, PhonePe, Paytm), Net Banking, and Debit/Credit Cards. You can easily pay to our official UPI: prajnaa@upi.",
    hinglish: "Hum UPI (GPay, PhonePe, Paytm), Net Banking aur Cards accept karte hain ji. Official UPI ID `prajnaa@upi` par aasan payment hoti hai.",
    hi: "हम UPI (GPay, PhonePe, Paytm), नेट बैंकिंग और कार्ड स्वीकार करते हैं जी। हमारे आधिकारिक UPI ID `prajnaa@upi` पर भुगतान कर सकते हैं।",
    variables: [],
  },
  {
    id: "auto_assist_followup_response",
    category: "general_assistance_clarification",
    name: "Follow-up Response / We Are Here",
    intent: "follow_up",
    subIntent: "here_to_help",
    en: "Yes, we are right here! How may we assist you with your query?",
    hinglish: "Ji haan, hum yahin hain! Batayein, aapko kis baare mein jankari chahiye?",
    hi: "जी हाँ, हम यहीं उपस्थित हैं! बताएं, आपकी किस प्रकार सहायता कर सकते हैं?",
    variables: [],
  },
  {
    id: "auto_assist_affirmative_followup",
    category: "general_assistance_clarification",
    name: "Positive Response Follow-up",
    intent: "positive_confirmation",
    subIntent: "affirmative_ready",
    en: "Wonderful! Please let us know your details or product choice so we can proceed.",
    hinglish: "Bahut badhiya ji! Apni requirement ya delivery details share kar dijiye, hum aage proceed karte hain.",
    hi: "बहुत बढ़िया जी! कृपया अपनी आवश्यकता या डिलीवरी विवरण साझा करें, हम प्रक्रिया आगे बढ़ाते हैं।",
    variables: [],
  },
  {
    id: "auto_assist_negative_respect",
    category: "general_assistance_clarification",
    name: "Negative Response Polite Respect",
    intent: "negative_declination",
    subIntent: "respect_decision",
    en: "No problem at all! We completely respect your choice. Feel free to connect whenever you need pure mountain produce.",
    hinglish: "Koi baat nahi ji! Hum aapki baat samajhte hain. Jab bhi zaroorat ho, batayein. Have a great day! 🌿",
    hi: "कोई बात नहीं जी! हम आपकी बात का पूरा सम्मान करते हैं। जब भी आवश्यकता हो, निसंकोच संपर्क करें। आपका दिन शुभ हो! 🌿",
    variables: [],
  },

  // ==========================================
  // CATEGORY 5: PRODUCT CATALOGUE ENQUIRIES (10 templates)
  // ==========================================
  {
    id: "auto_cat_general",
    category: "product_catalogue_enquiries",
    name: "General Catalogue Overview",
    intent: "catalogue_request",
    subIntent: "general_catalogue",
    en: "Here is our complete authentic Himalayan catalogue: {catalogueLink}\n\nKey Harvests:\n• Raw Multiflora Honey (₹550/500g)\n• Pure Shilajit Resin (₹1,450/20g)\n• A2 Badri Cow Desi Ghee (₹2,100/1L)\n• Mamra Almonds (₹1,250/500g)\n• Kagzi Walnuts (₹650/500g)\n• Kashmiri Saffron (₹380/1g)\n\nWhich harvest would you like to know more about?",
    hinglish: "Hamara poora authentic Himalayan catalogue yahan dekhein: {catalogueLink}\n\nTop Harvests:\n• Raw Multiflora Honey (₹550/500g)\n• Pure Shilajit Resin (₹1,450/20g)\n• A2 Badri Cow Desi Ghee (₹2,100/1L)\n• Mamra Almonds (₹1,250/500g)\n• Kagzi Walnuts (₹650/500g)\n• Kashmiri Kesar (₹380/1g)\n\nAapko kis product ke baare mein jaanna ya order karna hai?",
    hi: "हमारा संपूर्ण प्रामाणिक हिमालयी कैटलॉग यहाँ देखें: {catalogueLink}\n\nप्रमुख उत्पाद:\n• हिमालयन रॉ शहद (₹550/500g)\n• शुद्ध शिलाजीत रेजिन (₹1,450/20g)\n• A2 बद्री गाय का देसी घी (₹2,100/1L)\n• मामरा बादाम (₹1,250/500g)\n• कागज़ी अखरोट (₹650/500g)\n• कश्मीरी केसर (₹380/1g)\n\nआप किस उत्पाद के बारे में जानना या ऑर्डर करना चाहते हैं?",
    variables: ["catalogueLink"],
  },
  {
    id: "auto_cat_dryfruits",
    category: "product_catalogue_enquiries",
    name: "Dry Fruits & Nuts Catalogue",
    intent: "catalogue_request",
    subIntent: "dryfruits",
    en: "Our Himalayan Dry Fruits collection includes Kashmiri Mamra Almonds (₹1,250), High-Oil Kagzi Walnuts (₹650), and Ladakh Sun-Dried Apricots (₹999). Explore: {catalogueLink}",
    hinglish: "Hamari Himalayan Dry Fruits collection mein Kashmiri Mamra Badam (₹1,250), High-Oil Kagzi Akhrot (₹650) aur Ladakh Dried Apricots (₹999) uplabdh hain: {catalogueLink}",
    hi: "हमारे हिमालयी मेवों में कश्मीरी मामरा बादाम (₹1,250), अखरोट गिरी (₹650) और लद्दाख सूखी खुबानी (₹999) उपलब्ध हैं: {catalogueLink}",
    variables: ["catalogueLink"],
  },
  {
    id: "auto_cat_honey",
    category: "product_catalogue_enquiries",
    name: "Honey Collection Catalogue",
    intent: "catalogue_request",
    subIntent: "honey",
    en: "Our Himalayan Raw Multiflora Honey is 100% unprocessed, natural enzymes-rich, in 500g glass jars at ₹550. Details: {catalogueLink}",
    hinglish: "Hamara Himalayan Raw Honey 100% unprocessed, natural enzymes se bharpoor hai. 500g glass jar ₹550 mein uplabdh hai: {catalogueLink}",
    hi: "हमारा हिमालयन रॉ शहद 100% प्राकृतिक व एंजाइम-युक्त है। 500 ग्राम का कांच का जार ₹550 में उपलब्ध है: {catalogueLink}",
    variables: ["catalogueLink"],
  },
  {
    id: "auto_cat_ghee",
    category: "product_catalogue_enquiries",
    name: "A2 Badri Cow Ghee Catalogue",
    intent: "catalogue_request",
    subIntent: "ghee",
    en: "Our A2 Desi Ghee is prepared using the traditional wooden bilona churn method from grass-fed Himalayan Badri cows (1L at ₹2,100). Details: {catalogueLink}",
    hinglish: "Hamara A2 Desi Ghee pahadi Badri gaay ke doodh se paramparik bilona method dwara banaya jata hai (1L at ₹2,100): {catalogueLink}",
    hi: "हमारा A2 देसी घी पहाड़ी बद्री गाय के दूध से पारंपरिक बिलोना पद्धति द्वारा तैयार किया जाता है (1L ₹2,100 में): {catalogueLink}",
    variables: ["catalogueLink"],
  },
  {
    id: "auto_cat_shilajit",
    category: "product_catalogue_enquiries",
    name: "Shilajit Vitality Catalogue",
    intent: "catalogue_request",
    subIntent: "shilajit",
    en: "Our Pure Himalayan Shilajit Resin is harvested at 16,000+ feet, sun-purified, and third-party lab-certified (20g at ₹1,450). Details: {catalogueLink}",
    hinglish: "Hamara Pure Himalayan Shilajit 16,000+ feet ki unchayi se harvest aur lab-certified hai (20g at ₹1,450): {catalogueLink}",
    hi: "हमारा शुद्ध हिमालयन शिलाजीत 16,000+ फीट की ऊंचाई से एकत्र और लैब-प्रमाणित है (20g ₹1,450 में): {catalogueLink}",
    variables: ["catalogueLink"],
  },
  {
    id: "auto_cat_spices",
    category: "product_catalogue_enquiries",
    name: "Spices & Haldi Catalogue",
    intent: "catalogue_request",
    subIntent: "spices",
    en: "Explore our stone-ground mountain spices: Lakadong High-Curcumin Turmeric (₹240/250g) and House Garam Masala (₹320/200g). Catalogue: {catalogueLink}",
    hinglish: "Hamare pahadi stone-ground masale dekhein: Lakadong Turmeric (₹240/250g) aur House Garam Masala (₹320/200g): {catalogueLink}",
    hi: "हमारे पत्थर पर पिसे मसाले: लकाडोंग हल्दी (₹240/250g) और गरम मसाला (₹320/200g)। कैटलॉग देखें: {catalogueLink}",
    variables: ["catalogueLink"],
  },
  {
    id: "auto_cat_salts",
    category: "product_catalogue_enquiries",
    name: "Natural Salts Catalogue",
    intent: "catalogue_request",
    subIntent: "salts",
    en: "We offer natural Pink Himalayan Rock Salt (₹180/500g) and Kiln-Fired Kala Namak (₹160/500g). Pure mineral goodness: {catalogueLink}",
    hinglish: "Hamare paas Pink Himalayan Salt (₹180/500g) aur Black Salt (₹160/500g) uplabdh hain: {catalogueLink}",
    hi: "हमारे पास प्राकृतिक गुलाबी हिमालयन नमक (₹180/500g) और काला नमक (₹160/500g) उपलब्ध है: {catalogueLink}",
    variables: ["catalogueLink"],
  },
  {
    id: "auto_cat_pickles",
    category: "product_catalogue_enquiries",
    name: "Heirloom Pickles Catalogue",
    intent: "catalogue_request",
    subIntent: "pickles",
    en: "Traditional sun-aged pickles: Heirloom Mango Pickle (₹380/400g) and Salt-Cured Lemon Pickle (₹320/400g), made in wood-pressed mustard oil: {catalogueLink}",
    hinglish: "Dhoop mein pake paramparik achar: Heirloom Mango Pickle (₹380) aur Lemon Pickle (₹320): {catalogueLink}",
    hi: "पारंपरिक धूप में पके अचार: आम का अचार (₹380) और नींबू का अचार (₹320): {catalogueLink}",
    variables: ["catalogueLink"],
  },
  {
    id: "auto_cat_seeds",
    category: "product_catalogue_enquiries",
    name: "Seeds & Superfoods Catalogue",
    intent: "catalogue_request",
    subIntent: "seeds",
    en: "Nutrient-rich mountain seeds: Five-Seed Mix (₹280/500g) and Organic Black Chia Seeds (₹220/250g). Full catalogue: {catalogueLink}",
    hinglish: "Superfood seeds: Five-Seed Mix (₹280/500g) aur Chia Seeds (₹220/250g): {catalogueLink}",
    hi: "पौष्टिक बीज: फाइव-सीड मिक्स (₹280/500g) और चिया सीड्स (₹220/250g)। कैटलॉग: {catalogueLink}",
    variables: ["catalogueLink"],
  },
  {
    id: "auto_cat_seasonal",
    category: "product_catalogue_enquiries",
    name: "Seasonal Fresh Harvests",
    intent: "catalogue_request",
    subIntent: "seasonal",
    en: "Our fresh seasonal harvests are hand-packed at Solan Mountain Hub. Browse all live available options: {catalogueLink}",
    hinglish: "Hamare taaza seasonal harvests Solan Mountain Hub par pack hote hain. Yahan dekhein: {catalogueLink}",
    hi: "हमारे ताज़े मौसमी उत्पाद सोलन हब पर पैक किए जाते हैं। सभी विकल्प यहाँ देखें: {catalogueLink}",
    variables: ["catalogueLink"],
  },

  // ==========================================
  // CATEGORY 6: PRODUCT DETAILS AND PRICING (12 templates)
  // ==========================================
  {
    id: "auto_price_honey",
    category: "product_details_pricing",
    name: "Honey Price & Details",
    intent: "price_enquiry",
    subIntent: "honey",
    en: "Our Himalayan Raw Multiflora Honey (500g Glass Jar) is available for ₹550. 100% raw, unheated, enzyme-rich: {productLink}",
    hinglish: "Ji, Himalayan Raw Honey (500g Glass Jar) ki price ₹550 hai. 100% pure raw aur unheated: {productLink}",
    hi: "जी, हिमालयन रॉ शहद (500 ग्राम कांच का जार) की कीमत ₹550 है। 100% शुद्ध और प्राकृतिक: {productLink}",
    variables: ["productLink"],
  },
  {
    id: "auto_price_shilajit",
    category: "product_details_pricing",
    name: "Shilajit Price & Details",
    intent: "price_enquiry",
    subIntent: "shilajit",
    en: "Our Pure Himalayan Shilajit Resin (20g Jar with measuring spoon) is ₹1,450. Lab certified with 75%+ fulvic acid: {productLink}",
    hinglish: "Shilajit Resin (20g pack) ki price ₹1,450 hai ji. Lab certified aur 75%+ fulvic acid se bharpoor: {productLink}",
    hi: "शुद्ध हिमालयन शिलाजीत रेजिन (20g) की कीमत ₹1,450 है। 75%+ फुल्विक एसिड व लैब-प्रमाणित: {productLink}",
    variables: ["productLink"],
  },
  {
    id: "auto_price_ghee",
    category: "product_details_pricing",
    name: "Badri Ghee Price & Details",
    intent: "price_enquiry",
    subIntent: "ghee",
    en: "Our A2 Badri Cow Bilona Desi Ghee (1 Litre Glass Jar) is ₹2,100. Made with traditional bilona method: {productLink}",
    hinglish: "A2 Badri Cow Bilona Desi Ghee (1L Glass Jar) ₹2,100 mein available hai ji: {productLink}",
    hi: "A2 बद्री गाय का बिलोना देसी घी (1 लीटर जार) ₹2,100 में उपलब्ध है जी: {productLink}",
    variables: ["productLink"],
  },
  {
    id: "auto_price_almonds",
    category: "product_details_pricing",
    name: "Mamra Almonds Price & Details",
    intent: "price_enquiry",
    subIntent: "almonds",
    en: "Our premium Kashmiri Mamra Almonds (500g pack) are available for ₹1,250. High natural oil content: {productLink}",
    hinglish: "Kashmiri Mamra Badam (500g pack) ki price ₹1,250 hai ji. High oil content aur 100% natural: {productLink}",
    hi: "कश्मीरी मामरा बादाम (500g पैक) की कीमत ₹1,250 है जी। उच्च तेल और पौष्टिकता से भरपूर: {productLink}",
    variables: ["productLink"],
  },
  {
    id: "auto_price_walnuts",
    category: "product_details_pricing",
    name: "Kagzi Walnuts Price & Details",
    intent: "price_enquiry",
    subIntent: "walnuts",
    en: "Our Kashmiri High-Oil Kagzi Walnuts (500g pack) are available for ₹650. Freshly cracked kernels: {productLink}",
    hinglish: "Kashmiri Kagzi Akhrot Giri (500g pack) ₹650 mein available hai ji. Fresh aur high-oil kernels: {productLink}",
    hi: "कश्मीरी कागज़ी अखरोट गिरी (500g) ₹650 में उपलब्ध है जी। ताज़ा और तेल से भरपूर: {productLink}",
    variables: ["productLink"],
  },
  {
    id: "auto_price_saffron",
    category: "product_details_pricing",
    name: "Kashmiri Saffron Price & Details",
    intent: "price_enquiry",
    subIntent: "saffron",
    en: "Our Pure Kashmiri Mongra Saffron (1g airtight glass vial) is ₹380. Grade-A certified aroma and color: {productLink}",
    hinglish: "Pure Kashmiri Mongra Kesar (1g glass vial) ki price ₹380 hai ji. Grade-A certified shuddh kesar: {productLink}",
    hi: "शुद्ध कश्मीरी मोंगरा केसर (1g कांच की शीशी) की कीमत ₹380 है जी। ग्रेड-ए प्रमाणित शुद्धता: {productLink}",
    variables: ["productLink"],
  },
  {
    id: "auto_price_turmeric",
    category: "product_details_pricing",
    name: "Turmeric Price & Details",
    intent: "price_enquiry",
    subIntent: "turmeric",
    en: "Our Stone-Ground Lakadong Turmeric (250g pack) is ₹240. Exceptionally high 7%+ natural curcumin: {productLink}",
    hinglish: "Stone-Ground Lakadong Turmeric (250g) ₹240 mein available hai. 7%+ high curcumin content: {productLink}",
    hi: "पत्थर पर पिसी लकाडोंग हल्दी (250g) ₹240 में उपलब्ध है। 7%+ प्राकृतिक करक्यूमिन: {productLink}",
    variables: ["productLink"],
  },
  {
    id: "auto_price_salt",
    category: "product_details_pricing",
    name: "Pink Salt Price & Details",
    intent: "price_enquiry",
    subIntent: "salt",
    en: "Our Mineral-Rich Pink Himalayan Rock Salt (500g pack) is ₹180: {productLink}",
    hinglish: "Mineral-rich Pink Himalayan Rock Salt (500g) ki price ₹180 hai ji: {productLink}",
    hi: "प्राकृतिक गुलाबी हिमालयन सेंधा नमक (500g) की कीमत ₹180 है जी: {productLink}",
    variables: ["productLink"],
  },
  {
    id: "auto_price_pickles",
    category: "product_details_pricing",
    name: "Pickle Price & Details",
    intent: "price_enquiry",
    subIntent: "pickle",
    en: "Our Heirloom Mango Pickle (400g Glass Jar) is ₹380, and Salt-Cured Lemon Pickle is ₹320: {productLink}",
    hinglish: "Heirloom Mango Pickle (400g) ₹380 aur Salt-Cured Lemon Pickle ₹320 mein available hai: {productLink}",
    hi: "आम का पारंपरिक अचार (400g) ₹380 और नींबू का अचार ₹320 में उपलब्ध है: {productLink}",
    variables: ["productLink"],
  },
  {
    id: "auto_price_contextual",
    category: "product_details_pricing",
    name: "Contextual Product Price",
    intent: "price_enquiry",
    subIntent: "contextual_price",
    en: "Our {productName} ({packaging}) is available for ₹{livePrice}. View details: {productLink}",
    hinglish: "Ji, {productName} ({packaging}) ki price ₹{livePrice} hai. Details: {productLink}",
    hi: "जी, {productName} ({packaging}) की कीमत ₹{livePrice} है। विवरण: {productLink}",
    variables: ["productName", "packaging", "livePrice", "productLink"],
  },
  {
    id: "auto_price_multi_variant",
    category: "product_details_pricing",
    name: "Multiple Sizes Pricing Overview",
    intent: "price_enquiry",
    subIntent: "multi_variant",
    en: "{productName} is available in multiple pack sizes starting from ₹{livePrice}. Details: {productLink}",
    hinglish: "{productName} alag-alag pack sizes mein ₹{livePrice} se shuru hai ji. Details yahan dekhein: {productLink}",
    hi: "{productName} विभिन्न साइज़ में ₹{livePrice} से उपलब्ध है जी। विवरण: {productLink}",
    variables: ["productName", "livePrice", "productLink"],
  },
  {
    id: "auto_price_bulk_discount",
    category: "product_details_pricing",
    name: "Bulk / Wholesale Pricing Inquiry",
    intent: "price_enquiry",
    subIntent: "bulk_pricing",
    en: "For wholesale or bulk orders (5kg+), we offer direct commercial rates. Please share your required quantity so we can provide a customized quote.",
    hinglish: "Bulk ya wholesale (5kg+) ke liye hum direct special rates dete hain ji. Apni quantity bataiye, hum quote bhejte hain.",
    hi: "थोक या बल्क ऑर्डर (5kg+) के लिए हम विशेष रियायती दरें प्रदान करते हैं जी। कृपया अपनी मात्रा बताएं।",
    variables: [],
  },

  // ==========================================
  // CATEGORY 7: PACKAGING AND AVAILABILITY (8 templates)
  // ==========================================
  {
    id: "auto_pack_in_stock",
    category: "packaging_availability",
    name: "Product In Stock Confirmation",
    intent: "packaging_availability",
    subIntent: "in_stock",
    en: "Yes, {productName} is currently fresh in stock and ready to be dispatched from our Solan Hub!",
    hinglish: "Ji haan, {productName} bilkul fresh stock mein available hai aur Solan se dispatch ke liye ready hai!",
    hi: "जी हाँ, {productName} वर्तमान में ताज़ा स्टॉक में उपलब्ध है और सोलन हब से भेजे जाने के लिए तैयार है!",
    variables: ["productName"],
  },
  {
    id: "auto_pack_out_of_stock",
    category: "packaging_availability",
    name: "Product Out of Stock Notice",
    intent: "packaging_availability",
    subIntent: "out_of_stock",
    en: "Currently {productName} is out of stock as fresh batches are being harvested in the mountains. We will notify you once ready!",
    hinglish: "Ji, {productName} abhi stock mein nahi hai kyunki pahadon se fresh batch harvest ho raha hai. Stock aate hi batate hain!",
    hi: "वर्तमान में {productName} उपलब्ध नहीं है क्योंकि पहाड़ों से ताज़ा बैच तैयार किया जा रहा है। स्टॉक आते ही सूचित करेंगे!",
    variables: ["productName"],
  },
  {
    id: "auto_pack_glass_jar",
    category: "packaging_availability",
    name: "Glass Jar Protective Packaging",
    intent: "packaging_availability",
    subIntent: "glass_packaging",
    en: "We package our Honey, Ghee, and Shilajit strictly in food-grade glass jars with multi-layered shock-proof eco cushioning for safe transit.",
    hinglish: "Hum Honey, Ghee aur Shilajit ko food-grade glass jars mein shock-proof eco packing ke saath deliver karte hain.",
    hi: "हम शहद, घी और शिलाजीत को सुरक्षित कांच के जार में मजबूत सुरक्षात्मक पैकिंग के साथ भेजते हैं।",
    variables: [],
  },
  {
    id: "auto_pack_shelf_life",
    category: "packaging_availability",
    name: "Shelf Life & Storage Instructions",
    intent: "packaging_availability",
    subIntent: "shelf_life",
    en: "Our raw mountain products have a natural long shelf life. Keep in a cool, dry place away from direct sunlight. Raw honey never truly expires!",
    hinglish: "Hamare pahadi products ki shelf life natural lambi hoti hai. Direct dhoop se door thandi jagah rakhein. Raw honey kabhi kharab nahi hota!",
    hi: "हमारे प्राकृतिक उत्पादों की शेल्फ लाइफ बहुत लंबी होती है। इसे धूप से दूर ठंडे स्थान पर रखें। शुद्ध शहद कभी खराब नहीं होता!",
    variables: [],
  },
  {
    id: "auto_pack_available_sizes",
    category: "packaging_availability",
    name: "Available Sizes Overview",
    intent: "packaging_availability",
    subIntent: "available_sizes",
    en: "Available pack sizes for {productName} are: {packaging}. Which size would you prefer?",
    hinglish: "{productName} in pack sizes mein uplabdh hai: {packaging}. Aapko kounsa size chahiye ji?",
    hi: "{productName} इन साइज़ में उपलब्ध है: {packaging}। आप कौन सा साइज़ लेना चाहेंगे?",
    variables: ["productName", "packaging"],
  },
  {
    id: "auto_pack_preorder",
    category: "packaging_availability",
    name: "Pre-Order Window Active",
    intent: "packaging_availability",
    subIntent: "pre_order",
    en: "The pre-order window for {productName} is currently open! Book now to reserve fresh harvest before stock runs out.",
    hinglish: "{productName} ki pre-order booking live hai ji! Fresh harvest reserve karne ke liye abhi book karein.",
    hi: "{productName} की प्री-ऑर्डर बुकिंग खुली है जी! ताज़ा बैच आरक्षित करने के लिए अभी बुक करें।",
    variables: ["productName"],
  },
  {
    id: "auto_pack_zero_preservatives",
    category: "packaging_availability",
    name: "Zero Preservatives / Natural Packaging",
    intent: "packaging_availability",
    subIntent: "zero_preservatives",
    en: "We use zero chemical preservatives or artificial colors. All items are packed fresh upon harvesting.",
    hinglish: "Hamare products mein zero preservatives aur koi chemical nahi hota. Fresh pack karke bheja jata hai ji.",
    hi: "हमारे उत्पादों में कोई रासायनिक संरक्षक (प्रिजर्वेटिव) नहीं होता। ताज़ा पैक करके भेजा जाता है।",
    variables: [],
  },
  {
    id: "auto_pack_eco_friendly",
    category: "packaging_availability",
    name: "Eco-Friendly Mountain Packaging",
    intent: "packaging_availability",
    subIntent: "eco_friendly",
    en: "We use 100% recyclable, plastic-free outer packaging to preserve nature and our Himalayan biosphere.",
    hinglish: "Hum plastic-free aur eco-friendly packaging use karte hain taki Himalayas ki prakriti surakshit rahe.",
    hi: "हम पर्यावरण के अनुकूल और प्लास्टिक-मुक्त पैकेजिंग का उपयोग करते हैं।",
    variables: [],
  },

  // ==========================================
  // CATEGORY 8: ORDER PLACEMENT AND MODIFICATION (10 templates)
  // ==========================================
  {
    id: "auto_order_ask_items",
    category: "order_placement_modification",
    name: "Start Order - Ask Product & Quantity",
    intent: "order_placement",
    subIntent: "ask_items",
    en: "Certainly! Which product and how many packs would you like to order?",
    hinglish: "Bilkul ji! Aapko kounsa product aur kitne pack order karne hain, bataiye?",
    hi: "बिल्कुल जी! आपको कौन सा उत्पाद और कितनी मात्रा में ऑर्डर करना है, बताएं?",
    variables: [],
  },
  {
    id: "auto_order_ask_address",
    category: "order_placement_modification",
    name: "Ask Delivery Name & Address",
    intent: "order_placement",
    subIntent: "ask_address",
    en: "Great! To book your order of {productName}, please share your Name, Complete Delivery Address, and Pincode.",
    hinglish: "Bahut badhiya ji! {productName} ka order confirm karne ke liye apna Naam, Pura Address aur Pincode share kar dijiye.",
    hi: "बहुत बढ़िया जी! {productName} का ऑर्डर पक्का करने के लिए कृपया अपना नाम, पूरा पता और पिनकोड भेजें।",
    variables: ["productName"],
  },
  {
    id: "auto_order_contextual_confirm",
    category: "order_placement_modification",
    name: "Contextual Order Confirmation Prompt",
    intent: "order_placement",
    subIntent: "contextual_confirm",
    en: "Certainly! {quantity} pack(s) of {productName}. Would you like to proceed with this order?",
    hinglish: "Bilkul ji! {productName} ke {quantity} pack. Kya hum aapka order book karein?",
    hi: "बिल्कुल जी! {productName} के {quantity} पैक। क्या हम आपका ऑर्डर बुक करें?",
    variables: ["productName", "quantity"],
  },
  {
    id: "auto_order_address_received",
    category: "order_placement_modification",
    name: "Address Received - Proceed To Pay",
    intent: "order_placement",
    subIntent: "address_received",
    en: "Thank you! Your delivery address has been received. Please pay via our official UPI ID `prajnaa@upi` and share the confirmation screenshot.",
    hinglish: "Dhanyavaad ji! Delivery address mil gaya hai. Kripya official UPI `prajnaa@upi` par payment karke screenshot share kar dein.",
    hi: "धन्यवाद जी! डिलीवरी का पता प्राप्त हो गया है। कृपया आधिकारिक UPI `prajnaa@upi` पर भुगतान कर स्क्रीनशॉट साझा करें।",
    variables: [],
  },
  {
    id: "auto_order_modify_items",
    category: "order_placement_modification",
    name: "Modify Order Items Request",
    intent: "order_placement",
    subIntent: "modify_items",
    en: "Sure! What modifications or additional products would you like to make to your order?",
    hinglish: "Ji bilkul! Order mein kya change karna chahte hain ya kounsa naya item add karna hai, batayein.",
    hi: "जी बिल्कुल! ऑर्डर में क्या बदलाव करना चाहते हैं या कौन सा नया उत्पाद जोड़ना है, बताएं।",
    variables: [],
  },
  {
    id: "auto_order_change_address",
    category: "order_placement_modification",
    name: "Change Delivery Address Request",
    intent: "order_placement",
    subIntent: "change_address",
    en: "Please share the new complete delivery address with pincode before dispatch so we can update it immediately.",
    hinglish: "Dispatch hone se pehle naya pura address pincode ke sath share kar dein, hum turant update kar dete hain ji.",
    hi: "डिस्पैच होने से पहले कृपया नया पूरा पता पिनकोड सहित साझा करें, हम तुरंत अपडेट कर देंगे जी।",
    variables: [],
  },
  {
    id: "auto_order_cancel_request",
    category: "order_placement_modification",
    name: "Cancel Order Request",
    intent: "order_placement",
    subIntent: "cancel_order",
    en: "Please share your order number. If the parcel has not yet been dispatched, we can cancel it for you immediately.",
    hinglish: "Apna order number share karein ji. Agar parcel abhi dispatch nahi hua hai toh hum turant cancel kar denge.",
    hi: "कृपया अपना ऑर्डर नंबर बताएं। यदि पार्सल अभी डिस्पैच नहीं हुआ है, तो हम तुरंत रद्द कर देंगे।",
    variables: [],
  },
  {
    id: "auto_order_repeat_previous",
    category: "order_placement_modification",
    name: "Repeat Previous Order Request",
    intent: "order_placement",
    subIntent: "repeat_order",
    en: "Delighted to arrange your repeat order! We will verify your previous items and confirm the delivery address.",
    hinglish: "Khushi hui aapka repeat order lekar! Pichle order ke items check karke hum turant confirm karte hain ji.",
    hi: "आपका दोबारा ऑर्डर लेने में बहुत खुशी हुई! पिछले ऑर्डर की पुष्टि करके हम तुरंत प्रक्रिया आगे बढ़ाते हैं जी।",
    variables: [],
  },
  {
    id: "auto_order_gift_pack",
    category: "order_placement_modification",
    name: "Gift Packaging Instructions",
    intent: "order_placement",
    subIntent: "gift_order",
    en: "Yes, we can prepare an artisan gift package with a handwritten mountain greeting note! Please share the recipient's details.",
    hinglish: "Ji haan, hum personalized gift message ke sath special packing kar denge! Recipient ki details share kar dijiye.",
    hi: "जी हाँ, हम व्यक्तिगत शुभकामना संदेश के साथ विशेष गिफ्ट पैकिंग कर देंगे! प्राप्तकर्ता का विवरण साझा करें।",
    variables: [],
  },
  {
    id: "auto_order_free_shipping_notice",
    category: "order_placement_modification",
    name: "Free Shipping Threshold Notice",
    intent: "order_placement",
    subIntent: "free_shipping",
    en: "Reminder: Doorstep delivery is 100% FREE on all orders above ₹1,500! Standard shipping is ₹50 on smaller orders.",
    hinglish: "Zaroori info: ₹1,500 se upar ke sabhi orders par delivery bilkul FREE hai ji! Chhote orders par standard shipping ₹50 hai.",
    hi: "महत्वपूर्ण जानकारी: ₹1,500 से ऊपर के सभी ऑर्डर्स पर डिलीवरी बिल्कुल मुफ़्त है जी! छोटे ऑर्डर्स पर ₹50 डिलीवरी शुल्क है।",
    variables: [],
  },

  // ==========================================
  // CATEGORY 9: ORDER STATUS AND TRACKING (8 templates)
  // ==========================================
  {
    id: "auto_status_ask_number",
    category: "order_status_tracking",
    name: "Ask Order Number",
    intent: "order_status",
    subIntent: "ask_order_number",
    en: "Please share your order number so we can look up the real-time fulfillment status for you.",
    hinglish: "Ji, apna order number share kar dijiye, hum turant live status check karke batate hain.",
    hi: "कृपया अपना ऑर्डर नंबर साझा करें, हम तुरंत स्टेटस चेक करके बताते हैं।",
    variables: [],
  },
  {
    id: "auto_status_packing",
    category: "order_status_tracking",
    name: "Order Being Packed",
    intent: "order_status",
    subIntent: "packing",
    en: "Your order #{orderNumber} is currently undergoing artisan quality inspection and protective packing at our Solan Hub.",
    hinglish: "Ji, aapka order #{orderNumber} abhi Solan Hub par quality check aur secure packing mein hai.",
    hi: "जी, आपका ऑर्डर #{orderNumber} अभी सोलन हब पर गुणवत्ता जांच और सुरक्षित पैकिंग में है।",
    variables: ["orderNumber"],
  },
  {
    id: "auto_status_ready_dispatch",
    category: "order_status_tracking",
    name: "Order Ready For Dispatch",
    intent: "order_status",
    subIntent: "ready_dispatch",
    en: "Your order #{orderNumber} is packed and scheduled for handover to India Post Speed Post today.",
    hinglish: "Aapka order #{orderNumber} pack ho chuka hai aur aaj hi India Post Speed Post ko handover kiya ja raha hai ji.",
    hi: "आपका ऑर्डर #{orderNumber} पैक हो चुका है और आज ही इंडिया पोस्ट स्पीड पोस्ट को सौंपा जा रहा है जी।",
    variables: ["orderNumber"],
  },
  {
    id: "auto_status_dispatched",
    category: "order_status_tracking",
    name: "Order Dispatched / Shipped",
    intent: "order_status",
    subIntent: "shipped",
    en: "Good news! Your order #{orderNumber} has been dispatched from our Solan Mountain Hub. We will share live updates at each transit hub.",
    hinglish: "Shubh samachar! Aapka order #{orderNumber} Solan hub se dispatch ho chuka hai ji. Har transit hub ki live update aati rahegi.",
    hi: "शुभ समाचार! आपका ऑर्डर #{orderNumber} सोलन हब से रवाना हो चुका है जी। हर लोकेशन की अपडेट आपको मिलती रहेगी।",
    variables: ["orderNumber"],
  },
  {
    id: "auto_status_in_transit",
    category: "order_status_tracking",
    name: "Order In Transit At Location",
    intent: "order_status",
    subIntent: "in_transit",
    en: "Transit update for order #{orderNumber}: Your package has safely reached {location} and is moving towards your destination.",
    hinglish: "Transit update ji: Aapka order #{orderNumber} abhi *{location}* pahunch chuka hai aur aapki taraf badh raha hai. 🚚",
    hi: "पार्सल अपडेट: आपका ऑर्डर #{orderNumber} अभी *{location}* पहुँच चुका है और आपके गंतव्य की ओर अग्रसर है। 🚚",
    variables: ["orderNumber", "location"],
  },
  {
    id: "auto_status_delivering_tomorrow",
    category: "order_status_tracking",
    name: "Order Delivering Tomorrow Alert",
    intent: "order_status",
    subIntent: "delivering_tomorrow",
    en: "Delivery Alert: Your order #{orderNumber} is scheduled for delivery tomorrow! Please ensure someone is available at the address.",
    hinglish: "Zaroori update ji: Aapka order #{orderNumber} *kal deliver hone wala hai*. Kripya parcel receive karne ke liye phone available rakhein! 🌿",
    hi: "डिलीवरी अलर्ट: आपका ऑर्डर #{orderNumber} *कल डिलीवर होगा जी*। कृपया पार्सल प्राप्त करने के लिए उपलब्ध रहें! 🌿",
    variables: ["orderNumber"],
  },
  {
    id: "auto_status_delivered",
    category: "order_status_tracking",
    name: "Order Delivered Confirmation",
    intent: "order_status",
    subIntent: "delivered",
    en: "Your order #{orderNumber} has been successfully delivered! We hope you enjoy the authentic Himalayan harvest.",
    hinglish: "Aapka order #{orderNumber} successfully deliver ho gaya hai ji! Prajnaa se judne ke liye bahut shukriya. 🌿",
    hi: "आपका ऑर्डर #{orderNumber} सफलतापूर्वक डिलीवर हो गया है जी! प्रज्ञा से जुड़ने के लिए बहुत धन्यवाद। 🌿",
    variables: ["orderNumber"],
  },
  {
    id: "auto_status_weather_delay",
    category: "order_status_tracking",
    name: "Mountain Weather Transit Update",
    intent: "order_status",
    subIntent: "weather_update",
    en: "Mountain transit update: High-altitude rains/snow in Himachal Pradesh caused slight transit delays, but your order #{orderNumber} is safe and en route.",
    hinglish: "Pahadi transit update: Himachal mein mausam ki wajah se thodi transit deri hui hai, par aapka order #{orderNumber} safe aur raste mein hai ji.",
    hi: "पहाड़ी मौसम अपडेट: हिमाचल में मौसम के कारण थोड़ी देरी हुई है, परंतु आपका ऑर्डर #{orderNumber} सुरक्षित रूप से रास्ते में है जी।",
    variables: ["orderNumber"],
  },

  // ==========================================
  // CATEGORY 10: PAYMENT ENQUIRIES (8 templates)
  // ==========================================
  {
    id: "auto_pay_instructions",
    category: "payment_enquiries",
    name: "Official UPI Payment Instructions",
    intent: "payment_enquiry",
    subIntent: "upi_instructions",
    en: "You can pay via UPI to our official ID: `prajnaa@upi` (Account: Prajnaa Himalayan Harvest). Please share the screenshot once done.",
    hinglish: "Aap hamare official UPI ID `prajnaa@upi` par payment kar sakte hain ji. Ho jaane par screenshot yahan share kar dein.",
    hi: "आप हमारे आधिकारिक UPI ID `prajnaa@upi` पर भुगतान कर सकते हैं जी। भुगतान के बाद स्क्रीनशॉट यहाँ साझा करें।",
    variables: [],
  },
  {
    id: "auto_pay_confirmed",
    category: "payment_enquiries",
    name: "Payment Confirmed Received",
    intent: "payment_enquiry",
    subIntent: "payment_confirmed",
    en: "Your payment has been successfully verified! We are scheduling your package for prompt dispatch from Solan Hub.",
    hinglish: "Aapka payment successfully verify ho gaya hai ji! Hum parcel ko Solan hub se dispatch ke liye schedule kar rahe hain.",
    hi: "आपका भुगतान सफलतापूर्वक कन्फर्म हो गया है जी! हम पार्सल को सोलन हब से तुरंत रवाना करने की व्यवस्था कर रहे हैं।",
    variables: [],
  },
  {
    id: "auto_pay_pending_with_amount",
    category: "payment_enquiries",
    name: "Payment Pending With Amount Due",
    intent: "payment_enquiry",
    subIntent: "pending_amount",
    en: "Your payment is pending for order #{orderNumber}. Total Amount: ₹{amount}. Official UPI: `prajnaa@upi`.",
    hinglish: "Order #{orderNumber} ke liye payment pending hai ji. Total: ₹{amount}. Official UPI ID: `prajnaa@upi`.",
    hi: "ऑर्डर #{orderNumber} का भुगतान लंबित है जी। कुल राशि: ₹{amount}। आधिकारिक UPI ID: `prajnaa@upi`।",
    variables: ["orderNumber", "amount"],
  },
  {
    id: "auto_pay_verify_utr",
    category: "payment_enquiries",
    name: "Ask UTR / Reference For Verification",
    intent: "payment_enquiry",
    subIntent: "verify_utr",
    en: "Please share the 12-digit UPI UTR number or transfer receipt so our finance team can verify it immediately.",
    hinglish: "Kripya 12-digit UPI UTR number ya screenshot share karein, hum turant verify karke confirm karte hain ji.",
    hi: "कृपया 12-अंकों का UPI UTR नंबर या स्क्रीनशॉट साझा करें, हम तुरंत सत्यापन कर देते हैं जी।",
    variables: [],
  },
  {
    id: "auto_pay_cod_policy",
    category: "payment_enquiries",
    name: "Cash On Delivery (COD) Policy",
    intent: "payment_enquiry",
    subIntent: "cod_policy",
    en: "To maintain purity without transit inventory hold-ups, we prioritize prepaid UPI. However, COD is available upon customer request with verified contact details.",
    hinglish: "Direct UPI payment se order turant dispatch hota hai ji. COD bhi uplabdh hai verified details ke sath.",
    hi: "प्रीपेड UPI से ऑर्डर तुरंत रवाना होता है जी। विशेष अनुरोध पर कैश ऑन डिलीवरी (COD) भी उपलब्ध है।",
    variables: [],
  },
  {
    id: "auto_pay_failed_help",
    category: "payment_enquiries",
    name: "Failed Payment Assistance",
    intent: "payment_enquiry",
    subIntent: "payment_failed",
    en: "If the amount was deducted from your bank but failed at gateway, it automatically reverses within 24-48 hours. You may retry via UPI ID `prajnaa@upi`.",
    hinglish: "Agar paise bank se kat gaye hain toh 24-48 ghante mein auto-refund ho jate hain ji. Aap direct `prajnaa@upi` par dubara try kar sakte hain.",
    hi: "यदि बैंक से राशि कट गई है, तो 24-48 घंटे में स्वतः वापस आ जाएगी। आप पुनः `prajnaa@upi` पर प्रयास कर सकते हैं जी।",
    variables: [],
  },
  {
    id: "auto_pay_gst_invoice",
    category: "payment_enquiries",
    name: "GST Invoice Inquiry",
    intent: "payment_enquiry",
    subIntent: "gst_invoice",
    en: "Yes, we provide official tax invoices with GSTIN. We will share your invoice PDF right here on WhatsApp.",
    hinglish: "Ji haan, hum official GST tax invoice provide karte hain. Invoice PDF yahan WhatsApp par share kar diya jayega.",
    hi: "जी हाँ, हम जीएसटी सहित आधिकारिक बिल प्रदान करते हैं। बिल का पीडीएफ आपको यहीं व्हाट्सएप पर मिल जाएगा।",
    variables: [],
  },
  {
    id: "auto_pay_refund_timeline",
    category: "payment_enquiries",
    name: "Refund Processing Timeline",
    intent: "payment_enquiry",
    subIntent: "refund_timeline",
    en: "Approved refunds are credited directly to your original payment source within 3–5 working banking days.",
    hinglish: "Approved refunds 3–5 working days mein aapke original bank account mein credit ho jate hain ji.",
    hi: "स्वीकृत रिफंड 3-5 कार्य दिवसों में आपके मूल बैंक खाते में वापस आ जाते हैं जी।",
    variables: [],
  },

  // ==========================================
  // CATEGORY 11: SHIPPING AND DELIVERY (8 templates)
  // ==========================================
  {
    id: "auto_ship_timeline",
    category: "shipping_delivery",
    name: "Standard Delivery Timeline",
    intent: "shipping_delivery",
    subIntent: "delivery_timeline",
    en: "Delivery across India takes 3–5 working days via Speed Post. Packaging takes 2–3 days for artisan harvest inspection.",
    hinglish: "Delivery mein lagbhag 3–5 working days lagte hain ji. Solan hub par artisan packing mein 2–3 din lagte hain.",
    hi: "डिलीवरी में लगभग 3-5 कार्य दिवस लगते हैं जी। सोलन हब से सुरक्षित पैकिंग में 2-3 दिन लगते हैं।",
    variables: [],
  },
  {
    id: "auto_ship_dispatch_time",
    category: "shipping_delivery",
    name: "Dispatch Time Information",
    intent: "shipping_delivery",
    subIntent: "dispatch_time",
    en: "Orders are freshly packed and dispatched within 2–3 working days of payment verification from Solan, Himachal Pradesh.",
    hinglish: "Payment confirm hone ke 2–3 din ke andar fresh pack karke parcel Solan se dispatch ho jata hai ji.",
    hi: "भुगतान की पुष्टि के 2-3 दिन के भीतर पार्सल सोलन से रवाना कर दिया जाता है जी।",
    variables: [],
  },
  {
    id: "auto_ship_carrier_info",
    category: "shipping_delivery",
    name: "Carrier & Logistics Partner",
    intent: "shipping_delivery",
    subIntent: "carrier_info",
    en: "We partner with India Post Speed Post for the most reliable pan-India reach, covering even remote PIN codes.",
    hinglish: "Hum India Post Speed Post se deliver karte hain taki har chote-bade shahar aur gaon tak parcel surakshit pahunche.",
    hi: "हम इंडिया पोस्ट स्पीड पोस्ट द्वारा पार्सल भेजते हैं ताकि हर पिनकोड तक सुरक्षित पहुंच सुनिश्चित हो सके।",
    variables: [],
  },
  {
    id: "auto_ship_charges",
    category: "shipping_delivery",
    name: "Shipping Charges Policy",
    intent: "shipping_delivery",
    subIntent: "shipping_charges",
    en: "Shipping is completely FREE for orders above ₹1,500. For orders below ₹1,500, a nominal shipping charge of ₹50 applies.",
    hinglish: "₹1,500 se upar sabhi orders par shipping bilkul FREE hai ji. Chote orders par standard ₹50 charge lagta hai.",
    hi: "₹1,500 से ऊपर के सभी ऑर्डर्स पर शिपिंग बिल्कुल मुफ़्त है जी। उससे कम पर केवल ₹50 का शुल्क लगता है।",
    variables: [],
  },
  {
    id: "auto_ship_remote_areas",
    category: "shipping_delivery",
    name: "Remote Areas / North-East Delivery",
    intent: "shipping_delivery",
    subIntent: "remote_areas",
    en: "Yes, Speed Post ensures delivery to all remote locations, island territories, and North-Eastern states within 5–7 days.",
    hinglish: "Ji haan, Speed Post se sabhi door-daraaz ke ilaqon aur North-East mein bhi 5–7 din mein delivery ho jati hai.",
    hi: "जी हाँ, स्पीड पोस्ट से सभी दूरस्थ क्षेत्रों में भी 5-7 दिनों में डिलीवरी सुनिश्चित होती है जी।",
    variables: [],
  },
  {
    id: "auto_ship_damage_protection",
    category: "shipping_delivery",
    name: "In-Transit Damage Protection",
    intent: "shipping_delivery",
    subIntent: "damage_protection",
    en: "All our shipments are 100% insured against transit breakage. In case of any transit issue, we provide an immediate free replacement.",
    hinglish: "Hamari packing 100% shock-proof hai ji. Kisi bhi breakage par hum bina sawaal turant free replacement bhejte hain.",
    hi: "हमारे सभी पार्सल 100% सुरक्षित होते हैं जी। रास्ते में किसी भी नुकसान पर तुरंत नया पार्सल भेजा जाता है।",
    variables: [],
  },
  {
    id: "auto_ship_express_inquiry",
    category: "shipping_delivery",
    name: "Express Delivery Inquiry",
    intent: "shipping_delivery",
    subIntent: "express_delivery",
    en: "Speed Post is currently our fastest air-parcel route from Himachal Pradesh. We prioritize early morning dispatches.",
    hinglish: "Pahadon se Speed Post air-transit sabse tez route hai ji. Hum subah hi dispatch priority par nikaalte hain.",
    hi: "हिमाचल से स्पीड पोस्ट एयर-पार्सल सबसे तीव्र मार्ग है जी। हम सुबह ही डिस्पैच प्राथमिकता पर करते हैं।",
    variables: [],
  },
  {
    id: "auto_ship_address_update",
    category: "shipping_delivery",
    name: "Address Update Before Handover",
    intent: "shipping_delivery",
    subIntent: "address_update",
    en: "If your parcel hasn't left our Solan Hub, we can update the address immediately. Please send the new address.",
    hinglish: "Agar parcel abhi hub par hai toh hum turant address change kar denge ji. Naya address share karein.",
    hi: "यदि पार्सल अभी हब पर है, तो हम तुरंत नया पता अपडेट कर देंगे जी। कृपया नया पता भेजें।",
    variables: [],
  },

  // ==========================================
  // CATEGORY 12: COMPLAINTS, RETURNS AND REFUNDS (8 templates)
  // ==========================================
  {
    id: "auto_comp_damaged_item",
    category: "complaints_returns_refunds",
    name: "Damaged / Broken Item In Transit",
    intent: "complaint",
    subIntent: "damaged_item",
    en: "We sincerely apologize for the inconvenience! Please share a clear photo of the damaged item and order number. We will dispatch an immediate free replacement.",
    hinglish: "Inconvenience ke liye maafi chahte hain ji! Kripya parcel ki ek photo aur order number share karein, hum turant free replacement bhejte hain.",
    hi: "असुविधा के लिए अत्यंत खेद है जी! कृपया पार्सल की एक फोटो और ऑर्डर नंबर साझा करें, हम तुरंत नया पार्सल भेजेंगे।",
    variables: [],
  },
  {
    id: "auto_comp_wrong_item",
    category: "complaints_returns_refunds",
    name: "Wrong Item Received",
    intent: "complaint",
    subIntent: "wrong_item",
    en: "We deeply apologize! Please share a photo of the received parcel. Our team will verify and dispatch the correct items immediately.",
    hinglish: "Galat item receive hone ke liye maafi chahte hain ji! Ek photo share karein, hum turant sahi saman dispatch karte hain.",
    hi: "गलत वस्तु प्राप्त होने के लिए क्षमा चाहते हैं जी! कृपया एक फोटो भेजें, हम तुरंत सही सामान भेज देंगे।",
    variables: [],
  },
  {
    id: "auto_comp_taste_quality",
    category: "complaints_returns_refunds",
    name: "Taste or Quality Feedback Concern",
    intent: "complaint",
    subIntent: "quality_concern",
    en: "Since our produce is 100% raw and seasonal, natural flavors can vary slightly by mountain bloom. We take your feedback seriously and our quality lead will connect with you.",
    hinglish: "Prajnaa harvest 100% natural hone ke kaaran thoda natural flavor farak ho sakta hai ji. Hamare team lead jald aapse connect karenge.",
    hi: "हमारा उत्पाद 100% प्राकृतिक होने के कारण मौसम के अनुसार स्वाद में भिन्नता हो सकती है। हमारी टीम जल्द आपसे संपर्क करेगी जी।",
    variables: [],
  },
  {
    id: "auto_comp_return_policy",
    category: "complaints_returns_refunds",
    name: "Return & Replacement Policy",
    intent: "complaint",
    subIntent: "return_policy",
    en: "We offer hassle-free replacement or refund for damaged, defective, or incorrect items reported within 48 hours of delivery.",
    hinglish: "Delivery ke 48 ghante ke andar batane par damaged ya galat item ka bina kisi pareshani ke replacement ya refund milta hai ji.",
    hi: "डिलीवरी के 48 घंटे के भीतर सूचना देने पर क्षतिग्रस्त वस्तु का बिना किसी झंझट के रिप्लेसमेंट या रिफंड किया जाता है जी।",
    variables: [],
  },
  {
    id: "auto_comp_replacement_dispatched",
    category: "complaints_returns_refunds",
    name: "Replacement Dispatched Notification",
    intent: "complaint",
    subIntent: "replacement_dispatched",
    en: "Your replacement parcel has been packed and scheduled for priority dispatch. We are tracking it personally for you.",
    hinglish: "Aapka replacement parcel priority par pack kar diya gaya hai ji. Hum personally iski live tracking monitor kar rahe hain.",
    hi: "आपका रिप्लेसमेंट पार्सल प्राथमिकता पर पैक कर दिया गया है जी। हम व्यक्तिगत रूप से इसकी निगरानी कर रहे हैं।",
    variables: [],
  },
  {
    id: "auto_comp_refund_processed",
    category: "complaints_returns_refunds",
    name: "Refund Approved & Processed",
    intent: "complaint",
    subIntent: "refund_processed",
    en: "Your refund has been approved and initiated. It will reflect in your UPI account or bank within 3–5 working days.",
    hinglish: "Aapka refund approve hokar initiate ho gaya hai ji. 3–5 working days mein aapke account mein credit ho jayega.",
    hi: "आपका रिफंड स्वीकृत होकर जारी कर दिया गया है जी। 3-5 कार्य दिवसों में आपके खाते में आ जाएगा।",
    variables: [],
  },
  {
    id: "auto_comp_escalation_desk",
    category: "complaints_returns_refunds",
    name: "Escalation To Senior Desk",
    intent: "complaint",
    subIntent: "escalation",
    en: "Your complaint has been directly escalated to our Store Administrator, Nishant ji, who will review and call/message you shortly.",
    hinglish: "Aapki shikayat direct hamare Store Administrator Nishant ji ke paas escalate kar di gayi hai, woh jald aapse judenge.",
    hi: "आपकी शिकायत हमारे स्टोर प्रशासक निशांत जी को सौंप दी गई है, वे जल्द ही आपसे संपर्क करेंगे।",
    variables: [],
  },
  {
    id: "auto_comp_missing_item",
    category: "complaints_returns_refunds",
    name: "Missing Item In Parcel",
    intent: "complaint",
    subIntent: "missing_item",
    en: "We apologize if any item was missed during packaging. Please share your order number; we will dispatch the missing item right away.",
    hinglish: "Agar koi item miss ho gaya hai toh maafi chahte hain ji! Order number batayein, hum bacha hua saman turant bhejte hain.",
    hi: "यदि कोई वस्तु छूट गई है तो हम क्षमा चाहते हैं जी! ऑर्डर नंबर बताएं, हम छूटा हुआ सामान तुरंत रवाना कर देंगे।",
    variables: [],
  },

  // ==========================================
  // CATEGORY 13: HUMAN HANDOFF AND UNKNOWN QUERIES (5 templates)
  // ==========================================
  {
    id: "auto_handoff_explicit_request",
    category: "human_handoff_unknown",
    name: "Customer Asks For Human Agent",
    intent: "human_handoff",
    subIntent: "explicit_request",
    en: "Certainly! I am connecting you with our Store Administrator, Nishant ji. He will assist you personally very shortly.",
    hinglish: "Bilkul ji! Main aapki chat Store Administrator Nishant ji se connect kar raha hoon. Woh jald aapse judenge.",
    hi: "जी बिल्कुल! मैं आपकी बातचीत हमारे स्टोर व्यवस्थापक निशांत जी से जोड़ रहा हूँ। वे शीघ्र ही आपसे संपर्क करेंगे।",
    variables: [],
  },
  {
    id: "auto_handoff_complex_query",
    category: "human_handoff_unknown",
    name: "Complex Special Request Handoff",
    intent: "human_handoff",
    subIntent: "complex_query",
    en: "This requires special assistance from our mountain fulfillment team. Nishant ji will review this and respond to you directly.",
    hinglish: "Iske liye hamari mountain team ki special assistance chahiye ji. Nishant ji review karke seedha aapse connect karenge.",
    hi: "इसके लिए हमारी टीम की विशेष सहायता आवश्यक है जी। निशांत जी इसकी समीक्षा कर आपसे सीधे संपर्क करेंगे।",
    variables: [],
  },
  {
    id: "auto_handoff_unclear_polite",
    category: "human_handoff_unknown",
    name: "Polite Handoff Without 'Unable To Understand'",
    intent: "human_handoff",
    subIntent: "unclear_polite",
    en: "Thank you for reaching out! Our store admin will connect with you shortly to assist you properly. You can also explore our catalogue here: {catalogueLink}",
    hinglish: "Prajnaa Market se judne ke liye dhanyavaad ji! Nishant ji jald hi aapse connect karenge. Hamara live catalogue yahan dekhein: {catalogueLink}",
    hi: "प्रज्ञा मार्केट से संपर्क करने के लिए धन्यवाद जी! हमारे स्टोर एडमिन जल्द ही आपसे संपर्क करेंगे। आप हमारा कैटलॉग यहाँ देख सकते हैं: {catalogueLink}",
    variables: ["catalogueLink"],
  },
  {
    id: "auto_handoff_after_hours",
    category: "human_handoff_unknown",
    name: "Night / After-Hours Handoff",
    intent: "human_handoff",
    subIntent: "after_hours",
    en: "Our store desk is currently closed for the night, but we have noted your message! Nishant ji will connect with you first thing in the morning.",
    hinglish: "Hamari desk abhi raat ke samay closed hai ji, par aapka message note ho gaya hai! Subah hote hi hum aapse connect karenge.",
    hi: "हमारी डेस्क अभी रात्रि में बंद है जी, परंतु आपका संदेश नोट कर लिया गया है! सुबह होते ही हम आपसे संपर्क करेंगे।",
    variables: [],
  },
  {
    id: "auto_handoff_resume_automation",
    category: "human_handoff_unknown",
    name: "Resume Automation Notice",
    intent: "human_handoff",
    subIntent: "resume_notice",
    en: "Automated assistance is back active. How can we help you explore our Himalayan products?",
    hinglish: "Automated assistance dubara active hai ji. Batayein, Himalayan products mein kya dekhna chahenge?",
    hi: "स्वचालित सहायता पुनः सक्रिय है जी। बताएं, हिमालयी उत्पादों में आप क्या देखना चाहेंगे?",
    variables: [],
  },
];

/**
 * Returns all automated response templates.
 */
export function getAutomatedTemplates(): AutomatedTemplate[] {
  return AUTOMATED_TEMPLATES;
}

/**
 * Returns template count by category and total count.
 */
export function getAutomatedTemplateStats(): {
  total: number;
  byCategory: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};
  for (const t of AUTOMATED_TEMPLATES) {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  }
  return {
    total: AUTOMATED_TEMPLATES.length,
    byCategory,
  };
}

/**
 * Retrieves a template by its unique ID.
 */
export function getAutomatedTemplateById(id: string): AutomatedTemplate | undefined {
  return AUTOMATED_TEMPLATES.find((t) => t.id === id);
}

/**
 * Finds the best matching automated template by intent, subIntent, and fallback options.
 */
export function findBestAutomatedTemplate(
  intent: string,
  subIntent?: string
): AutomatedTemplate {
  if (subIntent) {
    const exact = AUTOMATED_TEMPLATES.find(
      (t) => t.intent === intent && t.subIntent === subIntent
    );
    if (exact) return exact;
  }

  const byIntent = AUTOMATED_TEMPLATES.find((t) => t.intent === intent);
  if (byIntent) return byIntent;

  // Default fallback is the polite handoff
  return (
    AUTOMATED_TEMPLATES.find((t) => t.id === "auto_handoff_unclear_polite") ||
    AUTOMATED_TEMPLATES[0]
  );
}

/**
 * Renders template content in the specified language, interpolating dynamic variables safely.
 */
export function renderAutomatedTemplate(
  template: AutomatedTemplate,
  lang: SupportedLanguage,
  variables: Record<string, string | number> = {}
): string {
  let text = template[lang] || template.en || template.hinglish || "";

  for (const [key, val] of Object.entries(variables)) {
    const reg = new RegExp(`\\{${key}\\}`, "g");
    text = text.replace(reg, String(val));
  }

  return text;
}
