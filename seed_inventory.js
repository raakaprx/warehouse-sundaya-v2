const { Material, Inventory, Site, sequelize } = require('./server/src/models');

const materialsData = [
  { sku: '7545', name: 'Talis 5', category: 'Solar Unit', specs: 'Talis 5 series component' },
  { sku: '7759', name: 'Positive Cable pole Ralis T5 3.8m', category: 'Cabling', specs: '3.8 meter positive cable' },
  { sku: '7760', name: 'Negative Cable pole Ralis T5 3.4m', category: 'Cabling', specs: '3.4 meter negative cable' },
  { sku: '7750', name: 'Conector For Flexsible Conduit "1"', category: 'Hardware', specs: '1 inch connector' },
  { sku: '7726', name: 'PVC Coated Flexsible Metal Conduit PTN-21 PVC "1"', category: 'Hardware', specs: '1 inch flexible conduit' },
  { sku: '7703', name: 'RJ45 port', category: 'Communication', specs: 'Standard RJ45 port' },
  { sku: '4313', name: 'M6*5 Stainless Nut', category: 'Hardware', specs: 'M6 size stainless steel nut' },
  { sku: '6976', name: 'M6x30mm socket hex wide-flat head screw', category: 'Hardware', specs: 'Hex socket screw' },
  { sku: '7701', name: 'Lan Cable 25cm M-M', category: 'Communication', specs: '25cm male to male LAN cable' },
  { sku: '7590', name: 'Jumper Positive cable Ralis T5', category: 'Cabling', specs: 'Positive jumper cable' },
  { sku: '7591', name: 'Jumper Negative cable Ralis T5', category: 'Cabling', specs: 'Negative jumper cable' },
  { sku: '7771', name: 'RJ45 Extension CAT8 cable 3m Male Female', category: 'Communication', specs: '3m CAT8 extension cable' },
  { sku: '7773', name: 'Ehub to Ralis communication port', category: 'Communication', specs: 'Communication port module' },
  { sku: '2022', name: 'M4x16', category: 'Hardware', specs: 'M4 size 16mm length screw' },
  { sku: '7707', name: 'Ralis 6 slot', category: 'Solar Unit', specs: '6 slot module holder' }
];

async function seed() {
  try {
    const sites = await Site.findAll();
    if (sites.length === 0) {
      console.log('No sites found. Please ensure sites are seeded first.');
      return;
    }

    for (const site of sites) {
      console.log(`Seeding inventory for site: ${site.name}`);
      
      for (const m of materialsData) {
        // Find or create material
        const [material] = await Material.findOrCreate({
          where: { sku: m.sku },
          defaults: {
            ...m,
            itemCode: `SAP-${m.sku}`,
            image: '' // Empty image as requested
          }
        });

        // Generate random stock and thresholds based on site
        let stock, threshold;
        if (site.name === 'Pusat') {
          stock = Math.floor(Math.random() * 500) + 100; // Higher stock for Pusat
          threshold = Math.floor(Math.random() * 50) + 20;
        } else if (site.name === 'Papua') {
          stock = Math.floor(Math.random() * 100) + 10; // Lower stock for remote
          threshold = Math.floor(Math.random() * 20) + 5;
        } else {
          stock = Math.floor(Math.random() * 200) + 50; // Medium stock for others
          threshold = Math.floor(Math.random() * 30) + 10;
        }

        // Update or create inventory
        await Inventory.findOrCreate({
          where: { materialId: material.id, siteId: site.id },
          defaults: {
            stock: stock,
            minThreshold: threshold
          }
        });
      }
    }

    console.log('✅ Inventory seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
