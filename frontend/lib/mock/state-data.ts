export interface StateInfo {
  slug: string;
  name: string;
  tagline: string;
  famousCrop: string;
  image: string;
  bannerImage: string;
  altitude: string;
  climate: string;
  soilType: string;
  harvestSeason: string;
  farmersCount: number;
  history: string;
  agriculturalSignificance: string;
  traditionalPractices: string;
  topProducts: { name: string; slug: string; weight: string; price: number; image: string }[];
}

export interface StateFarmer {
  id: string;
  slug: string;
  name: string;
  village: string;
  district: string;
  state: string;
  landAcres: number;
  farmingMethod: string;
  experienceYears: number;
  cropsGrown: string[];
  image: string;
  bio: string;
}

export const STATES_DATA: Record<string, StateInfo> = {
  ladakh: {
    slug: "ladakh",
    name: "Ladakh",
    tagline: "High-Altitude Glacier Cold-Desert Farming",
    famousCrop: "Raktsey Karpo Apricots & Wild Sea Buckthorn",
    image: "/assets/cat-dryfruits.jpg",
    bannerImage: "/assets/hero.jpg",
    altitude: "11,000+ ft (Trans-Himalayan)",
    climate: "Cold Arid Alpine",
    soilType: "Sandy Glacial Loam",
    harvestSeason: "July – September",
    farmersCount: 14,
    history: "Ladakh's agricultural heritage stretches over a millennium, deeply intertwined with Silk Route trade caravans. Farmers engineered traditional glacier water management ('Zings') to channel pristine mineral-rich glacial meltwater to high mountain terraces. The unique extreme solar intensity combined with freezing nights developed rare crop varieties like the sweet Raktsey Karpo apricot, possessing white kernels that cannot grow anywhere else on Earth.",
    agriculturalSignificance: "Raktsey Karpo apricots are GI-tagged and valued for their high natural sugar and oil content. Wild Sea Buckthorn, locally called 'Wonder Plant of Ladakh', yields berries rich in Vitamin C and rare Omega 7 fatty acids harvested from pristine high-altitude mountain riverbanks.",
    traditionalPractices: "Zero-pesticide natural sun-drying on high mountain roofs, snow-fed organic compost application, and communal water management through village elders (Chaspal).",
    topProducts: [
      { name: "Ladakh Halman Dried Apricots", slug: "organic-almonds", weight: "500g", price: 650, image: "/assets/prod-almonds.jpg" },
      { name: "Himalayan Pink Rock Salt", slug: "pink-himalayan-salt", weight: "1kg", price: 240, image: "/assets/prod-salt.jpg" },
    ]
  },
  himachal: {
    slug: "himachal",
    name: "Himachal Pradesh",
    tagline: "Pristine Valley Orchards & Wild Mountain Harvests",
    famousCrop: "Royal Delicious Apples & Thin-Shell Giri Walnuts",
    image: "/assets/cat-nuts.jpg",
    bannerImage: "/assets/hero.jpg",
    altitude: "6,500 - 9,000 ft",
    climate: "Temperate Mountain Climate",
    soilType: "Humus-rich Forest Loam",
    harvestSeason: "August – November",
    farmersCount: 38,
    history: "Apple and walnut cultivation in Kinnaur and Shimla was established in the late 19th century. Himachali farmers perfected terraced hill orchards nourished by monsoon rains and mountain springs, maintaining ancient bee-keeping traditions in oak forests for natural cross-pollination.",
    agriculturalSignificance: "Himachal Royal Delicious apples are famed for their intense aroma, natural sweetness, and firm texture. The region's wild mountain walnuts yield premium pale Giri kernels packed with high brain-boosting Omega-3 fatty acids.",
    traditionalPractices: "Cow dung & neem-based bio-formulations, natural forest bee pollination, hand picking and sun-curing on wooden cots.",
    topProducts: [
      { name: "Himachali Wildflower Raw Honey", slug: "wildflower-honey", weight: "500g", price: 480, image: "/assets/prod-seeds.jpg" },
      { name: "Thin-Shell Giri Walnuts", slug: "organic-almonds", weight: "400g", price: 720, image: "/assets/prod-almonds.jpg" },
    ]
  },
  uttarakhand: {
    slug: "uttarakhand",
    name: "Uttarakhand",
    tagline: "Devbhoomi Organic Terrace Farming & Heirloom Pulses",
    famousCrop: "Munsiyari White Rajma & Badri Cow Ghee",
    image: "/assets/cat-herbs.jpg",
    bannerImage: "/assets/hero.jpg",
    altitude: "7,200 ft Terraced Slopes",
    climate: "Sub-Alpine Cool Climate",
    soilType: "Rich Mountain Mineral Soil",
    harvestSeason: "October – December",
    farmersCount: 29,
    history: "High-altitude terrace farming in Kumaon and Garhwal is a sacred traditional lifestyle practiced for centuries. Farmers conserve heirloom seeds handed down across generations, growing legendary white Rajma near the glacier slopes of Johar Valley.",
    agriculturalSignificance: "Munsiyari White Rajma cooks exceptionally soft with a buttery texture and high digestible protein content. Native Badri cows graze freely on medicinal alpine herbs, producing highly prized A2 ghee filled with medicinal carotene.",
    traditionalPractices: "Rainfed organic farming, traditional stone storage (Bhakhar), zero synthetic chemicals, and crop rotation with Himalayan millets.",
    topProducts: [
      { name: "Munsiyari Organic White Rajma", slug: "munsiyari-rajma", weight: "1kg", price: 290, image: "/assets/prod-seeds.jpg" },
      { name: "Devbhoomi Oak Forest Honey", slug: "wildflower-honey", weight: "500g", price: 520, image: "/assets/prod-almonds.jpg" },
    ]
  },
  rajasthan: {
    slug: "rajasthan",
    name: "Rajasthan",
    tagline: "Thar Desert Sustainable Superfood & Cold-Pressed Mustard",
    famousCrop: "Pearl Millet (Bajra) & Cold-Pressed Yellow Mustard",
    image: "/assets/cat-spices.jpg",
    bannerImage: "/assets/hero.jpg",
    altitude: "Arid Plains & Desert Belts",
    climate: "Dry Arid Semi-Desert",
    soilType: "Sandy Alluvial Alluvium",
    harvestSeason: "October – March",
    farmersCount: 45,
    history: "Farmers of Thar desert mastered climate resilience centuries ago by cultivating drought-tolerant millets and oilseeds. The extreme sunshine and warm soil generate high oil concentration in yellow mustard seeds and rich micronutrients in Bajra grains.",
    agriculturalSignificance: "Cold-pressed wood-extracted yellow mustard oil retains pungent glucosinolates and natural antioxidants without solvent chemical refinement. Mathania red chillies give authentic warmth and distinct crimson color to royal dishes.",
    traditionalPractices: "Ghani wood-pressing at room temperatures, organic cow manure soil enriching, and sun-drying in open desert farm beds.",
    topProducts: [
      { name: "Wood-Pressed Yellow Mustard Oil", slug: "mustard-oil", weight: "1 Litre", price: 340, image: "/assets/prod-turmeric.jpg" },
      { name: "Mathania Red Chili Powder", slug: "garam-masala", weight: "250g", price: 190, image: "/assets/prod-masala.jpg" },
    ]
  },
  gujarat: {
    slug: "gujarat",
    name: "Gujarat",
    tagline: "Vedic Gir Cow Bilona Ghee & Sun-Cured Heritage Pickles",
    famousCrop: "Gir A2 Cow Ghee & Kutch Kesar Mango Pickles",
    image: "/assets/cat-pickles.jpg",
    bannerImage: "/assets/hero.jpg",
    altitude: "Saurashtra & Gir Coastal Pastures",
    climate: "Tropical Semi-Arid",
    soilType: "Black Cotton & Clay Loam",
    harvestSeason: "Year-Round",
    farmersCount: 52,
    history: "Gujarat's Gir sanctuary region is the birthplace of pure-bred Gir cows, renowned worldwide for A2 milk genetics. Saurashtra home-makers and farming communities preserved centuries-old Vedic Bilona churning methods using wooden curd churners.",
    agriculturalSignificance: "Pure A2 Gir Cow Ghee prepared via traditional hand-churning (Bilona) retains natural butyric acid, Vitamin A, and golden aromatic granules. Artisanal pickles are sun-cured in earthen jars using raw spices without artificial preservatives.",
    traditionalPractices: "Earthen pot fermentation, natural wooden Bilona churning, sun-curing in ceramic Barnis, and organic pasture grazing.",
    topProducts: [
      { name: "Gir Cow A2 Bilona Desi Ghee", slug: "a2-ghee", weight: "500ml", price: 890, image: "/assets/prod-turmeric.jpg" },
      { name: "Traditional Kutch Mango Pickle", slug: "mango-pickle", weight: "400g", price: 260, image: "/assets/prod-pickle.jpg" },
    ]
  },
  maharashtra: {
    slug: "maharashtra",
    name: "Maharashtra",
    tagline: "Volcanic Basalt Black Soil & GI-Tagged Superfoods",
    famousCrop: "Waigaon High-Curcumin Turmeric & Ratnagiri Alphonso",
    image: "/assets/prod-turmeric.jpg",
    bannerImage: "/assets/hero.jpg",
    altitude: "Deccan Plateau & Konkan Coast",
    climate: "Tropical Monsoon",
    soilType: "Black Basaltic Volcanic Soil",
    harvestSeason: "March – June (Mangoes) / Jan (Turmeric)",
    farmersCount: 67,
    history: "The Deccan basalt lava soil of Wardha and coastal Konkan orchards have produced legendary crops for generations. Waigaon village turmeric has held cultural and medicinal reverence since the Maratha empire era.",
    agriculturalSignificance: "Waigaon GI Turmeric boasts exceptional 6.1%+ natural Curcumin content (compared to 2% standard turmeric), providing potent anti-inflammatory benefits. GI-certified Ratnagiri Alphonso mangoes are tree-ripened naturally without chemical carbide.",
    traditionalPractices: "Zero-carbide natural hay ripening, traditional steam boiling of turmeric roots, stone grinding, and Jeevamrutha soil nutrition.",
    topProducts: [
      { name: "Waigaon GI High-Curcumin Turmeric", slug: "turmeric-powder", weight: "250g", price: 220, image: "/assets/prod-turmeric.jpg" },
      { name: "Natural Alphonso Mango Pulp", slug: "mango-pickle", weight: "850g", price: 450, image: "/assets/prod-pickle.jpg" },
    ]
  },
  karnataka: {
    slug: "karnataka",
    name: "Karnataka",
    tagline: "Western Ghats Rainforest Canopy Estate Spices & Coffee",
    famousCrop: "Chikmagalur Arabica Coffee & Coorg Green Cardamom",
    image: "/assets/cat-masalas.jpg",
    bannerImage: "/assets/hero.jpg",
    altitude: "3,800 ft Western Ghats Mist Belt",
    climate: "Sub-Tropical Highland Canopy",
    soilType: "Red Laterite Forest Soil",
    harvestSeason: "November – February",
    farmersCount: 41,
    history: "Chikmagalur is the historic cradle of Indian coffee, where Baba Budan planted seven sacred coffee seeds brought from Arabia in 1670. Under dense multi-tiered forest canopy, smallholder farmers grow world-class shade-grown coffee and bold estate cardamom.",
    agriculturalSignificance: "Shade-grown coffee ripens slowly under silver oak and fig trees, developing low acidity and rich chocolatey flavor notes. Coorg Green Cardamom pods are handpicked at peak maturity for high essential oil content.",
    traditionalPractices: "Eco-pulped spring water processing, shade canopy conservation, natural sun drying on tiled yards, and hand sorting.",
    topProducts: [
      { name: "Chikmagalur Single-Estate Coffee", slug: "estate-coffee", weight: "250g", price: 420, image: "/assets/prod-seeds.jpg" },
      { name: "Coorg Bold Green Cardamom", slug: "garam-masala", weight: "100g", price: 380, image: "/assets/prod-masala.jpg" },
    ]
  },
  kerala: {
    slug: "kerala",
    name: "Kerala",
    tagline: "Malabar Spice Coast & Highland Organic Plantations",
    famousCrop: "Wayanad Tellicherry Black Pepper & Cold-Pressed Coconut Oil",
    image: "/assets/cat-spices.jpg",
    bannerImage: "/assets/hero.jpg",
    altitude: "Highland Spice Hills & Coastal Belts",
    climate: "Tropical Humid Equatorial",
    soilType: "Organic Rich Forest Loam",
    harvestSeason: "December – March",
    farmersCount: 58,
    history: "Known for over 3,000 years as the legendary 'Spice Coast of India', Malabar pepper attracted ancient Roman, Arab, and European spice traders. Farmers in Wayanad continue multi-tier homestead farming, inter-cropping pepper vines on coconut and betel nut trees.",
    agriculturalSignificance: "Tellicherry Extra Bold Special (TGSEB) black pepper berries are left on vines longer to grow larger and develop intense floral pungency and high piperine levels. Cold-pressed virgin coconut oil is extracted fresh from sun-cured copra.",
    traditionalPractices: "Traditional vine climbing, sun curing on mats, wood press oil extraction without chemical bleaching, and polyculture biodiversity.",
    topProducts: [
      { name: "Wayanad TGSEB Tellicherry Black Pepper", slug: "black-pepper", weight: "200g", price: 310, image: "/assets/prod-masala.jpg" },
      { name: "Cold-Pressed Extra Virgin Coconut Oil", slug: "coconut-oil", weight: "500ml", price: 360, image: "/assets/prod-pickle.jpg" },
    ]
  }
};

export const STATE_FARMERS_DATA: StateFarmer[] = [
  {
    id: "f-ladakh-1",
    slug: "ramesh-singh",
    name: "Ramesh Singh",
    village: "Hunza",
    district: "Leh",
    state: "Ladakh",
    landAcres: 6.5,
    farmingMethod: "Glacier-fed Heirloom Orchards",
    experienceYears: 35,
    cropsGrown: ["Raktsey Karpo Apricots", "Mamra Almonds", "Wild Sea Buckthorn"],
    image: "/assets/farmer-2.jpg",
    bio: "Ramesh tends 6.5 acres of ancestral high-altitude orchards at 12,000 feet, irrigated exclusively by pristine glacial meltwater streams. He leads a village cooperative of 14 families preserving white-kernel sweet apricots."
  },
  {
    id: "f-ladakh-2",
    slug: "stanzin-norboo",
    name: "Stanzin Norboo",
    village: "Chuchot",
    district: "Leh",
    state: "Ladakh",
    landAcres: 4.2,
    farmingMethod: "Organic High-Altitude Cold Desert",
    experienceYears: 24,
    cropsGrown: ["Himalayan Rock Salt", "Buckwheat", "Sea Buckthorn"],
    image: "/assets/farmer-1.jpg",
    bio: "Stanzin practices sustainable foraging and organic buckwheat farming in river valleys. She works closely with women artisans for natural rock salt cleaning and sun drying."
  },
  {
    id: "f-himachal-1",
    slug: "surender-sharma",
    name: "Surender Sharma",
    village: "Kotgarh",
    district: "Shimla",
    state: "Himachal Pradesh",
    landAcres: 8.0,
    farmingMethod: "Natural Forest Orcharding",
    experienceYears: 28,
    cropsGrown: ["Royal Delicious Apples", "Thin-Shell Giri Walnuts", "Wildflower Honey"],
    image: "/assets/farmer-4.jpg",
    bio: "Surender maintains an 8-acre heirloom orchard in Shimla valley. He uses Zero-Budget Natural Farming (ZBNF) with indigenous cow dung preparations and forest beehives."
  },
  {
    id: "f-himachal-2",
    slug: "meenakshi-negi",
    name: "Meenakshi Negi",
    village: "Kalpa",
    district: "Kinnaur",
    state: "Himachal Pradesh",
    landAcres: 5.5,
    farmingMethod: "Zero Chemical High-Elevation Farming",
    experienceYears: 19,
    cropsGrown: ["Kinnaur Apples", "Wild Mountain Honey", "Pine Nuts (Chilgoza)"],
    image: "/assets/farmer-3.jpg",
    bio: "Meenakshi owns a high-altitude farm in Kinnaur, growing crisp sweet apples and ethically gathering wild forest honey without harming native bee colonies."
  },
  {
    id: "f-uttarakhand-1",
    slug: "harish-rawat",
    name: "Harish Rawat",
    village: "Munsiyari",
    district: "Pithoragarh",
    state: "Uttarakhand",
    landAcres: 3.8,
    farmingMethod: "Traditional Terrace Heritage Cultivation",
    experienceYears: 31,
    cropsGrown: ["Munsiyari White Rajma", "Pahadi Red Rice", "Himalayan Garlic"],
    image: "/assets/farmer-2.jpg",
    bio: "Harish farm terraces overlook Nanda Devi peaks. He preserves heirloom white Rajma seed strains passed down through four generations of Kumaoni farmers."
  },
  {
    id: "f-uttarakhand-2",
    slug: "deepa-joshi",
    name: "Deepa Joshi",
    village: "Ranikhet",
    district: "Almora",
    state: "Uttarakhand",
    landAcres: 4.5,
    farmingMethod: "Natural Organic Dairy & Forest Bee-Keeping",
    experienceYears: 16,
    cropsGrown: ["Badri Cow A2 Ghee", "Oak Forest Honey", "Jhangora Millet"],
    image: "/assets/farmer-1.jpg",
    bio: "Deepa rears indigenous Badri cows in alpine pastures and extracts medicinal wild oak forest honey with local women self-help groups."
  },
  {
    id: "f-rajasthan-1",
    slug: "jagdish-choudhary",
    name: "Jagdish Choudhary",
    village: "Nagaur",
    district: "Nagaur",
    state: "Rajasthan",
    landAcres: 12.0,
    farmingMethod: "Arid Climate-Resilient Farming",
    experienceYears: 27,
    cropsGrown: ["Yellow Mustard", "Pearl Millet (Bajra)", "Mathania Red Chili"],
    image: "/assets/farmer-4.jpg",
    bio: "Jagdish cultivates 12 acres in arid Nagaur using organic mustard inter-cropping and cold-pressed wooden Ghani extraction right at his village farmstead."
  },
  {
    id: "f-rajasthan-2",
    slug: "kamla-devi",
    name: "Kamla Devi",
    village: "Mathania",
    district: "Jodhpur",
    state: "Rajasthan",
    landAcres: 7.2,
    farmingMethod: "Organic Sun-Cured Crop Farming",
    experienceYears: 22,
    cropsGrown: ["Mathania Red Chili", "Organic Bajra Flour", "Cumin Seeds"],
    image: "/assets/farmer-3.jpg",
    bio: "Kamla is a renowned Mathania chilli grower who dries vibrant red chillies on desert dunes before traditional stone-grinding."
  },
  {
    id: "f-gujarat-1",
    slug: "asha-patel",
    name: "Asha Patel",
    village: "Anand",
    district: "Anand",
    state: "Gujarat",
    landAcres: 4.0,
    farmingMethod: "Permaculture & Artisanal Pickling",
    experienceYears: 9,
    cropsGrown: ["Kesar Mango Pickle", "Gir Cow A2 Ghee", "Culinary Herbs"],
    image: "/assets/farmer-3.jpg",
    bio: "Asha transitioned from corporate work to set up a 4-acre organic permaculture farm and solar pickle kitchen employing local village women."
  },
  {
    id: "f-gujarat-2",
    slug: "bhavesh-bharwad",
    name: "Bhavesh Bharwad",
    village: "Talala",
    district: "Gir Somnath",
    state: "Gujarat",
    landAcres: 15.0,
    farmingMethod: "Vedic Bilona Ghee & Organic Orchard",
    experienceYears: 20,
    cropsGrown: ["Gir A2 Cow Ghee", "Gir Kesar Mangoes", "Sesame Seeds"],
    image: "/assets/farmer-2.jpg",
    bio: "Bhavesh maintains a herd of 40 free-grazing Gir cows in the Gir sanctuary periphery, churning cultured curd using authentic wooden Bilona technique."
  },
  {
    id: "f-maharashtra-1",
    slug: "sanjay-deshmukh",
    name: "Sanjay Deshmukh",
    village: "Waigaon",
    district: "Wardha",
    state: "Maharashtra",
    landAcres: 9.5,
    farmingMethod: "GI Organic Turmeric Farming",
    experienceYears: 25,
    cropsGrown: ["Waigaon GI Turmeric", "Organic Jaggery Powder", "Soybean"],
    image: "/assets/farmer-4.jpg",
    bio: "Sanjay is a pioneer in Waigaon high-curcumin turmeric cultivation, processing chemical-free golden turmeric powder using traditional steam-boiling."
  },
  {
    id: "f-maharashtra-2",
    slug: "ganesh-patil",
    name: "Ganesh Patil",
    village: "Devgad",
    district: "Sindhudurg",
    state: "Maharashtra",
    landAcres: 11.0,
    farmingMethod: "Natural Coastal Alphonso Orchard",
    experienceYears: 30,
    cropsGrown: ["Ratnagiri Alphonso Mango", "Natural Mango Pulp", "Kokum"],
    image: "/assets/farmer-1.jpg",
    bio: "Ganesh manages an 11-acre coastal Konkan orchard producing GI-tagged Alphonso mangoes ripened naturally in rice straw without carbide."
  },
  {
    id: "f-karnataka-1",
    slug: "hemanth-gowda",
    name: "Hemanth Gowda",
    village: "Chikmagalur",
    district: "Chikmagalur",
    state: "Karnataka",
    landAcres: 14.5,
    farmingMethod: "Shade-Grown Rainforest Plantation",
    experienceYears: 26,
    cropsGrown: ["Single-Estate Arabica Coffee", "Coorg Green Cardamom", "Cinnamon"],
    image: "/assets/farmer-4.jpg",
    bio: "Hemanth oversees a 14.5-acre coffee estate under native forest trees at 3,800 ft elevation, producing micro-lot specialty Arabica beans."
  },
  {
    id: "f-karnataka-2",
    slug: "savitha-rai",
    name: "Savitha Rai",
    village: "Madikeri",
    district: "Kodagu (Coorg)",
    state: "Karnataka",
    landAcres: 6.0,
    farmingMethod: "Biodiverse Multi-Tier Spice Canopy",
    experienceYears: 18,
    cropsGrown: ["Coorg Bold Green Cardamom", "Estate Black Pepper", "Wild Honey"],
    image: "/assets/farmer-3.jpg",
    bio: "Savitha grows bold green cardamom pods and shade black pepper vines under dense jungle canopy in Coorg, hand-sorting every batch."
  },
  {
    id: "f-kerala-1",
    slug: "mathew-joseph",
    name: "Mathew Joseph",
    village: "Wayanad",
    district: "Wayanad",
    state: "Kerala",
    landAcres: 8.5,
    farmingMethod: "Organic Malabar Homestead Spice Agroforestry",
    experienceYears: 33,
    cropsGrown: ["Tellicherry TGSEB Black Pepper", "Lakadong Turmeric", "Ginger"],
    image: "/assets/farmer-2.jpg",
    bio: "Mathew farms 8.5 acres of lush Wayanad spice gardens producing extra-bold Tellicherry black pepper berries vine-ripened to perfection."
  },
  {
    id: "f-kerala-2",
    slug: "sujata-nair",
    name: "Sujata Nair",
    village: "Alappuzha",
    district: "Alappuzha",
    state: "Kerala",
    landAcres: 5.0,
    farmingMethod: "Traditional Cold-Press Virgin Coconut Farming",
    experienceYears: 21,
    cropsGrown: ["Cold-Pressed Virgin Coconut Oil", "Nutmeg", "Cinnamon"],
    image: "/assets/farmer-1.jpg",
    bio: "Sujata operates a coastal coconut homestead, cold-pressing fresh coconut milk into pure virgin oil within hours of harvest."
  }
];

export function getStateData(slug: string): StateInfo | undefined {
  return STATES_DATA[slug.toLowerCase()];
}

export function getFarmersByState(stateName: string): StateFarmer[] {
  return STATE_FARMERS_DATA.filter(
    (f) => f.state.toLowerCase() === stateName.toLowerCase()
  );
}
