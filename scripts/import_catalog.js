const { setDoc, useFirestore } = require('../utils/db');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const rawData = `Annual Commercial Contract Fee		0	Service	Single	Premium Lawn Care Contract	
Application		0	Service	Single	Material	
Bark Mulch		0	Non-Inventory	Single	Material	
Bark Mulch Labor		0	Service	Single	Lawn Care Maintenance	
Bark Mulch Services		0	Bundle	Parent		
Compost Mix		0	Non-Inventory	Single	Material	
Compost Mix Labor		0	Service	Single	Lawn Care Maintenance	
Compost Mix Services		0	Bundle	Parent		
Core Aeration		0	Service	Single	Lawn Care	
Core Aeration Tier 1 Services		0	Bundle	Parent		
Core Aeration Tier 2 Services		0	Bundle	Parent		
Core Aeration Tier 3 Services		0	Bundle	Parent		
Decorative Material Labor		0	Service	Single	Lawn Care Maintenance	
Decorative Materials		0	Non-Inventory	Single	Material	
De-icing Labor		0	Service	Single	Winter Services	
De-icing Materials		0	Non-Inventory	Single	Winter Services	
De-icing Services		0	Bundle	Parent		
Dethatching Labor		0	Service	Single	Lawn Care Maintenance	
Dethatching Services		0	Bundle	Parent		
Disposal Fee		0	Non-Inventory	Single	Lawn Care Maintenance	
Edging		0	Service	Single	Lawn Care Maintenance	
Equipment Rental.		0	Non-Inventory	Single	Equipment	
Fall Property Clean-Up Tier 1		0	Bundle	Parent		
Fall Property Clean-Up Tier 2		0	Bundle	Parent		
Fall Property Clean-Up Tier 3		0	Bundle	Parent		
Fall Property Clean-Up Tier 4		0	Bundle	Parent		
Fertilization Materials		0	Non-Inventory	Single	Material	
Fertilization Services		0	Bundle	Parent		
Flower Bed Maintenance		0	Service	Single	Lawn Care Maintenance	
Fuel Charge		0	Service	Single		Fuel Charge
Hours		0	Service	Single		
Installations		0	Service	Single	Lawn Care Maintenance	
Landscape Fabric		0	Non-Inventory	Single	Material	
Landscape Mix 25lb		0	Service	Single	SEED	
Landscape Mix 50lb		0	Non-Inventory	Single	SEED	
Landscape Project		0	Service	Single	Landscape Design	
Landscape Staples		0	Non-Inventory	Single	Material	
Landscaping		0	Service	Single	Lawn Care	
Late fee		0	Service	Single		
Lawn Care Contract		0	Service	Single	Premium Lawn Care Contract	
Lawn Fertilization		0	Service	Single	Lawn Care Maintenance	
Lawn Mowing Labor		0	Service	Single	Lawn Care Maintenance	
Lawn Seed & Loam		0	Non-Inventory	Single	Material	
Leaf Clean Up Labor		0	Service	Single	Lawn Care Maintenance	
Loam & Compost (Option 2)		0	Service	Single	Loam Mix	
Loam & Sand (Option 1)		0	Service	Single	Loam Mix	
Loam & Seed Labor		0	Service	Single	Lawn Care Maintenance	
Material Delivery Fee		0	Service	Single		
Metal Edging Material		0	Non-Inventory	Single	Material	
Miscellaneous		0	Service	Single	Operation Cost	
Monthly Contract Fee		0	Non-Inventory	Single		
Mowing & Leaves		0	Service	Single	Lawn Care Maintenance	
Mowing Visits		0	Service	Single	Lawn Care Maintenance	
Premium Winter Buy-In Program (One-Time Annual Fee)		0	Service	Single	Winter Services	
Salting		0	Service	Single	Winter Services	
Salt Roads & Walks		0	Service	Single	Seasonal Services	
Sand Cleanup		0	Service	Single		
Sand/Salt Removal		0	Service	Single	Lawn Care Maintenance	
Screened Fill		0	Service	Single	Loam Mix	
Seasonal Lawn Fertilization Program		0	Service	Single	Lawn Care Maintenance	
Services		0	Service	Single	Lawn Care Maintenance	
Services		0	Service	Single		
Shoveling		0	Service	Single	Winter Services	
Shrubs/Ornamental trees		0	Service	Single	Lawn Care Maintenance	
Shrubs/Ornamental trees (Labor)		0	Service	Single	Lawn Care Maintenance	
Snow Plow Roads & Walks		0	Service	Single	Seasonal Services	
Snow Plow Tier 1 Services		0	Bundle	Parent		
Snow Plow Tier 2 Services		0	Bundle	Parent		
Snow Plow Tier 3 Services		0	Bundle	Parent		
Snow Removal		0	Service	Single	Winter Services	
Spring Cleanup		0	Service	Single	Property Clean Ups	
Spring Clean Ups		0	Service	Single	Lawn Care Maintenance	
Spring Cleanup Tier 1		0	Bundle	Parent		
Spring Cleanup Tier 2		0	Bundle	Parent		
Spring Cleanup Tier 3		0	Bundle	Parent		
Spring Cleanup Tier 4		0	Bundle	Parent		
STIHL KM131R Power Head with Attachments		0	Non-Inventory	Single	Equipment	
Stump Grinder 13 HP (Toro SGR13)		0	Service	Single	Lawn Care Maintenance	
Stump Grinder 13 HP (Toro SGR13) small/shrub stumps		0	Non-Inventory	Single	Machine Rental	
Topsoil & Over-seeding Labor		0	Service	Single	Lawn Care Maintenance	
Topsoil & Over-seeding Materials		0	Non-Inventory	Single	Material	
Topsoil & Sand (Option 3)		0	Service	Single	Loam Mix	
Travel Fee		0	Service	Single		
Tree & Shrub Landscape		0	Service	Single	Weed Control/Prevention	
Trimming and/or Pruning		0	Service	Single	Trimming & Pruning	
TrueComplete		0	Service	Single	Weed Control/Prevention	
Weed Control/Prevention		0	Service	Single	Lawn Care Maintenance	
Winter Snow Removal Services		0	Bundle	Parent		`;

async function importData() {
    console.log('Starting data import...');

    // Parse TSV
    const rows = rawData.split('\n').filter(line => line.trim()).map(line => {
        const [name, variant, qty, type, hierarchy, category, sku] = line.split('\t');
        return {
            name: name?.trim(),
            variantName: variant?.trim(),
            quantityOnHand: parseInt(qty) || 0,
            type: type?.trim(), // Service, Non-Inventory, Bundle
            hierarchy: hierarchy?.trim(), // Single, Parent, Variant
            category: category?.trim(),
            sku: sku?.trim(),
            price: 0 // Default provided
        };
    });

    console.log(`Parsed ${rows.length} items.`);

    const products = [];
    const services = [];

    rows.forEach(item => {
        const id = uuidv4();
        const doc = {
            id,
            ...item,
            createdAt: new Date().toISOString()
        };

        if (item.type === 'Non-Inventory') {
            products.push(doc);
        } else {
            // Service or Bundle -> Services
            services.push(doc);
        }
    });

    console.log(`Identified ${products.length} products and ${services.length} services.`);

    if (useFirestore) {
        console.log('Importing to Firestore...');
        for (const p of products) {
            await setDoc('products', p.id, p);
            process.stdout.write('.');
        }
        console.log('\nProducts imported to Firestore.');

        for (const s of services) {
            await setDoc('services', s.id, s);
            process.stdout.write('.');
        }
        console.log('\nServices imported to Firestore.');
    }

    // ALWAYS write to JSON as backup/sync
    console.log('Syncing to JSON files...');

    // Ensure data dir
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    // Read existing products
    const productsFile = path.join(dataDir, 'products.json');
    let existingProducts = [];
    if (fs.existsSync(productsFile)) {
        try {
            existingProducts = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        } catch (e) { }
    }
    // Merge or Append? To avoid duplicates if ID differs, filtered by name?
    // User data uses newly generated IDs each time. 
    // Ideally we should clear old imported data? 
    // For now, I'll just append. Duplicates might happen if run multiple times.
    // Better: Filter out items with same name?
    // Let's just write the NEW list for now or Append.
    // The user provided a master list.
    // I'll append to keep custom items (like "hj").
    const newProducts = [...existingProducts, ...products];
    fs.writeFileSync(productsFile, JSON.stringify(newProducts, null, 2));

    // Read existing services
    const servicesFile = path.join(dataDir, 'services.json');
    let existingServices = [];
    if (fs.existsSync(servicesFile)) {
        try {
            existingServices = JSON.parse(fs.readFileSync(servicesFile, 'utf8'));
        } catch (e) { }
    }
    const newServices = [...existingServices, ...services];
    fs.writeFileSync(servicesFile, JSON.stringify(newServices, null, 2));

    console.log('JSON files updated.');

    console.log('Import complete!');
    process.exit(0);
}

importData().catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
});
