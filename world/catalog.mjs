/* The World catalogue: which plants the terminal can show, and how each set is found in
   OpenStreetMap.

   OSM has no "factory database". What it has is `man_made=works` (a factory), `landuse=industrial`
   (an industrial site), `industrial=*` (what kind), `power=plant`, `telecom=data_center` and
   `landuse=quarry`, tagged by volunteers, usually with a name and often with an operator, rarely
   with a product. `product=semiconductor` exists on five objects in the world; TSMC's fabs are
   there, but as `landuse=industrial` with a name. So every industry below is found two ways, and
   the union is what ships:

     tags       selectors on what the object IS (`industrial=refinery`, `plant:source=nuclear`)
     operators  the companies whose plants matter to an equity decision, matched on name and
                operator over `man_made=works`, `landuse=industrial` and `industrial=*`

   Operator names are matched as whole words (Intel, not Intelsat; Ford, not Oxford), case
   insensitive. Keep them recognisable rather than exhaustive; a plant nobody has drawn on OSM is
   not found by a longer list, and a plant that is drawn is usually named after the company.

   `keywords` is how a search box phrase reaches a layer: "smart chip factories" contains "chip",
   so it opens Chips and wafers rather than going to Overpass. Anything that matches no keyword is
   sent to the Worker as a company search.

   Colours come from the terminal palette so the globe reads like the rest of the product.

   `wikidata` lists the Wikidata classes (P31, with subclasses) whose placed instances belong to the
   layer: a semiconductor fabrication plant, an oil refinery, a shipyard. Wikidata is CC0 and links
   a plant to its owner, sometimes with the owner's ticker; it is thin for some industries and the
   OSM half of the extract covers those.

   This file is read by scripts/world-extract.mjs (which writes world/data/*.json), by test/run.mjs
   and by the Worker's free-text route for keyword routing. The terminal reads the generated
   world/data/index.json, never this file. */

/* The bases the operator list is matched over. Historical: the first extractor sent these as regex
   statements to Overpass, which the mirrors cannot finish; scripts/world-extract.mjs now pulls the
   named objects of each base once and matches locally, so this list is documentation of the sets. */
export const BASES = ['man_made"="works', 'industrial', 'landuse"="industrial'];

export const INDUSTRIES = [
  {
    id: 'semiconductors', label: 'Chips and wafers', color: '#3b82f6',
    wikidata: ["Q4168959"],
    keywords: ['chip', 'chips', 'semiconductor', 'semiconductors', 'fab', 'fabs', 'wafer', 'wafers', 'foundry', 'microchip', 'silicon', 'lithography', 'memory'],
    tags: ['["product"~"semiconductor|microchip|integrated_circuit|wafer|microelectronic",i]', '["industrial"~"semiconductor|microelectronic",i]'],
    operators: ['TSMC', 'Taiwan Semiconductor', 'Samsung Electronics', 'Intel', 'Micron', 'GlobalFoundries', 'SK hynix', 'Texas Instruments', 'Infineon', 'STMicroelectronics', 'NXP', 'SMIC', 'United Microelectronics', 'UMC', 'Kioxia', 'Renesas', 'onsemi', 'ON Semiconductor', 'Wolfspeed', 'Analog Devices', 'Tower Semiconductor', 'Powerchip', 'Vanguard International Semiconductor', 'Nexperia', 'Sony Semiconductor', 'ROHM', 'Winbond', 'Nanya Technology', 'Hua Hong', 'Skyworks', 'Qorvo', 'Microchip Technology', 'X-FAB', 'Rapidus', 'Amkor', 'ASE Group', 'Siltronic', 'SUMCO', 'GlobalWafers', 'ASML', 'Applied Materials', 'Lam Research', 'Tokyo Electron', 'KLA', 'Bosch Semiconductor', 'Toshiba Electronic Devices', 'YMTC', 'Yangtze Memory', 'CXMT', 'Changxin Memory'],
  },
  {
    id: 'electronics', label: 'Electronics assembly', color: '#06b6d4',
    wikidata: [],
    keywords: ['electronics', 'assembly', 'iphone', 'phones', 'laptops', 'displays', 'panels', 'oled', 'lcd', 'ems'],
    tags: ['["industrial"~"electronics",i]', '["product"~"^electronics$|smartphone|display|oled|lcd|printed_circuit|pcb",i]'],
    operators: ['Foxconn', 'Hon Hai', 'Pegatron', 'Quanta Computer', 'Wistron', 'Compal', 'Inventec', 'Flex Ltd', 'Flextronics', 'Jabil', 'Luxshare', 'Goertek', 'BOE', 'LG Display', 'Samsung Display', 'AU Optronics', 'AUO', 'Innolux', 'Sharp', 'LG Electronics', 'Sony', 'Panasonic', 'Murata', 'TDK', 'Kyocera', 'Nidec', 'Delta Electronics', 'Lite-On', 'Celestica', 'Sanmina', 'Benchmark Electronics', 'Plexus', 'Zebra Technologies', 'Xiaomi', 'Huawei', 'Lenovo', 'HP Inc', 'Dell'],
  },
  {
    id: 'batteries', label: 'Batteries and cells', color: '#22c55e',
    wikidata: ["Q141106843"],
    keywords: ['battery', 'batteries', 'cells', 'gigafactory', 'lithium-ion', 'lithium ion', 'cathode', 'anode'],
    tags: ['["product"~"batter|lithium",i]', '["industrial"~"batter",i]'],
    operators: ['CATL', 'Contemporary Amperex', 'BYD', 'LG Energy Solution', 'LG Chem', 'Panasonic Energy', 'Samsung SDI', 'SK On', 'SK Innovation', 'Northvolt', 'Gigafactory', 'Tesla', 'Gotion', 'CALB', 'EVE Energy', 'Sunwoda', 'AESC', 'Envision AESC', 'Freyr', 'Automotive Cells Company', 'ACC Automotive', 'PowerCo', 'Verkor', 'Ultium Cells', 'StarPlus Energy', 'BlueOval SK', 'Farasis', 'Svolt', 'Prologium', 'QuantumScape', 'Solid Power', 'Microvast', 'Ascend Elements', 'Redwood Materials', 'Li-Cycle', 'Umicore', 'POSCO Future M', 'Ecopro', 'L&F'],
  },
  {
    id: 'autos', label: 'Vehicle plants', color: '#f59e0b',
    wikidata: ["Q41793764"],
    keywords: ['car', 'cars', 'auto', 'autos', 'automotive', 'vehicle', 'vehicles', 'trucks', 'ev', 'evs', 'electric vehicle', 'motor', 'motors'],
    tags: ['["industrial"~"automotive",i]', '["product"~"^cars?$|vehicle|automobile|^trucks?$|motorcycle",i]'],
    operators: ['Toyota', 'Volkswagen', 'BMW', 'Mercedes-Benz', 'Daimler', 'Stellantis', 'Ford', 'General Motors', 'GM ', 'Honda', 'Nissan', 'Hyundai', 'Kia', 'Tesla', 'BYD', 'Geely', 'Volvo', 'Renault', 'Peugeot', 'Citroën', 'Fiat', 'Škoda', 'Skoda', 'SEAT', 'Audi', 'Porsche', 'Jaguar Land Rover', 'Mazda', 'Subaru', 'Suzuki', 'Mitsubishi Motors', 'Tata Motors', 'Mahindra', 'Rivian', 'Lucid', 'Scania', 'MAN Truck', 'Iveco', 'Paccar', 'Navistar', 'Daimler Truck', 'Volvo Trucks', 'Isuzu', 'Hino', 'Chery', 'Great Wall Motor', 'SAIC', 'Changan', 'Dongfeng', 'FAW', 'NIO', 'XPeng', 'Li Auto', 'Polestar', 'Lotus', 'Magna Steyr', 'Opel', 'Vauxhall', 'Dacia', 'Cupra', 'Bentley', 'Rolls-Royce Motor', 'Ferrari', 'Lamborghini', 'Maserati', 'McLaren', 'Aston Martin'],
  },
  {
    id: 'aerospace', label: 'Aircraft, engines and space', color: '#a78bfa',
    wikidata: ["Q7312460","Q107009742"],
    keywords: ['aircraft', 'aerospace', 'planes', 'jets', 'engines', 'rockets', 'rocket', 'space', 'satellites', 'defense', 'defence', 'missiles'],
    tags: ['["industrial"~"aerospace",i]', '["product"~"aircraft|aerospace|rocket|satellite|jet_engine|helicopter",i]'],
    operators: ['Boeing', 'Airbus', 'Lockheed Martin', 'Northrop Grumman', 'Raytheon', 'RTX', 'Pratt & Whitney', 'Pratt and Whitney', 'GE Aerospace', 'GE Aviation', 'Rolls-Royce', 'Safran', 'Embraer', 'Bombardier', 'Dassault Aviation', 'Leonardo', 'BAE Systems', 'SpaceX', 'Blue Origin', 'Gulfstream', 'Textron Aviation', 'Cessna', 'Bell Textron', 'Bell Helicopter', 'Sikorsky', 'Spirit AeroSystems', 'Thales Alenia', 'Mitsubishi Heavy Industries', 'Kawasaki Heavy Industries', 'Honeywell Aerospace', 'Collins Aerospace', 'COMAC', 'Rocket Lab', 'Arianespace', 'ArianeGroup', 'MTU Aero Engines', 'Howmet', 'Triumph Group', 'Hexcel', 'Heico', 'TransDigm', 'L3Harris', 'General Dynamics', 'Saab', 'Pilatus', 'Diamond Aircraft', 'Piper Aircraft', 'Cirrus Aircraft', 'Daher', 'ATR', 'Liebherr-Aerospace', 'Moog', 'Parker Aerospace', 'Woodward', 'GKN Aerospace', 'Eve Air Mobility', 'Joby Aviation', 'Archer Aviation'],
  },
  {
    id: 'steel', label: 'Steel, aluminium and metals', color: '#f97316',
    wikidata: ["Q2069494","Q65515162","Q44396585","Q13883136"],
    keywords: ['steel', 'steelworks', 'iron', 'aluminium', 'aluminum', 'copper', 'smelter', 'smelters', 'metals', 'metal', 'nickel', 'zinc', 'mill', 'mills'],
    tags: ['["industrial"~"steel|smelt|aluminium|aluminum|metal_processing|foundry|rolling_mill",i]', '["product"~"^steel|^iron|aluminium|aluminum|^copper|^nickel|^zinc|^metal",i]'],
    operators: ['ArcelorMittal', 'Nippon Steel', 'POSCO', 'Baowu', 'Baosteel', 'Tata Steel', 'Nucor', 'Steel Dynamics', 'Cleveland-Cliffs', 'U.S. Steel', 'US Steel', 'United States Steel', 'Thyssenkrupp', 'ThyssenKrupp', 'Salzgitter', 'voestalpine', 'SSAB', 'JFE Steel', 'Hyundai Steel', 'JSW Steel', 'Gerdau', 'Alcoa', 'Rio Tinto', 'Norsk Hydro', 'Hydro Aluminium', 'Rusal', 'Century Aluminum', 'Aurubis', 'Freeport', 'Glencore', 'Boliden', 'Outokumpu', 'Acerinox', 'Ternium', 'Severstal', 'NLMK', 'Evraz', 'Kobe Steel', 'Commercial Metals', 'Timken', 'Carpenter Technology', 'ATI ', 'Allegheny Technologies', 'Constellium', 'Kaiser Aluminum', 'Novelis', 'Arconic', 'Aleris', 'Vale', 'Nornickel', 'Norilsk', 'Anglo American', 'BHP', 'Sherritt', 'Ansteel', 'HBIS', 'Shagang', 'Shougang', 'Emirates Global Aluminium', 'Alba', 'Ma\'aden', 'KUMBA'],
  },
  {
    id: 'mining', label: 'Mines', color: '#b45309',
    wikidata: [],
    keywords: ['mine', 'mines', 'mining', 'ore', 'lithium', 'gold', 'rare earth', 'rare earths', 'uranium', 'cobalt', 'coal', 'bauxite', 'quarry'],
    tags: ['["landuse"="quarry"]["resource"~"copper|lithium|gold|iron|nickel|cobalt|rare_earth|uranium|coal|bauxite|zinc|platinum|silver|diamond|potash|phosphate",i]'],
    bases: ['landuse"="quarry', 'man_made"="mineshaft', 'man_made"="adit', 'landuse"="industrial'],
    operators: ['BHP', 'Rio Tinto', 'Vale', 'Glencore', 'Freeport', 'Freeport-McMoRan', 'Anglo American', 'Southern Copper', 'Codelco', 'Antofagasta', 'Newmont', 'Barrick', 'Albemarle', 'SQM', 'Pilbara Minerals', 'Lynas', 'MP Materials', 'Fortescue', 'Teck', 'First Quantum', 'Ivanhoe', 'Zijin', 'Nornickel', 'Norilsk', 'Cameco', 'Kazatomprom', 'Arcadium', 'Allkem', 'Livent', 'Ganfeng', 'Tianqi', 'Mineral Resources', 'Sibanye', 'Impala Platinum', 'Anglo American Platinum', 'Harmony Gold', 'AngloGold', 'Kinross', 'Agnico Eagle', 'Gold Fields', 'Newcrest', 'Northern Star', 'Evolution Mining', 'Peabody', 'Arch Resources', 'Coal India', 'Nutrien', 'Mosaic', 'K+S', 'De Beers', 'Alrosa', 'Boliden', 'KGHM', 'Grupo México', 'Grupo Mexico', 'Hudbay', 'Lundin Mining', 'Capstone Copper', 'CMOC', 'China Molybdenum', 'Sherritt', 'Vulcan Materials', 'Martin Marietta'],
  },
  {
    id: 'refineries', label: 'Refineries and petrochemicals', color: '#ef4444',
    wikidata: ["Q12353044"],
    keywords: ['refinery', 'refineries', 'oil', 'petroleum', 'petrochemical', 'petrochemicals', 'lng', 'gas', 'crude', 'fuel', 'ethylene', 'cracker'],
    tags: ['["industrial"~"refinery|petrochemical|gas_plant|lng",i]', '["product"~"petroleum|gasoline|diesel|^fuel|^lng$|petrochemical|ethylene|naphtha|kerosene|^oil$",i]', '["man_made"="works"]["name"~"refiner|raffinerie|refinería|refineria|raffineria|refinaria|рефин|нефтеперераб|製油所|炼油",i]'],
    operators: ['ExxonMobil', 'Exxon', 'Shell', 'BP', 'Chevron', 'TotalEnergies', 'Total ', 'Marathon Petroleum', 'Valero', 'Phillips 66', 'Saudi Aramco', 'Aramco', 'Sinopec', 'PetroChina', 'CNOOC', 'Reliance Industries', 'Reliance', 'ENI', 'Repsol', 'OMV', 'PBF Energy', 'HF Sinclair', 'HollyFrontier', 'Citgo', 'Motiva', 'LyondellBasell', 'Dow', 'BASF', 'SABIC', 'INEOS', 'Braskem', 'Formosa Plastics', 'Indian Oil', 'Bharat Petroleum', 'Hindustan Petroleum', 'ORLEN', 'PKN Orlen', 'MOL', 'Neste', 'Equinor', 'Petrobras', 'Pemex', 'Lukoil', 'Rosneft', 'Gazprom', 'Idemitsu', 'ENEOS', 'Cosmo Oil', 'SK Energy', 'S-Oil', 'GS Caltex', 'Hyundai Oilbank', 'Petronas', 'Pertamina', 'PTT', 'ADNOC', 'Qatar Energy', 'QatarEnergy', 'Kuwait Petroleum', 'KNPC', 'Sonatrach', 'Ecopetrol', 'YPF', 'Cenovus', 'Suncor', 'Imperial Oil', 'Irving Oil', 'Delek', 'Par Pacific', 'Calumet', 'Cheniere', 'Venture Global', 'Sempra', 'Woodside', 'Santos', 'Inpex', 'Novatek', 'Yamal LNG'],
  },
  {
    id: 'chemicals', label: 'Chemicals and fertilisers', color: '#ec4899',
    wikidata: ["Q905286"],
    keywords: ['chemical', 'chemicals', 'fertiliser', 'fertilizer', 'fertilisers', 'fertilizers', 'ammonia', 'polymer', 'polymers', 'plastics', 'resin', 'coatings', 'paint', 'gases'],
    tags: ['["industrial"~"^chemical|petrochemical|fertili",i]', '["product"~"chemical|fertili|ammonia|polymer|plastic|resin|polyethylene|polypropylene|pvc|caustic|chlor",i]'],
    operators: ['BASF', 'Dow', 'DuPont', 'LyondellBasell', 'SABIC', 'INEOS', 'Linde', 'Air Liquide', 'Air Products', 'Evonik', 'Covestro', 'Lanxess', 'Solvay', 'Syensqo', 'Arkema', 'Wacker', 'Clariant', 'Yara', 'CF Industries', 'Nutrien', 'Mosaic', 'Mitsubishi Chemical', 'Sumitomo Chemical', 'Shin-Etsu', 'LG Chem', 'Lotte Chemical', 'Hanwha', 'Braskem', 'Formosa', 'Sinopec', 'Eastman', 'Celanese', 'Huntsman', 'Albemarle', 'Ecolab', 'PPG', 'Sherwin-Williams', 'AkzoNobel', 'Akzo Nobel', 'Syngenta', 'Corteva', 'Bayer', 'Nouryon', 'Westlake', 'Olin', 'Chemours', 'Tronox', 'Kronos', 'Venator', 'FMC', 'Nufarm', 'UPL', 'ICL', 'OCI', 'SQM', 'Grupa Azoty', 'Borealis', 'Borouge', 'Orica', 'Incitec Pivot', 'Toray', 'Teijin', 'Asahi Kasei', 'Mitsui Chemicals', 'Kuraray', 'DSM', 'Givaudan', 'Symrise', 'IFF', 'Croda', 'Johnson Matthey', 'Umicore', 'Element Solutions', 'RPM International', 'Axalta', 'Avient', 'Trinseo', 'Orbia', 'Alpek', 'Indorama', 'Reliance', 'Petronas Chemicals', 'Wanhua', 'Hengli', 'Rongsheng'],
  },
  {
    id: 'pharma', label: 'Pharmaceuticals and biologics', color: '#14b8a6',
    wikidata: [],
    keywords: ['pharma', 'pharmaceutical', 'pharmaceuticals', 'drug', 'drugs', 'medicine', 'medicines', 'vaccine', 'vaccines', 'biotech', 'biologics', 'insulin', 'glp-1', 'api'],
    tags: ['["industrial"~"pharma",i]', '["product"~"pharma|medicin|^drugs?$|vaccine|insulin|biolog|antibiot",i]'],
    operators: ['Pfizer', 'Novartis', 'Roche', 'Genentech', 'Merck', 'MSD', 'Johnson & Johnson', 'Janssen', 'AstraZeneca', 'GSK', 'GlaxoSmithKline', 'Sanofi', 'Novo Nordisk', 'Eli Lilly', 'Lilly', 'AbbVie', 'Amgen', 'Bristol Myers Squibb', 'Bristol-Myers Squibb', 'Gilead', 'Regeneron', 'Moderna', 'BioNTech', 'Bayer', 'Boehringer Ingelheim', 'Takeda', 'Daiichi Sankyo', 'Astellas', 'Otsuka', 'Chugai', 'Eisai', 'Teva', 'Sandoz', 'Lonza', 'Samsung Biologics', 'WuXi', 'Catalent', 'Fresenius Kabi', 'Fresenius', 'Baxter', 'CSL', 'Grifols', 'Merck KGaA', 'Sun Pharma', 'Dr. Reddy', 'Cipla', 'Lupin', 'Aurobindo', 'Zydus', 'Biocon', 'Viatris', 'Mylan', 'Perrigo', 'Hikma', 'Ipsen', 'Servier', 'Pierre Fabre', 'Menarini', 'Chiesi', 'Recordati', 'Almirall', 'Grünenthal', 'STADA', 'Orion', 'UCB', 'Vertex', 'Biogen', 'Alexion', 'Seagen', 'Thermo Fisher', 'Patheon', 'Charles River', 'Siegfried', 'Bachem', 'Corden', 'Recipharm', 'Serum Institute', 'Bharat Biotech', 'Sinopharm', 'Sinovac', 'Hengrui', 'BeiGene', 'Celltrion', 'Hanmi', 'SK Bioscience', 'Zoetis', 'Elanco', 'Bausch', 'Alcon', 'Organon', 'Haleon', 'Kenvue'],
  },
  {
    id: 'shipyards', label: 'Shipyards', color: '#0ea5e9',
    wikidata: ["Q190928"],
    keywords: ['shipyard', 'shipyards', 'ships', 'ship', 'shipbuilding', 'vessels', 'naval', 'dockyard', 'dry dock'],
    tags: ['["industrial"~"shipyard|shipbuilding",i]', '["product"~"^ships?$|vessel|^boats?$|submarine",i]', '["man_made"="works"]["name"~"shipyard|werft|astillero|cantiere|chantier naval|estaleiro|verf|stocznia|судострои|造船|조선",i]', '["landuse"="industrial"]["name"~"shipyard|werft|astillero|cantiere navale|chantiers? de l.atlantique|estaleiro|stocznia|造船|조선소",i]'],
    operators: ['Hyundai Heavy Industries', 'HD Hyundai', 'Hyundai Mipo', 'Hyundai Samho', 'Samsung Heavy Industries', 'Hanwha Ocean', 'Daewoo Shipbuilding', 'DSME', 'China State Shipbuilding', 'CSSC', 'CSIC', 'Fincantieri', 'Meyer Werft', 'Meyer Turku', 'Damen', 'Naval Group', 'BAE Systems', 'Huntington Ingalls', 'Newport News Shipbuilding', 'Ingalls Shipbuilding', 'Bath Iron Works', 'Electric Boat', 'General Dynamics NASSCO', 'NASSCO', 'Austal', 'Mitsubishi Heavy Industries', 'Imabari', 'Japan Marine United', 'Oshima Shipbuilding', 'Tsuneishi', 'Namura', 'Chantiers de l\'Atlantique', 'Navantia', 'ThyssenKrupp Marine', 'TKMS', 'Lürssen', 'Sembcorp Marine', 'Seatrium', 'Keppel', 'Cochin Shipyard', 'Mazagon Dock', 'Garden Reach', 'Hindustan Shipyard', 'Fjellstrand', 'Ulstein', 'Vard', 'Kongsberg', 'Wärtsilä', 'MAN Energy Solutions', 'Babcock', 'Cammell Laird', 'Harland & Wolff', 'Harland and Wolff', 'Irving Shipbuilding', 'Seaspan', 'Davie', 'Bollinger', 'Fincantieri Marinette', 'Marinette Marine', 'Eastern Shipbuilding', 'Conrad', 'Gulf Island', 'Philly Shipyard', 'Hanwha Philly', 'Remontowa', 'Gdańsk', 'Zvezda', 'Sevmash', 'Admiralty Shipyards', 'Baltic Shipyard', 'Yantai CIMC Raffles', 'Jiangnan Shipyard', 'Hudong-Zhonghua', 'Dalian Shipbuilding', 'Waigaoqiao', 'Yangzijiang', 'New Times Shipbuilding', 'Guangzhou Shipyard', 'CSBC', 'PaxOcean', 'Sanoyas', 'Hyundai Vinashin', 'Piriou', 'CMN', 'Abeking', 'Feadship', 'Oceanco', 'Benetti', 'Sanlorenzo', 'Ferretti'],
  },
  {
    id: 'solar_wind', label: 'Solar and wind manufacturing', color: '#84cc16',
    wikidata: [],
    keywords: ['solar', 'photovoltaic', 'pv', 'wind', 'turbine', 'turbines', 'blades', 'modules', 'inverters', 'renewables'],
    tags: ['["industrial"~"^solar|^wind",i]', '["product"~"solar|photovoltaic|wind_turbine|turbine_blade|inverter",i]'],
    operators: ['First Solar', 'LONGi', 'JinkoSolar', 'Jinko', 'Trina Solar', 'JA Solar', 'Canadian Solar', 'Hanwha Q CELLS', 'Qcells', 'Q CELLS', 'Tongwei', 'Meyer Burger', 'Vestas', 'Siemens Gamesa', 'GE Vernova', 'GE Renewable', 'Nordex', 'Goldwind', 'Enercon', 'Enphase', 'SolarEdge', 'Maxeon', 'SunPower', 'REC Group', 'Risen Energy', 'Astronergy', 'Chint', 'GCL', 'Daqo', 'Wacker Polysilicon', 'Hemlock Semiconductor', 'OCI', 'Silfab', 'Heliene', 'Mission Solar', 'Suniva', 'ES Foundry', 'Toledo Solar', 'Waaree', 'Adani Solar', 'Tata Power Solar', 'Vikram Solar', 'Premier Energies', 'TPI Composites', 'LM Wind Power', 'Sinoma', 'Mingyang', 'Envision Energy', 'Envision', 'Suzlon', 'Inox Wind', 'Senvion', 'ZF Wind Power', 'Flender', 'Winergy'],
  },
  {
    id: 'datacenters', label: 'Data centres', color: '#e879f9',
    wikidata: ["Q671224"],
    keywords: ['data center', 'data centers', 'data centre', 'data centres', 'datacenter', 'datacenters', 'datacentre', 'cloud', 'hyperscale', 'colocation', 'servers'],
    tags: ['["telecom"="data_center"]', '["industrial"~"data_cent",i]', '["building"="data_center"]'],
    bases: ['telecom"="data_center', 'landuse"="industrial', 'building"="data_center'],
    operators: ['Amazon Web Services', 'AWS', 'Microsoft', 'Google', 'Meta', 'Facebook', 'Apple', 'Oracle', 'Equinix', 'Digital Realty', 'NTT', 'CyrusOne', 'QTS', 'Vantage', 'Switch', 'Iron Mountain', 'CoreWeave', 'OVH', 'OVHcloud', 'Alibaba Cloud', 'Tencent', 'Huawei Cloud', 'Compass Datacenters', 'Aligned', 'STACK Infrastructure', 'EdgeConneX', 'Cyxtera', 'Flexential', 'DataBank', 'Sabey', 'T5', 'Stream Data Centers', 'Prime Data Centers', 'Cologix', 'Cyrus One', 'Interxion', 'Telehouse', 'Global Switch', 'Colt', 'Ark Data Centres', 'Kao Data', 'Virtus', 'Pulsant', 'atNorth', 'Verne', 'Green Mountain', 'Bulk Infrastructure', 'EcoDataCenter', 'Data4', 'Scaleway', 'Hetzner', 'IONOS', 'maincubes', 'NorthC', 'Penta', 'Keppel DC', 'ST Telemedia', 'AirTrunk', 'NEXTDC', 'Princeton Digital', 'GDS', 'Chindata', 'Yotta', 'Sify', 'AdaniConneX', 'CtrlS', 'Nxtra', 'Ascenty', 'Odata', 'Scala Data Centers', 'Elea', 'KIO'],
  },
  {
    id: 'nuclear', label: 'Nuclear power plants', color: '#fbbf24',
    wikidata: ["Q134447"],
    keywords: ['nuclear', 'reactor', 'reactors', 'uranium power', 'atomic'],
    tags: ['["power"="plant"]["plant:source"="nuclear"]', '["power"="plant"]["plant:source"~"nuclear",i]'],
    bases: [],
    operators: [],
  },
  {
    id: 'cement', label: 'Cement and building materials', color: '#9ca3af',
    wikidata: ["Q11689547"],
    keywords: ['cement', 'concrete', 'aggregates', 'building materials', 'gypsum', 'plasterboard', 'lime', 'bricks'],
    tags: ['["industrial"~"^cement|concrete_plant",i]', '["product"~"^cement|^concrete|clinker|gypsum|plasterboard",i]'],
    operators: ['Holcim', 'LafargeHolcim', 'Lafarge', 'Heidelberg Materials', 'HeidelbergCement', 'Hanson', 'Cemex', 'CRH', 'Buzzi', 'Dyckerhoff', 'Vicat', 'Titan Cement', 'UltraTech', 'Ambuja', 'ACC ', 'Shree Cement', 'Dalmia', 'Anhui Conch', 'Conch', 'CNBM', 'China National Building Material', 'Huaxin', 'Taiheiyo', 'Sumitomo Osaka Cement', 'Dangote', 'Martin Marietta', 'Vulcan Materials', 'Eagle Materials', 'Summit Materials', 'Argos', 'Cementos Argos', 'Cementos Pacasmayo', 'Cemento Cruz Azul', 'Moctezuma', 'Votorantim', 'InterCement', 'Siam Cement', 'SCG', 'Semen Indonesia', 'Cementir', 'Saint-Gobain', 'Knauf', 'Etex', 'USG', 'James Hardie', 'Wienerberger', 'Ibstock', 'Forterra', 'Boral', 'Adbri', 'Fletcher Building', 'Breedon', 'Aggregate Industries', 'Tarmac', 'Colas', 'Eurovia', 'Sika', 'Xella'],
  },
];

/* A whole-word, case-insensitive alternation for Overpass. Overpass regexes are POSIX extended:
   no \b, so a word boundary is "start or a non-letter" on each side. Names carry their own
   punctuation ("Dr. Reddy", "Pratt & Whitney"); only regex metacharacters are escaped. */
export function operatorRegex(names) {
  const alt = names.map(n => n.trim()).filter(Boolean).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return alt ? `(^|[^A-Za-z])(${alt})([^A-Za-z]|$)` : '';
}

/* The Overpass QL body for one industry, without the settings line, as a list of selector
   statements. Global (no bbox): every set here is small enough to answer worldwide, and the
   extract script splits into quadrants on its own when a mirror times out. */
export function selectorsFor(ind) {
  const out = [];
  for (const t of ind.tags || []) out.push(`nwr${t};`);
  const rx = operatorRegex(ind.operators || []);
  if (rx) {
    const bases = ind.bases || BASES;
    for (const b of bases) {
      out.push(`nwr["${b}"]["name"~"${rx}",i];`);
      out.push(`nwr["${b}"]["operator"~"${rx}",i];`);
    }
  }
  return out;
}

export function queryFor(ind, { bbox = null, timeout = 300, limit = 4000 } = {}) {
  const box = bbox ? `(${bbox.join(',')})` : '';
  const stmts = selectorsFor(ind).map(s => box ? s.replace(/;$/, `${box};`) : s);
  return `[out:json][timeout:${timeout}][maxsize:536870912];(${stmts.join('')});out center tags ${limit};`;
}

/* Keyword routing for the search box. Returns the industry id a phrase belongs to, or null.
   Longer keywords win ("data center" before "center"), and a keyword matches on word boundaries
   so "ev" does not fire on "seven". */
export function routeKeyword(phrase) {
  const p = ' ' + String(phrase || '').toLowerCase().replace(/[^a-z0-9\-\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  let best = null, bestLen = 0;
  for (const ind of INDUSTRIES) {
    for (const k of ind.keywords) {
      if (k.length > bestLen && p.includes(' ' + k + ' ')) { best = ind.id; bestLen = k.length; }
    }
  }
  return best;
}
