"""Generates src/data/additives.json from the table below.

Concern levels summarise current EFSA opinions in plain language:
  none     - approved, no safety concern at normal intakes
  limited  - approved, but with a caveat (digestive effects, sensitive groups,
             ADI can be approached by high consumers, data gaps under review)
  moderate - approved with restrictions or mandatory warnings, or EFSA lowered
             the ADI / flagged concerns
  high     - no longer authorised in the EU, or EFSA could not confirm safety
Run: python3 scripts/build-additives.py
"""
import json, os

EFSA = "https://www.efsa.europa.eu/en/topics/topic/food-additives"
SWEET = "https://www.efsa.europa.eu/en/topics/topic/sweeteners"
EUDB = "https://food.ec.europa.eu/food-safety/food-improvement-agents/additives/database_en"
TIO2 = "https://www.efsa.europa.eu/en/news/titanium-dioxide-e171-no-longer-considered-safe-when-used-food-additive"
ASP = "https://www.efsa.europa.eu/en/topics/topic/aspartame"

# (E-number or slug, name, synonyms, category, concern, explanation, source)
T = [
 # ---- colours
 ("E100","Curcumin",["turmeric extract"],"colour","none","Yellow colour from turmeric. No safety concern at permitted levels.",EFSA),
 ("E101","Riboflavin",["vitamin b2 colour"],"colour","none","Vitamin B2 used as a yellow colour. Safe.",EFSA),
 ("E102","Tartrazine",[],"colour","moderate","Synthetic azo dye. In the EU, foods containing it must carry a warning that it 'may have an adverse effect on activity and attention in children'.",EFSA),
 ("E104","Quinoline yellow",[],"colour","moderate","Synthetic dye that requires the EU 'activity and attention in children' warning. EFSA lowered its ADI in 2009.",EFSA),
 ("E110","Sunset yellow FCF",["sunset yellow"],"colour","moderate","Synthetic azo dye with the mandatory EU warning about activity and attention in children.",EFSA),
 ("E120","Carmine",["cochineal","carminic acid"],"colour","limited","Red colour made from insects, so it is not vegan or vegetarian. It can cause allergic reactions in rare cases.",EFSA),
 ("E122","Carmoisine",["azorubine"],"colour","moderate","Synthetic azo dye with the mandatory EU warning about activity and attention in children.",EFSA),
 ("E124","Ponceau 4R",["cochineal red a"],"colour","moderate","Synthetic azo dye with the mandatory EU warning about activity and attention in children. EFSA lowered its ADI in 2009.",EFSA),
 ("E129","Allura red AC",["allura red"],"colour","moderate","Synthetic azo dye with the mandatory EU warning about activity and attention in children.",EFSA),
 ("E133","Brilliant blue FCF",["brilliant blue"],"colour","limited","Synthetic blue dye. EFSA considers it safe at the ADI; it adds colour only, no nutrition.",EFSA),
 ("E140","Chlorophylls",["chlorophyll"],"colour","none","Natural green pigment from plants. Safe.",EFSA),
 ("E141","Copper chlorophyllin",["copper complexes of chlorophylls"],"colour","none","Green colour made from chlorophyll. Safe at permitted levels.",EFSA),
 ("E150a","Plain caramel",["caramel colour","caramel color"],"colour","none","Brown colour made by heating sugar. Safe.",EFSA),
 ("E150c","Ammonia caramel",[],"colour","limited","Caramel colour made with ammonia. Can contain small amounts of 4-MEI, a by-product EFSA set limits for.",EFSA),
 ("E150d","Sulphite ammonia caramel",[],"colour","limited","The most common caramel colour (in colas). Can contain 4-MEI; EFSA considers it safe within limits.",EFSA),
 ("E153","Vegetable carbon",["carbo medicinalis vegetabilis"],"colour","limited","Black colour from charred plant material. EFSA noted data gaps on possible contaminants.",EFSA),
 ("E160a","Carotenes",["beta-carotene","beta carotene"],"colour","none","Orange pigment, the same family as the pro-vitamin A in carrots. Safe as a food colour.",EFSA),
 ("E160b","Annatto",["bixin","norbixin"],"colour","limited","Orange-yellow colour from achiote seeds. Safe at the ADI; rare allergic reactions are reported.",EFSA),
 ("E160c","Paprika extract",["capsanthin","capsorubin"],"colour","none","Red-orange colour from paprika. Safe.",EFSA),
 ("E162","Beetroot red",["betanin","beet red"],"colour","none","Red colour from beetroot. Safe.",EFSA),
 ("E163","Anthocyanins",["grape skin extract","black carrot extract"],"colour","none","Purple-red pigments from fruit and vegetables. Safe.",EFSA),
 ("E170","Calcium carbonate",[],"colour / acidity regulator","none","Chalk, used as a white colour, anti-caking agent or calcium source. Safe.",EFSA),
 ("E171","Titanium dioxide",["titanium dioxide"],"colour","high","White pigment that is no longer allowed in food in the EU since 2022 because EFSA could not rule out genotoxicity. Still permitted in some other countries.",TIO2),
 ("E172","Iron oxides",["iron oxide"],"colour","none","Mineral pigments (red, yellow, black). Safe at permitted levels.",EFSA),
 # ---- preservatives
 ("E200","Sorbic acid",[],"preservative","none","Prevents mould and yeast. Safe at permitted levels.",EFSA),
 ("E202","Potassium sorbate",[],"preservative","none","Common mould inhibitor in bars and shakes. EFSA considers it safe at the ADI.",EFSA),
 ("E210","Benzoic acid",[],"preservative","limited","Preservative. Safe at the ADI, but some people are sensitive to benzoates, and children who consume a lot can approach the ADI.",EFSA),
 ("E211","Sodium benzoate",[],"preservative","limited","Preservative used in drinks. Combined with vitamin C it can form traces of benzene; some sensitive people react to benzoates.",EFSA),
 ("E220","Sulphur dioxide",["sulfur dioxide"],"preservative","limited","Preservative that can trigger reactions in people with asthma or sulphite sensitivity. Must be declared as an allergen above 10 mg/kg.",EFSA),
 ("E223","Sodium metabisulphite",["sodium metabisulfite"],"preservative","limited","Sulphite preservative; can trigger reactions in people with asthma or sulphite sensitivity.",EFSA),
 ("E234","Nisin",[],"preservative","none","Natural antimicrobial peptide from bacteria. Safe at permitted levels.",EFSA),
 ("E250","Sodium nitrite",["nitrite"],"preservative","moderate","Curing agent in processed meat (e.g. protein jerky). It can form nitrosamines; EFSA says exposure is within safe limits but processed meat itself is linked to colorectal cancer.",EFSA),
 ("E252","Potassium nitrate",["nitrate"],"preservative","moderate","Curing agent that converts to nitrite. See E250.",EFSA),
 ("E260","Acetic acid",["vinegar acid"],"acidity regulator","none","The acid in vinegar. Safe.",EFSA),
 ("E270","Lactic acid",[],"acidity regulator","none","Acid naturally produced by fermentation. Safe.",EFSA),
 ("E290","Carbon dioxide",[],"propellant / carbonation","none","The gas in fizzy drinks. Safe.",EFSA),
 ("E296","Malic acid",[],"acidity regulator","none","Fruit acid that adds sourness. Safe.",EFSA),
 # ---- antioxidants
 ("E300","Ascorbic acid",["vitamin c"],"antioxidant","none","Vitamin C, used to stop oxidation. Safe.",EFSA),
 ("E301","Sodium ascorbate",[],"antioxidant","none","A salt of vitamin C. Safe.",EFSA),
 ("E304","Ascorbyl palmitate",["fatty acid esters of ascorbic acid"],"antioxidant","none","Fat-soluble form of vitamin C that protects oils from going rancid. Safe.",EFSA),
 ("E306","Tocopherol-rich extract",["mixed tocopherols","tocopherols","vitamin e"],"antioxidant","none","Natural vitamin E that protects fats from oxidation. Safe.",EFSA),
 ("E307","Alpha-tocopherol",[],"antioxidant","none","Vitamin E. Safe.",EFSA),
 ("E320","Butylated hydroxyanisole (BHA)",["bha"],"antioxidant","moderate","Synthetic antioxidant. EFSA keeps it authorised at a low ADI; it is classified as a possible human carcinogen by IARC (2B).",EFSA),
 ("E321","Butylated hydroxytoluene (BHT)",["bht"],"antioxidant","limited","Synthetic antioxidant authorised at a low ADI. EFSA considers current exposure safe.",EFSA),
 ("E330","Citric acid",[],"acidity regulator","none","Fruit acid used for tartness and as a preservative aid. Safe.",EFSA),
 ("E331","Sodium citrates",["sodium citrate","trisodium citrate"],"acidity regulator","none","Salt of citric acid, stabilises proteins in shakes. Safe.",EFSA),
 ("E332","Potassium citrates",["potassium citrate"],"acidity regulator","none","Salt of citric acid. Safe.",EFSA),
 ("E333","Calcium citrates",["calcium citrate"],"acidity regulator","none","Salt of citric acid, also a calcium source. Safe.",EFSA),
 ("E334","Tartaric acid",[],"acidity regulator","none","Grape acid. Safe.",EFSA),
 ("E392","Rosemary extract",["extracts of rosemary"],"antioxidant","none","Natural antioxidant from rosemary. Safe at permitted levels.",EFSA),
 # ---- phosphates
 ("E338","Phosphoric acid",[],"acidity regulator","limited","Adds sharpness (colas). EFSA set a group ADI for phosphates in 2019; high consumers and people with kidney disease should limit intake.",EFSA),
 ("E339","Sodium phosphates",["disodium phosphate","trisodium phosphate","sodium phosphate"],"stabiliser","limited","Keeps proteins smooth in shakes and processed cheese. Covered by EFSA's 2019 phosphate group ADI; heavy use adds up across processed foods.",EFSA),
 ("E340","Potassium phosphates",["dipotassium phosphate","potassium phosphate","tripotassium phosphate"],"stabiliser","limited","Common in ready-to-drink protein shakes. Covered by EFSA's phosphate group ADI; relevant for people with kidney disease.",EFSA),
 ("E341","Calcium phosphates",["tricalcium phosphate","calcium phosphate","dicalcium phosphate"],"anti-caking agent / mineral","limited","Anti-caking agent and calcium source. Covered by EFSA's phosphate group ADI.",EFSA),
 ("E450","Diphosphates",["sodium pyrophosphate","disodium diphosphate"],"raising agent / stabiliser","limited","Phosphate additive. Covered by EFSA's phosphate group ADI.",EFSA),
 ("E451","Triphosphates",["sodium tripolyphosphate"],"stabiliser","limited","Phosphate additive. Covered by EFSA's phosphate group ADI.",EFSA),
 ("E452","Polyphosphates",["sodium polyphosphate","sodium hexametaphosphate"],"stabiliser","limited","Phosphate additive. Covered by EFSA's phosphate group ADI.",EFSA),
 # ---- thickeners, gums, stabilisers
 ("E400","Alginic acid",[],"thickener","none","Thickener from seaweed. Safe.",EFSA),
 ("E401","Sodium alginate",["alginate"],"thickener","none","Seaweed-derived thickener. Safe.",EFSA),
 ("E406","Agar",["agar-agar"],"thickener","none","Seaweed gel, a vegan alternative to gelatin. Safe.",EFSA),
 ("E407","Carrageenan",[],"thickener","limited","Seaweed thickener used in shakes and dairy alternatives. EFSA (2018) kept it authorised but asked for more data and set a temporary ADI; some people report gut discomfort.",EFSA),
 ("E407a","Processed Eucheuma seaweed",[],"thickener","limited","Less refined form of carrageenan. Same caveats as E407.",EFSA),
 ("E410","Locust bean gum",["carob bean gum","carob gum"],"thickener","none","Thickener from carob seeds. Safe.",EFSA),
 ("E412","Guar gum",[],"thickener","none","Thickener from guar beans, also a soluble fibre. Safe; large amounts can cause bloating.",EFSA),
 ("E414","Gum arabic",["acacia gum","acacia fibre","acacia fiber"],"thickener","none","Tree resin used as a thickener and fibre. Safe.",EFSA),
 ("E415","Xanthan gum",[],"thickener","none","Fermentation-made thickener. Safe.",EFSA),
 ("E417","Tara gum",[],"thickener","none","Thickener from tara seeds. Safe.",EFSA),
 ("E418","Gellan gum",[],"thickener","none","Fermentation-made gelling agent that keeps particles suspended in shakes. Safe.",EFSA),
 ("E440","Pectin",["pectins"],"gelling agent","none","Fruit fibre used as a gelling agent. Safe.",EFSA),
 ("E460","Cellulose",["microcrystalline cellulose","powdered cellulose","cellulose gel"],"bulking agent / anti-caking","none","Plant fibre. Safe, but it adds bulk without nutrition.",EFSA),
 ("E461","Methyl cellulose",["methylcellulose"],"thickener","none","Modified cellulose used as a binder. Safe.",EFSA),
 ("E464","Hydroxypropyl methyl cellulose",["hpmc","hypromellose"],"thickener","none","Modified cellulose used as a binder and in capsules. Safe.",EFSA),
 ("E466","Carboxymethyl cellulose",["cellulose gum","cmc","sodium carboxymethyl cellulose"],"thickener","limited","Modified cellulose thickener. EFSA sees no safety concern, but animal and small human studies suggest effects on gut bacteria; research is ongoing.",EFSA),
 # ---- emulsifiers
 ("E322","Lecithins",["lecithin","soy lecithin","soya lecithin","sunflower lecithin","rapeseed lecithin"],"emulsifier","none","Emulsifier from soy, sunflower or rapeseed that helps powders mix. Safe. Soy lecithin must be labelled as a soy allergen.",EFSA),
 ("E433","Polysorbate 80",["polyoxyethylene sorbitan monooleate"],"emulsifier","limited","Synthetic emulsifier. EFSA considers it safe at the ADI; animal studies suggest possible effects on the gut lining and microbiome.",EFSA),
 ("E435","Polysorbate 60",[],"emulsifier","limited","Synthetic emulsifier. Similar caveats to polysorbate 80.",EFSA),
 ("E471","Mono- and diglycerides of fatty acids",["mono and diglycerides","mono- and diglycerides","monoglycerides"],"emulsifier","limited","Very common emulsifier. EFSA (2017) sees no safety concern, but it can contain process contaminants (glycidyl esters, 3-MCPD) and is a marker of ultra-processing.",EFSA),
 ("E472e","DATEM",["mono- and diacetyl tartaric acid esters"],"emulsifier","none","Emulsifier used in baked goods. Safe.",EFSA),
 ("E473","Sucrose esters of fatty acids",["sucrose esters"],"emulsifier","none","Emulsifier. Safe at the ADI.",EFSA),
 ("E475","Polyglycerol esters of fatty acids",["polyglycerol esters"],"emulsifier","none","Emulsifier. Safe.",EFSA),
 ("E476","Polyglycerol polyricinoleate",["pgpr"],"emulsifier","none","Emulsifier that makes chocolate coatings flow. Safe.",EFSA),
 ("E481","Sodium stearoyl-2-lactylate",["sodium stearoyl lactylate","ssl"],"emulsifier","none","Emulsifier. Safe at the ADI.",EFSA),
 ("E491","Sorbitan monostearate",[],"emulsifier","none","Emulsifier. Safe at the ADI.",EFSA),
 # ---- raising / regulators / salts
 ("E500","Sodium carbonates",["sodium bicarbonate","baking soda","sodium hydrogen carbonate"],"raising agent","none","Baking soda. Safe; adds a little sodium.",EFSA),
 ("E501","Potassium carbonates",["potassium carbonate"],"acidity regulator","none","Used to alkalise cocoa. Safe.",EFSA),
 ("E503","Ammonium carbonates",[],"raising agent","none","Raising agent that evaporates during baking. Safe.",EFSA),
 ("E504","Magnesium carbonates",["magnesium carbonate"],"anti-caking agent","none","Anti-caking agent and magnesium source. Safe.",EFSA),
 ("E509","Calcium chloride",[],"firming agent","none","Mineral salt. Safe.",EFSA),
 ("E516","Calcium sulphate",["calcium sulfate"],"firming agent","none","Used to set tofu. Safe.",EFSA),
 ("E524","Sodium hydroxide",[],"acidity regulator","none","Used in tiny amounts to adjust acidity; neutralised in the food. Safe.",EFSA),
 ("E551","Silicon dioxide",["silica","silicon dioxide"],"anti-caking agent","limited","Keeps powders free-flowing. EFSA (2018) found no safety concern at reported uses but noted data gaps, especially on nano-sized particles.",EFSA),
 ("E552","Calcium silicate",[],"anti-caking agent","none","Anti-caking agent. Safe.",EFSA),
 ("E553b","Talc",[],"anti-caking agent","limited","Anti-caking agent; EFSA re-evaluation pending more data.",EFSA),
 ("E470b","Magnesium salts of fatty acids",["magnesium stearate"],"anti-caking agent","none","Flow agent in powders and tablets. Safe.",EFSA),
 ("E575","Glucono-delta-lactone",["gdl"],"acidity regulator","none","Mild acid made from glucose. Safe.",EFSA),
 ("E621","Monosodium glutamate",["msg","monosodium glutamate"],"flavour enhancer","limited","Savoury flavour enhancer. EFSA (2017) set a group ADI that high consumers of processed food can exceed.",EFSA),
 ("E627","Disodium guanylate",[],"flavour enhancer","none","Flavour enhancer usually paired with MSG. Safe.",EFSA),
 ("E631","Disodium inosinate",[],"flavour enhancer","none","Flavour enhancer usually paired with MSG. Safe.",EFSA),
 # ---- glazing
 ("E901","Beeswax",[],"glazing agent","none","Coating made by bees, so not vegan. Safe.",EFSA),
 ("E903","Carnauba wax",[],"glazing agent","none","Plant wax that makes coatings shiny. Safe.",EFSA),
 ("E904","Shellac",[],"glazing agent","none","Resin made by lac insects, so not vegan. Safe.",EFSA),
 ("E941","Nitrogen",[],"packaging gas","none","Inert gas used in packaging. Safe.",EFSA),
 ("E942","Nitrous oxide",[],"propellant","none","Propellant in whipped toppings. Safe.",EFSA),
 # ---- polyols
 ("E420","Sorbitol",["sorbitol syrup"],"sweetener (polyol)","limited","Sugar alcohol. EU labels must warn that 'excessive consumption may produce laxative effects'; about 20 g at once can cause bloating or diarrhoea.",SWEET),
 ("E421","Mannitol",[],"sweetener (polyol)","limited","Sugar alcohol with a strong laxative effect in amounts around 20 g.",SWEET),
 ("E422","Glycerol",["glycerin","glycerine","vegetable glycerin"],"humectant","none","Keeps bars soft. Safe; very large amounts can cause headaches or loose stools. It has calories but often isn't counted as sugar.",EFSA),
 ("E953","Isomalt",[],"sweetener (polyol)","limited","Sugar alcohol; laxative effects in larger amounts.",SWEET),
 ("E965","Maltitol",["maltitol syrup"],"sweetener (polyol)","limited","Sugar alcohol common in 'low sugar' bars. It raises blood sugar about half as much as sugar and is one of the polyols most likely to cause gas and diarrhoea.",SWEET),
 ("E966","Lactitol",[],"sweetener (polyol)","limited","Sugar alcohol made from milk sugar; laxative in larger amounts.",SWEET),
 ("E967","Xylitol",[],"sweetener (polyol)","limited","Sugar alcohol that is good for teeth but laxative in larger amounts. Highly toxic to dogs, so keep products away from pets.",SWEET),
 ("E968","Erythritol",[],"sweetener (polyol)","limited","Best-tolerated sugar alcohol with almost no calories. EFSA (2023) set an ADI of 0.5 g/kg body weight; some observational studies link high blood levels to cardiovascular events, which is still being studied.",SWEET),
 # ---- intense sweeteners
 ("E950","Acesulfame K",["acesulfame potassium","acesulfame-k","acesulfame"],"sweetener","limited","Intense sweetener, about 200 times sweeter than sugar. EFSA considers it safe at the ADI.",SWEET),
 ("E951","Aspartame",[],"sweetener","limited","Intense sweetener. EFSA considers it safe at the ADI (40 mg/kg); IARC classified it as 'possibly carcinogenic' (2B) in 2023. Not suitable for people with phenylketonuria (PKU).",ASP),
 ("E952","Cyclamate",["sodium cyclamate","cyclamic acid"],"sweetener","moderate","Intense sweetener with a low ADI (7 mg/kg). Banned in the USA; allowed in the EU in limited uses.",SWEET),
 ("E954","Saccharin",["sodium saccharin"],"sweetener","limited","Oldest intense sweetener. EFSA raised its ADI in 2024 and considers it safe.",SWEET),
 ("E955","Sucralose",[],"sweetener","limited","Intense sweetener used in most protein powders. EFSA considers it safe at the ADI; recent lab studies on a by-product (sucralose-6-acetate) and on heating have prompted further review.",SWEET),
 ("E957","Thaumatin",[],"sweetener","none","Sweet protein from the katemfe fruit. Safe.",SWEET),
 ("E960","Steviol glycosides",["stevia","stevia extract","steviol glycosides","rebaudioside a","reb a","stevia leaf extract"],"sweetener","none","Plant-derived intense sweetener. EFSA considers it safe at the ADI.",SWEET),
 ("E961","Neotame",[],"sweetener","none","Intense sweetener related to aspartame, used in tiny amounts. Safe at the ADI.",SWEET),
 ("E962","Aspartame-acesulfame salt",[],"sweetener","limited","Combination of aspartame and acesulfame. Not suitable for people with PKU.",SWEET),
 ("E969","Advantame",[],"sweetener","none","Very intense sweetener used in tiny amounts. Safe at the ADI.",SWEET),
 # ---- misc
 ("E1200","Polydextrose",[],"bulking agent / fibre","limited","Synthetic fibre used to replace sugar. Counts as fibre on the label, which lowers 'net carbs'; large amounts can cause bloating.",EFSA),
 ("E1422","Acetylated distarch adipate",["modified starch"],"thickener","none","Modified starch. Safe, but a marker of processing.",EFSA),
 ("E1442","Hydroxypropyl distarch phosphate",[],"thickener","none","Modified starch. Safe, but a marker of processing.",EFSA),
 ("E1520","Propylene glycol",[],"humectant / carrier","limited","Carrier for flavourings and moisture keeper. Safe at the ADI.",EFSA),
 ("natural-flavouring","Natural flavouring",["natural flavouring","natural flavourings","natural flavoring","natural flavor","natural flavors","natural flavour","natural flavours","natural aroma"],"flavouring","none","Flavour extracted from natural sources. Regulated and safe, but the exact substances don't have to be disclosed.",EFSA),
 ("flavouring","Flavouring",["flavouring","flavourings","flavoring","flavorings","artificial flavour","artificial flavor","artificial flavours","artificial flavors","aroma","aromas"],"flavouring","limited","Unspecified flavourings. Every flavouring substance is assessed by EFSA, but labels don't say which ones are used.",EFSA),
 ("enzymes","Enzymes",["enzymes","lactase","protease"],"processing aid","none","Enzymes added to aid digestion or processing (for example lactase to break down lactose). Safe.",EUDB),
]

out = []
seen = set()
for e, name, syn, cat, concern, expl, src in T:
    eid = e if e.startswith('E') else e
    assert eid not in seen, eid
    seen.add(eid)
    entry = {"id": eid, "name": name, "synonyms": syn, "category": cat,
             "explanation": expl, "concern": concern, "source": src}
    if eid.startswith('E') and eid[1:2].isdigit():
        entry["eNumber"] = eid
    out.append(entry)

assert len(out) >= 80, len(out)
path = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'additives.json')
with open(path, 'w') as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
print(f"wrote {len(out)} additives")
